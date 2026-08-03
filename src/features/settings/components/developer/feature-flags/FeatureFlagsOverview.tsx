import { Flag, CheckCircle2, XCircle, FlaskConical, Sparkles, Lock } from 'lucide-react';
import { FeatureFlag } from '../../../types/featureFlags.types';

interface Props {
  flags: FeatureFlag[];
}

export const FeatureFlagsOverview = ({ flags }: Props) => {
  const stats = [
    { label: 'Total Flags', value: flags.length, icon: Flag, color: 'text-blue-500' },
    { label: 'Enabled', value: flags.filter(f => f.status === 'enabled').length, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Disabled', value: flags.filter(f => f.status === 'disabled').length, icon: XCircle, color: 'text-gray-500' },
    { label: 'Experimental', value: flags.filter(f => f.category === 'experimental').length, icon: FlaskConical, color: 'text-purple-500' },
    { label: 'Beta', value: flags.filter(f => f.category === 'beta').length, icon: Sparkles, color: 'text-amber-500' },
    { label: 'Internal', value: flags.filter(f => f.category === 'internal').length, icon: Lock, color: 'text-indigo-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};