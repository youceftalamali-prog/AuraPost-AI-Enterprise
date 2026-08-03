import { WorkspaceSettings } from '../../types/workspace.types';
import { LANGUAGES, REGIONS, TIMEZONES } from '../../data/locales';

interface Props {
  data: WorkspaceSettings;
  updateField: <K extends keyof WorkspaceSettings>(field: K, value: WorkspaceSettings[K]) => void;
}

export const WorkspaceLocaleForm = ({ data, updateField }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="text-base font-semibold text-foreground">Localization</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Set your preferred language, region, and timezone.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="ws-lang" className="block text-sm font-medium text-foreground">
            Language
          </label>
          <select
            id="ws-lang"
            value={data.language}
            onChange={(e) => updateField('language', e.target.value)}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ws-region" className="block text-sm font-medium text-foreground">
            Region
          </label>
          <select
            id="ws-region"
            value={data.region}
            onChange={(e) => updateField('region', e.target.value)}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {REGIONS.map((reg) => (
              <option key={reg.value} value={reg.value}>
                {reg.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="ws-tz" className="block text-sm font-medium text-foreground">
            Timezone
          </label>
          <select
            id="ws-tz"
            value={data.timezone}
            onChange={(e) => updateField('timezone', e.target.value)}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};