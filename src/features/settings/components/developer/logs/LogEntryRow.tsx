import React, { useState } from 'react';
import { LogEntry } from './logs.types';
import { cn } from '../../../utils/settings.helpers';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Props { log: LogEntry; }

export const LogEntryRow = React.memo(({ log }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const levelColors = {
    error: 'text-red-500 bg-red-500/10', warning: 'text-amber-500 bg-amber-500/10',
    info: 'text-blue-500 bg-blue-500/10', debug: 'text-gray-500 bg-gray-500/10',
    success: 'text-emerald-500 bg-emerald-500/10',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <tr className="hover:bg-muted/50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</td>
        <td className="px-4 py-2"><span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', levelColors[log.level])}>{log.level}</span></td>
        <td className="px-4 py-2 text-foreground">{log.service}</td>
        <td className="px-4 py-2 text-foreground truncate max-w-md">{log.message}</td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="text-muted-foreground hover:text-foreground">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="p-4">
            {log.stack && (
              <div className="mb-3 rounded border border-red-500/20 bg-red-500/5 p-3 text-red-600 dark:text-red-400 overflow-x-auto">
                <pre className="whitespace-pre-wrap text-xs">{log.stack}</pre>
              </div>
            )}
            {log.metadata && (
              <div className="rounded border border-border bg-background p-3 overflow-x-auto">
                <pre className="text-foreground text-xs">{JSON.stringify(log.metadata, null, 2)}</pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
});