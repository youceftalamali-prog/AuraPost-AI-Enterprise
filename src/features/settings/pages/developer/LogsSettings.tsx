import { useState, useEffect } from 'react';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { LogsOverviewCard } from '../../components/developer/logs/LogsOverviewCard';
import { LogsStream } from '../../components/developer/logs/LogsStream';
import { LogsSkeleton } from '../../components/developer/logs/LogsSkeleton';
import { MOCK_LOGS } from '../../components/developer/logs/logs.helpers';
import { LogEntry, LogLevel } from '../../components/developer/logs/logs.types';
import { Download, Trash2, Play, Pause } from 'lucide-react';

export const LogsSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: ['info', 'debug', 'success'][Math.floor(Math.random() * 3)] as LogLevel,
        service: 'api-gateway',
        message: 'Handled incoming request successfully.',
      };
      setLogs(prev => [newLog, ...prev].slice(0, 100));
    }, 2000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleClear = async () => {
    try { await settingsApi.patch(SettingsModule.DEVELOPER, 'current', { action: 'clear_logs' }); } catch(e){}
    setLogs([]);
  };

  const handleExport = async () => {
    try { await settingsApi.patch(SettingsModule.DEVELOPER, 'current', { action: 'export_logs' }); } catch(e){}
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'logs.json'; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <LogsSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Logs</h2>
          <p className="mt-1 text-sm text-muted-foreground">Monitor application logs, errors, and system events in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsStreaming(!isStreaming)} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
            {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isStreaming ? 'Pause' : 'Stream'}
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={handleClear} className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      <LogsOverviewCard logs={logs} />
      <LogsStream logs={logs} search={search} setSearch={setSearch} levelFilter={levelFilter} setLevelFilter={setLevelFilter} />
    </div>
  );
};