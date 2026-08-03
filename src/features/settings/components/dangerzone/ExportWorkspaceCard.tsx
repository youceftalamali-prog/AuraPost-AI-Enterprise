import { useState } from 'react';
import { Download } from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { SettingsModule } from '../../types/settings.types';
import { ExportOptions } from '../../types/dangerzone.types';
import { simulateExport } from '../../utils/dangerzone.helpers';

export const ExportWorkspaceCard = () => {
  const [options, setOptions] = useState<ExportOptions>({
    configuration: true,
    assets: true,
    users: true,
    billing: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      await settingsApi.patch(SettingsModule.DANGER_ZONE, 'current', {
        action: 'export_workspace',
        options,
      });
      
      // Simulate export
      const exportData = simulateExport(options);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setTimeout(() => setIsLoading(false), 1000);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const exportOptions = [
    { key: 'configuration', label: 'Configuration', desc: 'Workspace settings and preferences' },
    { key: 'assets', label: 'Assets', desc: 'Images, videos, and media files' },
    { key: 'users', label: 'Users', desc: 'User accounts and permissions' },
    { key: 'billing', label: 'Billing', desc: 'Subscription and payment history' },
  ];

  return (
    <div className="rounded-lg border-2 border-blue-500/30 bg-background p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">Export Workspace</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Download a complete backup of your workspace data.
          </p>
          
          <div className="mt-4 space-y-3">
            {exportOptions.map(opt => (
              <div key={opt.key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={opt.key}
                  checked={options[opt.key as keyof ExportOptions]}
                  onChange={(e) => setOptions({ ...options, [opt.key]: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <label htmlFor={opt.key} className="flex-1">
                  <div className="text-sm font-medium text-foreground">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </label>
              </div>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={isLoading}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Exporting...' : 'Export workspace data'}
          </button>
        </div>
      </div>
    </div>
  );
};