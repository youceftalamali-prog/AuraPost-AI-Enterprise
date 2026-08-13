import type {
  RetentionPeriod,
  RetentionPolicies,
} from '../../types/storage.types';

interface Props {
  policies: RetentionPolicies;
  onChange: (updates: Partial<RetentionPolicies>) => void;
}

const retentionFields: Array<{
  key: keyof RetentionPolicies;
  label: string;
  description: string;
}> = [
  { key: 'images', label: 'Images', description: 'Generated and uploaded image assets.' },
  { key: 'videos', label: 'Videos', description: 'Rendered and uploaded video assets.' },
  { key: 'logs', label: 'Logs', description: 'Application and activity logs.' },
  { key: 'aiResults', label: 'AI Results', description: 'Generated analysis and content results.' },
  { key: 'exports', label: 'Exports', description: 'Downloaded campaign export packages.' },
];

const retentionOptions: Array<{ value: RetentionPeriod; label: string }> = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: 'forever', label: 'Keep forever' },
  { value: 'custom', label: 'Custom policy' },
];

export const StorageRetentionCard = ({ policies, onChange }: Props) => {
  const updatePolicy = (key: keyof RetentionPolicies, value: RetentionPeriod) => {
    onChange({ [key]: value });
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">Retention Policies</h3>
        <p className="text-xs text-muted-foreground">
          Choose how long each storage category is retained.
        </p>
      </div>

      <div className="space-y-4">
        {retentionFields.map((field) => (
          <div
            key={field.key}
            className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{field.label}</p>
              <p className="text-xs text-muted-foreground">{field.description}</p>
            </div>
            <select
              aria-label={`${field.label} retention period`}
              value={policies[field.key]}
              onChange={(event) =>
                updatePolicy(field.key, event.target.value as RetentionPeriod)
              }
              className="min-w-32 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {retentionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};
