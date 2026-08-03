import { useModuleData } from '../../hooks/useModuleData';
import { SettingsModule } from '../../types/settings.types';
import { QueueOverviewCard } from '../../components/developer/queue/QueueOverviewCard';
import { QueueStatsCard } from '../../components/developer/queue/QueueStatsCard';
import { QueueJobsTable } from '../../components/developer/queue/QueueJobsTable';
import { QueueSkeleton } from '../../components/developer/queue/QueueSkeleton';
import { MOCK_JOBS, MOCK_STATS } from '../../components/developer/queue/queue.helpers';
import { QueueJob, JobStatus } from '../../components/developer/queue/queue.types';
import { useState } from 'react';

export const QueueSettings = () => {
  const { data, isLoading, executeAction, refetch } = useModuleData<{ jobs: QueueJob[]; stats: typeof MOCK_STATS }>(SettingsModule.QUEUE);
  
  // Fallback to mock if API returns empty during transition
  const jobs = data?.jobs || MOCK_JOBS;
  const stats = data?.stats || MOCK_STATS;

  const handleRetry = async (id: string) => {
    await executeAction({ action: 'retry_job', id });
    refetch();
  };

  const handleCancel = async (id: string) => {
    await executeAction({ action: 'cancel_job', id });
    refetch();
  };

  if (isLoading) return <QueueSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Queue & Workers</h2>
        <p className="mt-1 text-sm text-muted-foreground">Monitor background jobs, worker distribution, and queue health.</p>
      </div>

      <QueueOverviewCard stats={stats} />
      <QueueStatsCard stats={stats} />
      <QueueJobsTable jobs={jobs} onRetry={handleRetry} onCancel={handleCancel} />
    </div>
  );
};