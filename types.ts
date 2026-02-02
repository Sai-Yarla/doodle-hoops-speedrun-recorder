export interface AttemptRecord {
  id: string;
  timestamp: number;
  score: number | null;
  status: 'saved' | 'discarded' | 'error';
  videoBlob?: Blob;
  videoUrl?: string;
  thumbnail?: string;
}

export enum RecorderState {
  IDLE = 'IDLE',
  MONITORING = 'MONITORING', // Stream active, waiting for game start
  RECORDING = 'RECORDING',   // Currently recording a run
  ANALYZING = 'ANALYZING',   // Game over detected, checking score
}

export interface AnalysisResult {
  isGameOver: boolean;
  score: number;
  confidence: number;
}
