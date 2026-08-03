import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { performanceMonitor } from '../../utils/performanceMonitor';

export const DiagnosticsCard = () => {
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  const [avgLatency, setAvgLatency] = useState(performanceMonitor.getAverageApiLatency());
  const [avgSave, setAvgSave] = useState(performanceMonitor.getAverageSaveDuration());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
      setAvgLatency(performanceMonitor.getAverageApiLatency());
      setAvgSave(performanceMonitor.getAverageSaveDuration());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Production Diagnostics</h3>
          <p className="text-xs text-muted-foreground">Real-time performance and health metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Avg API Latency</p>
          <p className="text-lg font-bold text-foreground">{avgLatency.toFixed(0)} ms</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Avg Save Duration</p>
          <p className="text-lg font-bold text-foreground">{avgSave.toFixed(0)} ms</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Active Requests</p>
          <p className="text-lg font-bold text-foreground">{metrics.activeRequests}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Retries</p>
          <p className="text-lg font-bold text-foreground">{metrics.retryCounts.length}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Cache Hit Rate</p>
          <p className="text-lg font-bold text-foreground">
            {metrics.cacheHits + metrics.cacheMisses > 0 
              ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1) 
              : 0}%
          </p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Duplicates Blocked</p>
          <p className="text-lg font-bold text-foreground">{metrics.duplicateRequests}</p>
        </div>
      </div>
    </div>
  );
};