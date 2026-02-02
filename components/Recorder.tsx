import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RecorderState, AttemptRecord, DetectionMode } from '../types';
import { analyzeGameFrame } from '../services/geminiService';
import { analyzeGameFrameLocally } from '../services/localDetectionService';
import TargetVisual from './TargetVisual';

const TARGET_SCORE = 45;
const BASE_INTERVAL_MS = 4000; // 4s interval for Gemini
const LOCAL_INTERVAL_MS = 1000; // 1s interval for Local (it's fast)
const ERROR_BACKOFF_MS = 10000;

interface RecorderProps {
  onLogEntry: (entry: AttemptRecord) => void;
}

const Recorder: React.FC<RecorderProps> = ({ onLogEntry }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
  const [lastAnalysis, setLastAnalysis] = useState<{ isGameOver: boolean; score: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [mode, setMode] = useState<DetectionMode>('GEMINI');

  // Refs
  const stateRef = useRef<RecorderState>(RecorderState.IDLE);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const updateState = (newState: RecorderState) => {
    setRecorderState(newState);
    stateRef.current = newState;
  };

  const startCapture = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
      });

      setStream(mediaStream);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      mediaStream.getVideoTracks()[0].onended = () => stopSession();

      updateState(RecorderState.MONITORING);
      
      // Local mode checks faster than Gemini mode
      const interval = mode === 'LOCAL' ? LOCAL_INTERVAL_MS : 1000;
      scheduleNextAnalysis(interval);

    } catch (err) {
      console.error("Error starting capture:", err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
         setError("Permission denied. You must allow screen sharing.");
      } else {
         setError("Failed to initialize screen capture.");
      }
    }
  };

  const stopSession = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    streamRef.current = null;
    updateState(RecorderState.IDLE);
    setLastAnalysis(null);
    setIsRateLimited(false);
  };

  const scheduleNextAnalysis = (delay: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(runAnalysisLoop, delay);
  };

  const runAnalysisLoop = async () => {
    if (!streamRef.current || !streamRef.current.active) return;
    
    // Determine interval based on mode
    const interval = mode === 'LOCAL' ? LOCAL_INTERVAL_MS : BASE_INTERVAL_MS;

    if (document.hidden) {
      scheduleNextAnalysis(interval * 2); 
      return;
    }

    try {
      await performAnalysis();
      setIsRateLimited(false);
      scheduleNextAnalysis(interval);
    } catch (err: any) {
      console.warn("Analysis error:", err);
      
      const isQuotaError = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError && mode === 'GEMINI') {
        setIsRateLimited(true);
        scheduleNextAnalysis(ERROR_BACKOFF_MS);
      } else {
        scheduleNextAnalysis(interval);
      }
    }
  };

  const startMediaRecorder = () => {
    if (!streamRef.current || mediaRecorderRef.current?.state === 'recording') return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(1000); 
    mediaRecorderRef.current = recorder;
    updateState(RecorderState.RECORDING);
    console.log("Recording started");
  };

  const stopMediaRecorder = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
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

  const performAnalysis = async () => {
    if (!videoRef.current || !canvasRef.current || stateRef.current === RecorderState.ANALYZING) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Draw frame for analysis
    canvasRef.current.width = 640;
    canvasRef.current.height = 360;
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    let result;
    
    if (mode === 'GEMINI') {
      const base64Image = canvasRef.current.toDataURL('image/png');
      result = await analyzeGameFrame(base64Image);
    } else {
      // Local Mode
      result = analyzeGameFrameLocally(ctx, canvasRef.current.width, canvasRef.current.height);
    }
    
    setLastAnalysis({ isGameOver: result.isGameOver, score: result.score });

    const currentState = stateRef.current;
    const base64ForThumbnail = mode === 'GEMINI' ? undefined : canvasRef.current.toDataURL('image/png');

    if (currentState === RecorderState.MONITORING) {
      if (result.isGameOver) {
        updateState(RecorderState.WAITING_FOR_START);
      } else {
        startMediaRecorder();
      }
    } 
    else if (currentState === RecorderState.RECORDING) {
      if (result.isGameOver) {
        // Pass the base64 if we are in local mode since we haven't generated it yet
        const thumb = base64ForThumbnail || canvasRef.current.toDataURL('image/png');
        handleGameOver(result.score, thumb);
      }
    } 
    else if (currentState === RecorderState.WAITING_FOR_START) {
      if (!result.isGameOver) {
        startMediaRecorder();
      }
    }
  };

  const handleGameOver = async (score: number | null, thumbnail: string) => {
    updateState(RecorderState.ANALYZING);
    console.log("Game Over detected. Score:", score);

    const videoBlob = await stopMediaRecorder();
    
    // Logic: 
    // If Gemini: Check score >= 45.
    // If Local: Score is null, always save for manual review.
    let status: AttemptRecord['status'] = 'discarded';
    
    if (score === null) {
      status = 'manual-review';
    } else if (score >= TARGET_SCORE) {
      status = 'saved';
    }

    const record: AttemptRecord = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      score: score,
      status: status,
      videoBlob: status !== 'discarded' ? videoBlob : undefined,
      thumbnail: thumbnail,
    };

    onLogEntry(record);
    updateState(RecorderState.WAITING_FOR_START);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Header / Controls */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Status Dot */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isRateLimited ? 'bg-orange-500 animate-pulse' :
              recorderState === RecorderState.RECORDING ? 'bg-red-500 animate-pulse' : 
              recorderState === RecorderState.WAITING_FOR_START ? 'bg-yellow-500' :
              'bg-gray-500'
            }`}></div>
            <h1 className="font-bold text-lg tracking-tight">Stream Monitor</h1>
          </div>

          {/* Mode Switcher */}
          <div className="bg-gray-900 p-1 rounded-lg flex border border-gray-700">
            <button
              onClick={() => !stream && setMode('GEMINI')}
              disabled={!!stream}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                mode === 'GEMINI' 
                ? 'bg-purple-600 text-white shadow' 
                : 'text-gray-400 hover:text-white'
              } ${stream ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Gemini AI
            </button>
            <button
              onClick={() => !stream && setMode('LOCAL')}
              disabled={!!stream}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                mode === 'LOCAL' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-gray-400 hover:text-white'
              } ${stream ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Local Pixel
            </button>
          </div>
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
          <div className="text-center text-gray-500 p-10 flex flex-col items-center">
            {error ? (
              <div className="bg-red-900/20 border border-red-900 text-red-300 p-4 rounded-lg max-w-md mx-auto">
                <p className="font-bold mb-1">Capture Error</p>
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <>
                <p className="text-xl font-medium">Ready to Record</p>
                <p className="text-sm mt-2 max-w-md mx-auto text-gray-400 mb-6">
                  {mode === 'GEMINI' 
                    ? 'Using AI Vision to read scores and filter for 45+ points.'
                    : 'Using Pixel Detection to auto-save all completed runs.'}
                </p>
                <TargetVisual />
              </>
            )}
          </div>
        )}

        {/* Live Analysis Overlay */}
        {stream && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs text-gray-300 pointer-events-none transition-opacity duration-300">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${
                 isRateLimited ? 'bg-orange-500' :
                 recorderState === RecorderState.RECORDING ? 'bg-red-500 animate-pulse' : 
                 recorderState === RecorderState.WAITING_FOR_START ? 'bg-yellow-400' :
                 'bg-green-400'
              }`}></span>
              <span className="uppercase font-bold tracking-wider">
                {isRateLimited ? 'RATE LIMIT' : recorderState.replace(/_/g, ' ')}
              </span>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Mode:</span>
                <span className={mode === 'GEMINI' ? 'text-purple-400' : 'text-blue-400'}>{mode}</span>
              </div>
              {lastAnalysis && (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Game Over:</span>
                    <span className={lastAnalysis.isGameOver ? "text-red-400 font-bold" : "text-gray-400"}>
                      {lastAnalysis.isGameOver ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Score:</span>
                    <span className="text-white font-mono">
                      {lastAnalysis.score !== null ? lastAnalysis.score : 'N/A'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Recorder;