import React, { useCallback, useState } from 'react';
import { SectionHead, StatusChip, Progress, Icon, Empty, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { usePolling } from '../../../hooks/usePolling';
import { videoApi } from '../../../services/videoApi';
import { JOB_POLL_INTERVAL_MS, ACTIVE_JOB_STATUSES, STATUS_COLORS } from '../../../lib/constants';
import { formatMoney, formatRelativeTime } from '../../../lib/formatters';
import type { VideoJob } from '../../../types/api';

export const QueueManager: React.FC = () => {
  const { notify } = useStudio();
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const res = await videoApi.listJobs({ limit: 50, status: statusFilter });
      setJobs(res.items);
    } catch {
      // keep last snapshot
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  usePolling(load, JOB_POLL_INTERVAL_MS, live);

  const counts = {
    active: jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status)).length,
    completed: jobs.filter((j) => j.status === 'Completed').length,
    failed: jobs.filter((j) => j.status === 'Failed').length,
  };

  const cancel = async (id: string) => {
    try {
      await videoApi.cancelJob(id);
      notify('Job cancelled');
      void load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Cancel failed', true);
    }
  };

  const retry = async (id: string) => {
    try {
      await videoApi.retryJob(id);
      notify('Job re-queued');
      void load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Retry failed', true);
    }
  };

  return (
    <div>
      <SectionHead
        kicker="RENDER FARM · 05"
        title="Queue Manager"
        desc="Live view of every render job — progress, failures and logs, refreshed every 3 seconds."
        action={
          <div className="flex items-center gap-3">
            <button
              className={`chip ${live ? 'chip-mint' : ''}`}
              style={{ padding: '6px 13px', cursor: 'pointer' }}
              onClick={() => setLive(!live)}
            >
              <span className={`dot ${live ? 'dot-live' : 'dot-idle'}`} /> {live ? 'LIVE · 3s' : 'PAUSED'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => void load()}>
              <Icon name="refresh" size={13} /> Refresh
            </button>
          </div>
        }
      />

      {/* Count strip */}
      <div className="panel px-6 py-4 mb-6 flex gap-8 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="dot dot-live" />
          <span className="t-mono text-[13px]">{counts.active}</span>
          <span className="kicker">IN FLIGHT</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="dot" style={{ background: 'var(--mint)' }} />
          <span className="t-mono text-[13px]">{counts.completed}</span>
          <span className="kicker">COMPLETED</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="dot dot-err" />
          <span className="t-mono text-[13px]">{counts.failed}</span>
          <span className="kicker">FAILED</span>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button
            className={`chip ${!statusFilter ? 'chip-on' : ''}`}
            style={{ padding: '4px 10px', cursor: 'pointer' }}
            onClick={() => setStatusFilter(undefined)}
          >
            ALL
          </button>
          {['Queued', 'Processing', 'Completed', 'Failed'].map((s) => (
            <button
              key={s}
              className={`chip ${statusFilter === s ? 'chip-on' : ''}`}
              style={{ padding: '4px 10px', cursor: 'pointer' }}
              onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[76px]" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Empty icon="queue" title="Queue is empty" hint="Submitted renders land here with live progress." />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const isOpen = expanded === job.id;
            const isActive = ACTIVE_JOB_STATUSES.includes(job.status);
            return (
              <div key={job.id} className="panel overflow-hidden">
                <button className="w-full p-4 flex items-center gap-4 text-left" onClick={() => setExpanded(isOpen ? null : job.id)}>
                  <span
                    className={`dot ${isActive ? 'dot-live' : job.status === 'Failed' ? 'dot-err' : job.status === 'Completed' ? '' : 'dot-idle'}`}
                    style={!isActive && job.status === 'Completed' ? { background: 'var(--mint)' } : undefined}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="t-mono text-[12.5px] font-medium">{(job.model || 'video').split('/').pop()}</span>
                      <span className="chip">{job.provider}</span>
                      <span className="chip" style={{ opacity: 0.75 }}>
                        {job.resolution ?? '1080'}p · {job.aspectRatio ?? '9:16'}
                      </span>
                    </div>
                    <div className="mt-2 max-w-md">
                      <Progress value={job.progress || 0} active={isActive} />
                    </div>
                  </div>
                  <div className="text-right flex-none hidden sm:block">
                    <div className="t-mono text-[12px]" style={{ color: 'var(--cyan)' }}>
                      {job.progress ?? 0}%
                    </div>
                    <div className="t-mono text-[10px] mt-0.5" style={{ color: 'var(--faint)' }}>
                      {formatRelativeTime(job.createdAt)}
                    </div>
                  </div>
                  <div className="flex-none w-[110px] hidden md:block">
                    <StatusChip status={job.status} />
                  </div>
                  <div className="flex gap-1.5 flex-none" onClick={(e) => e.stopPropagation()}>
                    {isActive && (
                      <button className="btn btn-ghost btn-icon" title="Cancel" onClick={() => void cancel(job.id)}>
                        <Icon name="x" size={13} />
                      </button>
                    )}
                    {job.status === 'Failed' && (
                      <button className="btn btn-ghost btn-icon" title="Retry" onClick={() => void retry(job.id)}>
                        <Icon name="refresh" size={13} />
                      </button>
                    )}
                    <span
                      style={{ color: 'var(--faint)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <Icon name="chevron" size={14} />
                    </span>
                  </div>
                </button>

                {/* Expanded log */}
                {isOpen && (
                  <div className="border-t p-4 space-y-3" style={{ borderColor: 'var(--line)', background: 'var(--ink-1)' }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="kicker mb-1">EST. COST</div>
                        <div className="t-mono text-[13px]" style={{ color: 'var(--amber)' }}>
                          {job.estimatedCost ? formatMoney(parseFloat(job.estimatedCost)) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="kicker mb-1">ACTUAL COST</div>
                        <div className="t-mono text-[13px]" style={{ color: 'var(--mint)' }}>
                          {job.actualCost ? formatMoney(parseFloat(job.actualCost)) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="kicker mb-1">RETRIES</div>
                        <div className="t-mono text-[13px]">{job.retryCount}</div>
                      </div>
                      <div>
                        <div className="kicker mb-1">CACHE</div>
                        <div className="t-mono text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                          {job.cacheHash ? `${job.cacheHash.slice(0, 14)}…` : 'no hash'}
                        </div>
                      </div>
                    </div>

                    {job.prompt && (
                      <div>
                        <div className="kicker mb-1.5">PROMPT</div>
                        <div
                          className="t-mono text-[11px] leading-relaxed p-3 rounded-lg border max-h-[130px] overflow-y-auto"
                          style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                        >
                          {job.prompt}
                        </div>
                      </div>
                    )}

                    {job.errorMessage && (
                      <div>
                        <div className="kicker mb-1.5" style={{ color: 'var(--coral)' }}>
                          ERROR LOG
                        </div>
                        <div
                          className="t-mono text-[11px] p-3 rounded-lg border"
                          style={{ borderColor: 'rgba(255,107,74,0.35)', background: 'var(--coral-soft)', color: '#ff9d86' }}
                        >
                          {job.errorMessage}
                        </div>
                      </div>
                    )}

                    {job.resultUrl && (
                      <a className="btn btn-mint btn-sm" href={job.resultUrl} target="_blank" rel="noreferrer">
                        <Icon name="play" size={12} /> Open result
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};