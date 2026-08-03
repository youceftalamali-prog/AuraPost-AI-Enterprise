import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { useState } from 'react';

interface Props {
  error: string;
  onRetry?: () => void;
  onRefresh?: () => void;
}

export const ErrorState = ({ error, onRetry, onRefresh }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-foreground">Failed to load data</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{error}</p>
      <div className="mt-6 flex items-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        )}
        {onRefresh && (
          <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Refresh Page
          </button>
        )}
        <button onClick={handleCopy} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy Error'}
        </button>
      </div>
    </div>
  );
};