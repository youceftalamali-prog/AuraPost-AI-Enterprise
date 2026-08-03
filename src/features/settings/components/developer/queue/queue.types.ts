export type JobStatus = 'running' | 'pending' | 'failed' | 'completed' | 'dead_letter';

export interface QueueJob {
  id: string;
  name: string;
  status: JobStatus;
  progress: number;
  attempts: number;
  created: string;
  updated: string;
  error?: string;
}

export interface QueueStats {
  running: number;
  pending: number;
  failed: number;
  deadLetter: number;
  workers: number;
  throughput: number; // jobs per minute
}