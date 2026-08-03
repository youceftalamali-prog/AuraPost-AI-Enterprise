import { useEffect } from 'react';
import { SettingsSidebar } from '../components/SettingsSidebar';
import { SettingsHeader } from '../components/SettingsHeader';
import { SettingsSaveBar } from '../components/SettingsSaveBar';
import { SettingsMobileMenu } from '../components/SettingsMobileMenu';
import { LoadingOverlay } from '../components/shared/LoadingOverlay';
import { useSettings } from '../hooks/useSettings';
import { useResponsive } from '../hooks/useResponsive';
import { useRouteLeaveGuard } from '../hooks/useRouteLeaveGuard';
import { SettingsRoutes } from '../routes';
import { useToastStore } from '../hooks/useSettingsToast';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-background animate-in slide-in-from-right ${
          toast.type === 'success' ? 'border-emerald-500/20' : 
          toast.type === 'error' ? 'border-red-500/20' : 'border-border'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />}
          <p className="text-sm text-foreground flex-1">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const SettingsLayout = () => {
  const { reset } = useSettings();
  const { isMobile } = useResponsive();
  
  useRouteLeaveGuard();

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <SettingsSidebar />
      </div>

      <SettingsMobileMenu />

      <div className="flex min-w-0 flex-1 flex-col">
        <SettingsHeader />

        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${isMobile ? 'pb-24' : ''}`}>
          <SettingsRoutes />
        </main>

        <SettingsSaveBar />
      </div>

      <LoadingOverlay />
      <ToastContainer />
    </div>
  );
};
