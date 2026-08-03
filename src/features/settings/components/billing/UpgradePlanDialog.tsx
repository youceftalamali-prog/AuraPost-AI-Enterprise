import { X, ArrowRight } from 'lucide-react';
import { Plan } from '../../pages/BillingPage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: Plan;
  selectedPlan: Plan;
  onConfirm: () => void;
}

export const UpgradePlanDialog = ({ isOpen, onClose, currentPlan, selectedPlan, onConfirm }: Props) => {
  if (!isOpen) return null;

  const isDowngrade = selectedPlan.price < currentPlan.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{isDowngrade ? 'Downgrade' : 'Upgrade'} Plan</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-sm font-semibold text-foreground">{currentPlan.name}</p>
            <p className="text-xs text-muted-foreground">${currentPlan.price}/mo</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">New</p>
            <p className="text-sm font-semibold text-primary">{selectedPlan.name}</p>
            <p className="text-xs text-muted-foreground">${selectedPlan.price}/mo</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {isDowngrade
            ? 'Your plan will be downgraded at the end of the current billing cycle. You will retain access to current features until then.'
            : 'You will be charged the prorated difference immediately. Your new limits will take effect instantly.'}
        </p>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Confirm {isDowngrade ? 'Downgrade' : 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
};