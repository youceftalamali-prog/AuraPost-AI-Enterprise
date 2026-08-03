import { QueueJob, QueueStats } from './queue.types';

export const MOCK_STATS: QueueStats = {
  running: 12,
  pending: 45,
  failed: 3,
  deadLetter: 1,
  workers: 4,
  throughput: 124,
};

export const MOCK_JOBS: QueueJob[] = [
  { id: 'job_1', name: 'Generate AI Image', status: 'running', progress: 65, attempts: 1, created: '2026-01-26T12:00:00Z', updated: '2026-01-26T12:05:00Z' },
  { id: 'job_2', name: 'Sync Shopify Products', status: 'pending', progress: 0, attempts: 0, created: '2026-01-26T12:04:00Z', updated: '2026-01-26T12:04:00Z' },
  { id: 'job_3', name: 'Export Analytics Report', status: 'failed', progress: 100, attempts: 3, created: '2026-01-26T11:00:00Z', updated: '2026-01-26T11:05:00Z', error: 'Timeout exceeded' },
  { id: 'job_4', name: 'Process Webhook', status: 'completed', progress: 100, attempts: 1, created: '2026-01-26T10:00:00Z', updated: '2026-01-26T10:01:00Z' },
  { id: 'job_5', name: 'Send Email Campaign', status: 'dead_letter', progress: 0, attempts: 5, created: '2026-01-25T09:00:00Z', updated: '2026-01-25T09:10:00Z', error: 'Invalid recipient address' },
];