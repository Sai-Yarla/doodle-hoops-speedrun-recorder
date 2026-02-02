import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RecorderState, AttemptRecord } from '../types';
import { analyzeGameFrame } from '../services/geminiService';

const TARGET_SCORE = 39;
const CHECK_INTERVAL_MS = 2000; // Check every 2 seconds

interface RecorderProps {
  onLogEntry: (entry: AttemptRecord) => void;
}

const Recorder: React.FC<RecorderProps> = ({ onLogEntry }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
  const [lastAnalysis, setLastAnalysis] = useState<{ isGameOver: boolean; score: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);
  
  // Start Screen Capture
  const startCapture = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser", // Prefer browser tab
        },
        audio: true, // Capture game audio
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Handle stream stop (user clicks "Stop sharing" in browser UI)
      mediaStream.getVideoTracks()[0].onended = () => {
        stopSession();
      };

      setRecorderState(RecorderState.MONITORING);
      startRecordingLoop(mediaStream);

    } catch (err) {
      console.error("Error starting capture:", err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
         setError("Permission denied. You must allow screen sharing to use this app.");
      } else if (err instanceof Error) {
         setError(err.message);
      } else {
         setError("Failed to initialize screen capture.");
      }
    }
  };

  const stopSession = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setRecorderState(RecorderState.IDLE);
    setLastAnalysis(null);
  };

  // The Recording Loop logic
  const startRecordingLoop = (currentStream: MediaStream) => {
    // We immediately start recording chunks.
    // This simple strategy records EVERYTHING.
    // When we detect Game Over, we cut the tape.
    
    // NOTE: For a perfect loop, we'd want to discard the buffer if it was just menu waiting.
    // But detecting "Start of Game" is harder than "End of Game".
    // So we record continuously, and when "End" is found, we assume the buffer contains the run.
    
    startMediaRecorder(currentStream);

    // Start Analysis Interval
    intervalRef.current = window.setInterval(async () => {
      if (document.hidden) return; // Save resources if tab backgrounded
      await performAnalysis();
    }, CHECK_INTERVAL_MS);
  };

  const startMediaRecorder = (currentStream: MediaStream) => {
    if (mediaRecorderRef.current?.state === 'recording') return;

    const recorder = new MediaRecorder(currentStream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.start(1000); // 1s chunks
    mediaRecorderRef.current = recorder;
    chunksRef.current = []; // Reset chunks
    setRecorderState(RecorderState.RECORDING);
  };

  const stopMediaRecorder = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = [];
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  };

  // Capture frame and send to Gemini
  const performAnalysis = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    // Draw frame to canvas
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Use a smaller resolution for AI analysis to save bandwidth/speed
    canvasRef.current.width = 640;
    canvasRef.current.height = 360;
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    const base64Image = canvasRef.current.toDataURL('image/png');
    
    // Optimistic UI update or debug log could go here
    // console.log("Analyzing frame...");

    const result = await analyzeGameFrame(base64Image);
    setLastAnalysis({ isGameOver: result.isGameOver, score: result.score });

    if (result.isGameOver) {
       handleGameOver(result.score, base64Image);
    }
  }, [isProcessing]);

  const handleGameOver = async (score: number, thumbnail: string) => {
    // 1. Pause analysis
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    setIsProcessing(true);
    setRecorderState(RecorderState.ANALYZING);

    // 2. Stop Recording
    const videoBlob = await stopMediaRecorder();

    // 3. Logic: Save or Discard
    const isSuccess = score >= TARGET_SCORE;

    const record: AttemptRecord = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      score: score,
      status: isSuccess ? 'saved' : 'discarded',
      videoBlob: isSuccess ? videoBlob : undefined,
      thumbnail: thumbnail,
    };

    onLogEntry(record);

    // 4. Resume Loop
    // We wait a bit before restarting to avoid analyzing the same "Game Over" screen twice
    // if the user is slow to click replay.
    setTimeout(() => {
      if (stream && stream.active) {
        startMediaRecorder(stream);
        // Restart analysis loop
        intervalRef.current = window.setInterval(performAnalysis, CHECK_INTERVAL_MS);
        setRecorderState(RecorderState.MONITORING); // Or RECORDING
        setIsProcessing(false);
      }
    }, 5000); // 5s cooldown to let user click "Play Again"
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Header / Controls */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${stream ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
          <h1 className="font-bold text-lg tracking-tight">Stream Monitor</h1>
        </div>
        
        <div>
           {!stream ? (
             <button
               onClick={startCapture}
               className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
               </svg>
               Select Game Tab
             </button>
           ) : (
             <button
               onClick={stopSession}
               className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-red-500/20"
             >
               Stop Monitor
             </button>
           )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          className={`max-w-full max-h-full object-contain ${!stream ? 'hidden' : ''}`}
        />
        
        {/* Placeholder State */}
        {!stream && (
          <div className="text-center text-gray-500 p-10">
            {error ? (
              <div className="bg-red-900/20 border border-red-900 text-red-300 p-4 rounded-lg max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-2 font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Capture Error
                </div>
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-xl font-medium">Ready to Record</p>
                <p className="text-sm mt-2 max-w-md mx-auto">
                  Click "Select Game Tab" to choose the window where you are playing. 
                  The AI will automatically watch for the score.
                </p>
              </>
            )}
          </div>
        )}

        {/* Live Analysis Overlay */}
        {stream && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs text-gray-300 pointer-events-none transition-opacity duration-300">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${recorderState === RecorderState.ANALYZING ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
              <span className="uppercase font-bold tracking-wider">{recorderState}</span>
            </div>
            {lastAnalysis && (
              <div className="space-y-0.5">
                <p>AI Perception:</p>
                <div className="grid grid-cols-2 gap-x-4">
                  <span className="text-gray-500">Game Over:</span>
                  <span className={lastAnalysis.isGameOver ? "text-red-400 font-bold" : "text-gray-400"}>
                    {lastAnalysis.isGameOver ? 'YES' : 'NO'}
                  </span>
                  <span className="text-gray-500">Last Score:</span>
                  <span className="text-white font-mono">{lastAnalysis.score}</span>
                </div>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-500">
               Target Score: &ge; {TARGET_SCORE}
            </div>
          </div>
        )}
      </div>

      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Recorder;