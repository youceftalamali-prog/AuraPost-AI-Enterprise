import { Server, Code, Cpu, Database, HardDrive } from 'lucide-react';
import { DeveloperEnvironment } from '../../types/developer.types';

interface Props {
  environment: DeveloperEnvironment;
}

export const DeveloperOverviewCard = ({ environment }: Props) => {
  const items = [
    { label: 'Environment', value: environment.environment, icon: Server },
    { label: 'Version', value: `${environment.version} (${environment.buildNumber})`, icon: Code },
    { label: 'Node.js', value: environment.nodeVersion, icon: Cpu },
    { label: 'Database', value: environment.dbEngine, icon: Database },
    { label: 'Cache', value: environment.cacheEngine, icon: HardDrive },
    { label: 'Workspace ID', value: environment.workspaceId, icon: Server },
  ];

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-6 text-base font-semibold text-foreground">Environment Overview</h3>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <item.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
              <p className="text-sm font-mono font-medium text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};