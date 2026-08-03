import { MemoryStick, Server, HardDrive, Globe, Zap } from 'lucide-react';
import { cn } from '../../utils/settings.helpers';

interface Props {
  data: {
    memoryUsage: string;
    redisStatus: 'healthy' | 'warning' | 'offline';
    localCache: 'healthy' | 'warning' | 'offline';
    cdnCache: 'healthy' | 'warning' | 'offline';
    responseTime: string;
  };
}

export const CacheOverview = ({ data }: Props) => {
  const getStatusStyle = (status: string) => {
    if (status === 'healthy') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (status === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Cache Overview</h3>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center gap-3">
          <MemoryStick className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">Memory Usage</p>
            <p className="text-sm font-semibold text-foreground">{data.memoryUsage}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-xs text-muted-foreground">Redis Status</p>
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize', getStatusStyle(data.redisStatus))}>
              {data.redisStatus}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-purple-500" />
          <div>
            <p className="text-xs text-muted-foreground">Local Cache</p>
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize', getStatusStyle(data.localCache))}>
              {data.localCache}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-xs text-muted-foreground">CDN Cache</p>
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize', getStatusStyle(data.cdnCache))}>
              {data.cdnCache}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-xs text-muted-foreground">Response Time</p>
            <p className="text-sm font-semibold text-foreground">{data.responseTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
};