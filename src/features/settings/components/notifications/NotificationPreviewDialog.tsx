import { X, Mail, Smartphone, MessageSquare } from 'lucide-react';

interface Props {
  isOpen: boolean;
  type: 'email' | 'push' | 'sms';
  onClose: () => void;
}

export const NotificationPreviewDialog = ({ isOpen, type, onClose }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground capitalize">{type} Preview</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          {type === 'email' && (
            <div className="rounded-lg border border-border bg-white p-6 text-gray-900 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-4 mb-4">
                <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">A</div>
                <div>
                  <p className="text-sm font-bold">AuraPost</p>
                  <p className="text-xs text-gray-500">no-reply@aurapost.ai</p>
                </div>
              </div>
              <h4 className="text-lg font-bold mb-2">Your AI generation is ready!</h4>
              <p className="text-sm text-gray-600 mb-4">
                The image you requested has been successfully generated and added to your assets library.
              </p>
              <button className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
                View Asset
              </button>
            </div>
          )}

          {type === 'push' && (
            <div className="mx-auto max-w-xs rounded-xl border border-border bg-muted/50 p-4 shadow-lg backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">AuraPost</p>
                    <p className="text-xs text-muted-foreground">now</p>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5">Workflow Completed</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your "Social Media Campaign" workflow has finished successfully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {type === 'sms' && (
            <div className="mx-auto max-w-xs space-y-2">
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-none bg-primary px-4 py-2 text-sm text-primary-foreground max-w-[80%]">
                  [AuraPost] Critical Alert: Payment failed for workspace "Main". Please update your billing details immediately to avoid service interruption.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};