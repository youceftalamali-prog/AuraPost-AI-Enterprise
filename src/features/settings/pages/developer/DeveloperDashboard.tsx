import { useState, useEffect } from 'react';
import { DeveloperSkeleton } from '../../components/developer/DeveloperSkeleton';
import { DeveloperOverviewCard } from '../../components/developer/DeveloperOverviewCard';
import { DeveloperStatsCard } from '../../components/developer/DeveloperStatsCard';
import { DeveloperHealthCard } from '../../components/developer/DeveloperHealthCard';
import { DeveloperActivityCard } from '../../components/developer/DeveloperActivityCard';
import { DeveloperQuickActions } from '../../components/developer/DeveloperQuickActions';
import { DeveloperNavigationGrid } from '../../components/developer/DeveloperNavigationGrid';
import { 
  MOCK_ENVIRONMENT, MOCK_STATS, MOCK_HEALTH, MOCK_ACTIVITY 
} from '../../utils/developer.helpers';

export const DeveloperDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <DeveloperSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Developer Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          System diagnostics, infrastructure health, and advanced debugging tools.
        </p>
      </div>

      <DeveloperOverviewCard environment={MOCK_ENVIRONMENT} />
      <DeveloperStatsCard stats={MOCK_STATS} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <DeveloperHealthCard health={MOCK_HEALTH} />
        <DeveloperActivityCard activity={MOCK_ACTIVITY} />
      </div>

      <DeveloperQuickActions />
      <DeveloperNavigationGrid />
    </div>
  );
};