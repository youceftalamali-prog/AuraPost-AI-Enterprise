import { CreditCard, Calendar, Users, AlertTriangle } from 'lucide-react';
import { CurrentSubscription } from '../../pages/BillingPage';
import { cn } from '../../utils/settings.helpers';

interface Props {
  subscription: CurrentSubscription;
  onChangePlan: () => void;
  onCancel: () => void;
}

export const CurrentPlanCard = ({ subscription, onChangePlan, onCancel }: Props) => {
  const isCanceled = subscription.status === 'canceled';
  const isPastDue = subscription.status === 'past_due';

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">{subscription.plan.name}</h3>
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
              subscription.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
              subscription.status === 'trialing' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
              subscription.status === 'past_due' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
              'bg-muted text-muted-foreground'
            )}>
              {subscription.status.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ${subscription.monthlyCost}/month • Renews {new Date(subscription.renewalDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onChangePlan}
            disabled={isCanceled}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" /> Change Plan
          </button>
          {!isCanceled && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {isPastDue && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Payment failed. Please update your payment method to restore service.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Active Seats</p>
            <p className="text-sm font-semibold text-foreground">{subscription.seats}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Next Billing</p>
            <p className="text-sm font-semibold text-foreground">{new Date(subscription.renewalDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Workspace</p>
            <p className="text-sm font-semibold text-foreground truncate">{subscription.workspace}</p>
          </div>
        </div>
      </div>
    </div>
  );
};