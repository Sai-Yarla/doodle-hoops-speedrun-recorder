export interface AttemptRecord {
  id: string;
  timestamp: number;
  score: number | null; // null indicates score couldn't be read (Local Mode)
  status: 'saved' | 'discarded' | 'error' | 'manual-review';
  videoBlob?: Blob;
  videoUrl?: string;
  thumbnail?: string;
}

export enum RecorderState {
  IDLE = 'IDLE',
  MONITORING = 'MONITORING', // Stream active, initial check
  RECORDING = 'RECORDING',   // Game in progress, recording
  ANALYZING = 'ANALYZING',   // Processing end of game
  WAITING_FOR_START = 'WAITING_FOR_START', // Game Over screen visible, waiting for user to click replay
}

export type DetectionMode = 'GEMINI' | 'LOCAL';

export interface AnalysisResult {
  isGameOver: boolean;
  score: number | null; // null if we can't read it (Local Mode)
  confidence: number;
}