import React, { useCallback, useState } from 'react';
import { SectionHead, Stat, StatusChip, Progress, Icon, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { usePolling } from '../../../hooks/usePolling';
import { videoApi } from '../../../services/videoApi';
import { providerApi } from '../../../services/providerApi';
import { JOB_POLL_INTERVAL_MS, ACTIVE_JOB_STATUSES } from '../../../lib/constants';
import { formatMoney, formatResponseTime, formatPercent } from '../../../lib/formatters';
import type { VideoJob, VideoHistoryRecord, ProviderHealth } from '../../../types/api';

export const Dashboard: React.FC = () => {
  const { setSection } = useStudio();
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [history, setHistory] = useState<VideoHistoryRecord[]>([]);
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [loaded, setLoaded] = useState(false);

  const r1 = useReveal<HTMLDivElement>();
  const r2 = useReveal<HTMLDivElement>();
  const r3 = useReveal<HTMLDivElement>();

  const load = useCallback(async () => {
    try {
      const [jobsRes, historyRes, healthRes] = await Promise.all([
        videoApi.listJobs({ limit: 20 }),
        videoApi.listHistory({ limit: 8 }),
        providerApi.getHealth(),
      ]);
      setJobs(jobsRes.items);
      setHistory(historyRes.items);
      setHealth(healthRes);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, []);

  usePolling(load, JOB_POLL_INTERVAL_MS, true);

  const active = jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status));
  const completed = jobs.filter((j) => j.status === 'Completed').length;
  const failed = jobs.filter((j) => j.status === 'Failed').length;
  const successRate = completed + failed > 0 ? (completed / (completed + failed)) * 100 : 100;
  const spend = history.reduce((s, h) => s + (h.estimatedCost ? parseFloat(h.estimatedCost) : 0), 0);
  const providersUp = health.filter((h) => h.status === 'Available' || h.status === 'Degraded').length;

  return (
    <div>
      <SectionHead
        kicker="CONTROL ROOM"
        title="Studio Dashboard"
        desc="Live overview of renders, spend and provider fleet."
        action={
          <button className="btn btn-ghost btn-sm" onClick={() => setSection('analyzer')}>
            <Icon name="scan" size={13} /> Analyze a product
          </button>
        }
      />

      {/* ---------- Stats band ---------- */}
      <div ref={r1} className="panel px-6 py-5 mb-6 grid grid-cols-2 md:grid-cols-5 gap-6">
        <Stat label="VIDEOS RENDERED" value={history.length} tone="var(--text)" sub="all time" />
        <Stat label="ACTIVE JOBS" value={active.length} tone={active.length > 0 ? 'var(--cyan)' : 'var(--text)'} sub={active.length > 0 ? 'rendering now' : 'queue clear'} />
        <Stat label="SUCCESS RATE" value={successRate} format={(v) => formatPercent(v)} tone="var(--mint)" sub={`${failed} failed`} />
        <Stat label="EST. SPEND" value={spend} format={(v) => formatMoney(v)} tone="var(--amber)" sub="video generation" />
        <Stat label="PROVIDERS UP" value={providersUp} tone="var(--cyan)" sub={`of ${health.length || 7} fleet`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ---------- Render deck ---------- */}
        <div ref={r2} className="xl:col-span-2 space-y-6">
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="dot dot-live" />
                <h2 className="t-display font-semibold text-[16px]">Render Deck</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSection('queue')}>
                Queue <Icon name="chevron" size={12} />
              </button>
            </div>

            {!loaded ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton h-[72px]" />
                ))}
              </div>
            ) : active.length === 0 ? (
              <div className="py-8 text-center">
                <div className="t-mono text-[12px] mb-3" style={{ color: 'var(--faint)' }}>
                  ALL LINES IDLE<span className="blink">_</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setSection('generate')}>
                  <Icon name="zap" size={13} /> Start a render
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {active.slice(0, 4).map((job) => (
                  <div key={job.id} className="p-3.5 rounded-lg border" style={{ borderColor: 'var(--line)', background: 'var(--ink-1)' }}>
                    <div className="flex items-center justify-between mb-2.5 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StatusChip status={job.status} />
                        <span className="t-mono text-[11.5px] truncate" style={{ color: 'var(--muted)' }}>
                          {(job.model || 'video').split('/').pop()} · {job.provider}
                        </span>
                      </div>
                      <span className="t-mono text-[12px] flex-none" style={{ color: 'var(--cyan)' }}>
                        {job.progress ?? 0}%
                      </span>
                    </div>
                    <Progress value={job.progress || 0} active />
                    <div className="flex items-center justify-between mt-2">
                      <span className="t-mono text-[10.5px]" style={{ color: 'var(--faint)' }}>
                        {job.resolution ?? '1080'}p · {job.aspectRatio ?? '9:16'}
                      </span>
                      <span className="t-mono text-[10.5px]" style={{ color: 'var(--faint)' }}>
                        {job.estimatedCost ? formatMoney(parseFloat(job.estimatedCost)) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------- Latest renders filmstrip ---------- */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="t-display font-semibold text-[16px]">Latest Renders</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSection('history')}>
                History <Icon name="chevron" size={12} />
              </button>
            </div>

            {!loaded ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="skeleton aspect-[9/12]" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="t-mono text-[12px] py-6 text-center" style={{ color: 'var(--faint)' }}>
                NO RENDERS YET — YOUR FILMSTRIP STARTS HERE
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {history.slice(0, 8).map((item) => (
                  <button key={item.id} className="frame aspect-[9/12] text-left group" onClick={() => setSection('history')}>
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title ?? 'render'} loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(150deg, var(--ink-3), var(--ink-1))' }}>
                        <Icon name="film" size={22} className="opacity-40" />
                      </div>
                    )}
                    <div className="veil" />
                    <div className="absolute bottom-0 inset-x-0 p-2.5">
                      <div className="text-[11.5px] font-medium truncate">{item.title ?? 'Untitled render'}</div>
                      <div className="t-mono text-[9.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                        {item.platform ?? ''} {item.estimatedCost ? `· ${formatMoney(parseFloat(item.estimatedCost))}` : ''}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--coral)' }}>
                      <Icon name="play" size={16} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------- Provider fleet ---------- */}
        <div ref={r3} className="space-y-6">
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="t-display font-semibold text-[16px]">Provider Fleet</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSection('providers')}>
                All <Icon name="chevron" size={12} />
              </button>
            </div>

            {!loaded ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-[52px]" />
                ))}
              </div>
            ) : health.length === 0 ? (
              <div className="t-mono text-[12px] py-4 text-center" style={{ color: 'var(--faint)' }}>
                FLEET NOT REPORTING YET
              </div>
            ) : (
              <div className="space-y-2.5">
                {health.slice(0, 7).map((h) => (
                  <div key={h.provider} className="flex items-center justify-between p-3 rounded-lg border transition-colors" style={{ borderColor: 'var(--line)', background: 'var(--ink-1)' }}>
                    <div className="flex items-center gap-2.5">
                      <StatusChip status={h.status} />
                      <span className="text-[13px] font-medium">{h.provider}</span>
                    </div>
                    <span className="t-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                      {formatResponseTime(h.averageResponseTime)} · {formatPercent(h.successRate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------- Quick actions ---------- */}
          <div className="panel p-5 ticks">
            <h2 className="t-display font-semibold text-[16px] mb-4">Quick Actions</h2>
            <div className="space-y-2.5">
              <button className="btn btn-ghost btn-sm w-full justify-start" onClick={() => setSection('generate')}>
                <Icon name="wand" size={14} /> New video render
              </button>
              <button className="btn btn-ghost btn-sm w-full justify-start" onClick={() => setSection('templates')}>
                <Icon name="layers" size={14} /> Browse templates
              </button>
              <button className="btn btn-ghost btn-sm w-full justify-start" onClick={() => setSection('brand')}>
                <Icon name="palette" size={14} /> Manage brand kit
              </button>
              <button className="btn btn-ghost btn-sm w-full justify-start" onClick={() => setSection('providers')}>
                <Icon name="server" size={14} /> Provider settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};