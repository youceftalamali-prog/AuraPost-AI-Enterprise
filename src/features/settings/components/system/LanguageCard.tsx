import { Languages } from 'lucide-react';
import { LANGUAGES } from '../../utils/system.helpers';

interface Props {
  language: string;
  onChange: (lang: string) => void;
}

export const LanguageCard = ({ language, onChange }: Props) => (
  <div className="rounded-lg border border-border bg-background p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
        <Languages className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Language</h3>
        <p className="text-xs text-muted-foreground">Set the primary language for the workspace.</p>
      </div>
    </div>
    <select value={language} onChange={(e) => onChange(e.target.value)} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
      {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
    </select>
  </div>
);