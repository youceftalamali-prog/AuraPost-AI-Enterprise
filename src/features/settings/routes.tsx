import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { usePermissionGuard } from './hooks/usePermissionGuard';
import { SettingsArea } from './types/settings.types';
import { PermissionDenied } from './components/shared/PermissionDenied';
import { ErrorState } from './components/shared/ErrorState';

const SuspenseFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const WorkspaceSettingsPage = lazy(() => import('./pages/WorkspaceSettingsPage').then(m => ({ default: m.WorkspaceSettingsPage })));
const AIProvidersPage = lazy(() => import('./pages/AIProvidersPage').then(m => ({ default: m.AIProvidersPage })));
const CommerceSettingsPage = lazy(() => import('./pages/CommerceSettingsPage').then(m => ({ default: m.CommerceSettingsPage })));
const SocialChannelsPage = lazy(() => import('./pages/SocialChannelsPage').then(m => ({ default: m.SocialChannelsPage })));
const BrandKitPage = lazy(() => import('./pages/BrandKitPage').then(m => ({ default: m.BrandKitPage })));
const TeamMembersPage = lazy(() => import('./pages/TeamMembersPage').then(m => ({ default: m.TeamMembersPage })));
const BillingPage = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })));
const IntegrationsSettings = lazy(() => import('./pages/IntegrationsSettings').then(m => ({ default: m.IntegrationsSettings })));
const ApiSettings = lazy(() => import('./pages/ApiSettings').then(m => ({ default: m.ApiSettings })));
const SecuritySettings = lazy(() => import('./pages/SecuritySettings').then(m => ({ default: m.SecuritySettings })));
const NotificationsSettings = lazy(() => import('./pages/NotificationsSettings').then(m => ({ default: m.NotificationsSettings })));
const StorageSettings = lazy(() => import('./pages/StorageSettings').then(m => ({ default: m.StorageSettings })));
const SystemSettings = lazy(() => import('./pages/SystemSettings').then(m => ({ default: m.SystemSettings })));

const DeveloperDashboard = lazy(() => import('./pages/developer/DeveloperDashboard').then(m => ({ default: m.DeveloperDashboard })));
const LogsSettings = lazy(() => import('./pages/developer/LogsSettings').then(m => ({ default: m.LogsSettings })));
const QueueSettings = lazy(() => import('./pages/developer/QueueSettings').then(m => ({ default: m.QueueSettings })));
const CacheSettings = lazy(() => import('./pages/CacheSettings').then(m => ({ default: m.CacheSettings })));
const FeatureFlagsPage = lazy(() => import('./pages/developer/FeatureFlagsPage').then(m => ({ default: m.FeatureFlagsPage })));
const DangerZoneSettings = lazy(() => import('./pages/DangerZoneSettings').then(m => ({ default: m.DangerZoneSettings })));

const ProtectedRoute = ({ children, area }: { children: React.ReactNode, area: SettingsArea }) => {
  const { hasAccess } = usePermissionGuard();
  if (!hasAccess(area)) return <PermissionDenied />;
  return <>{children}</>;
};

class SettingsErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

export const SettingsRoutes = () => {
  return (
    <SettingsErrorBoundary fallback={<ErrorState error="A critical error occurred in the Settings module." onRefresh={() => window.location.reload()} />}>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route index element={<Navigate to="workspace" replace />} />
          
          <Route path="workspace" element={<WorkspaceSettingsPage />} />
          <Route path="ai-providers" element={<AIProvidersPage />} />
          <Route path="commerce" element={<CommerceSettingsPage />} />
          <Route path="social-channels" element={<SocialChannelsPage />} />
          <Route path="brand-kit" element={<BrandKitPage />} />
          <Route path="team" element={<TeamMembersPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="integrations" element={<IntegrationsSettings />} />
          <Route path="api" element={<ApiSettings />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="notifications" element={<NotificationsSettings />} />
          <Route path="storage" element={<StorageSettings />} />
          <Route path="system" element={<SystemSettings />} />

          <Route path="developer" element={<ProtectedRoute area={SettingsArea.DEVELOPER}><DeveloperDashboard /></ProtectedRoute>} />
          <Route path="logs" element={<ProtectedRoute area={SettingsArea.DEVELOPER}><LogsSettings /></ProtectedRoute>} />
          <Route path="queue" element={<ProtectedRoute area={SettingsArea.DEVELOPER}><QueueSettings /></ProtectedRoute>} />
          <Route path="cache" element={<ProtectedRoute area={SettingsArea.DEVELOPER}><CacheSettings /></ProtectedRoute>} />
          <Route path="feature-flags" element={<ProtectedRoute area={SettingsArea.DEVELOPER}><FeatureFlagsPage /></ProtectedRoute>} />
          <Route path="danger-zone" element={<ProtectedRoute area={SettingsArea.DEVELOPER}><DangerZoneSettings /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="workspace" replace />} />
        </Routes>
      </Suspense>
    </SettingsErrorBoundary>
  );
};