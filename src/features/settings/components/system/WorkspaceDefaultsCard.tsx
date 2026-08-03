import { Settings } from 'lucide-react';
import { WorkspaceDefaults } from '../../types/system.types';

interface Props {
  settings: WorkspaceDefaults;
  onChange: (updates: Partial<WorkspaceDefaults>) => void;
}

export const WorkspaceDefaultsCard = ({ settings, onChange }: Props) => (
  <div className="rounded-lg border border-border bg-background p-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
        <Settings className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Workspace Defaults</h3>
        <p className="text-xs text-muted-foreground">Default configurations for new assets and processes.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Default AI Provider</label>
        <select value={settings.aiProvider} onChange={(e) => onChange({ aiProvider: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="openai">OpenAI</option>
          <option value="gemini">Google Gemini</option>
          <option value="claude">Anthropic Claude</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Default Image Size</label>
        <select value={settings.imageSize} onChange={(e) => onChange({ imageSize: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="1024x1024">1024x1024 (Square)</option>
          <option value="1792x1024">1792x1024 (Landscape)</option>
          <option value="1024x1792">1024x1792 (Portrait)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Default Video Resolution</label>
        <select value={settings.videoResolution} onChange={(e) => onChange({ videoResolution: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="720p">720p (HD)</option>
          <option value="1080p">1080p (Full HD)</option>
          <option value="4k">4K (Ultra HD)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Default Storage Provider</label>
        <select value={settings.storageProvider} onChange={(e) => onChange({ storageProvider: e.target.value })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="local">Local Storage</option>
          <option value="aws_s3">AWS S3</option>
          <option value="cloudflare_r2">Cloudflare R2</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Notification Level</label>
        <select value={settings.notificationLevel} onChange={(e) => onChange({ notificationLevel: e.target.value as any })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="all">All Notifications</option>
          <option value="important">Important Only</option>
          <option value="none">None</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Default Export Format</label>
        <select value={settings.exportFormat} onChange={(e) => onChange({ exportFormat: e.target.value as any })} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="pdf">PDF</option>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xlsx">Excel (XLSX)</option>
        </select>
      </div>
    </div>
  </div>
);