import { useModuleData } from '../hooks/useModuleData';
import { SettingsModule } from '../types/settings.types';
import { DangerOverview } from '../types/dangerzone.types';
import { DangerOverviewCard } from '../components/dangerzone/DangerOverviewCard';
import { DeleteWorkspaceCard } from '../components/dangerzone/DeleteWorkspaceCard';
import { TransferOwnershipCard } from '../components/dangerzone/TransferOwnershipCard';
import { ResetWorkspaceCard } from '../components/dangerzone/ResetWorkspaceCard';
import { ArchiveWorkspaceCard } from '../components/dangerzone/ArchiveWorkspaceCard';
import { ExportWorkspaceCard } from '../components/dangerzone/ExportWorkspaceCard';
import { DeleteDataCard } from '../components/dangerzone/DeleteDataCard';

export const DangerZoneSettings = () => {
  const { data, isLoading, executeAction, refetch } = useModuleData<{ overview: DangerOverview }>(SettingsModule.DANGER_ZONE);

  if (isLoading || !data) return (
    <div className="space-y-8 animate-pulse">
      <div className="h-32 rounded-lg border border-border bg-muted/50" />
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-lg border border-border bg-muted/50" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Danger Zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">Irreversible and destructive actions for workspace management.</p>
      </div>
      <DangerOverviewCard overview={data.overview} />
      <div className="space-y-6">
        <ExportWorkspaceCard />
        <ArchiveWorkspaceCard />
        <ResetWorkspaceCard />
        <TransferOwnershipCard />
        <DeleteDataCard />
        <DeleteWorkspaceCard />
      </div>
    </div>
  );
};