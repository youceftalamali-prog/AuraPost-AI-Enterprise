import { Check } from 'lucide-react';
import { Plan } from '../../pages/BillingPage';
import { cn } from '../../utils/settings.helpers';

interface Props {
  plan: Plan;
  isCurrent: boolean;
  onUpgrade: () => void;
}

export const PlanCard = ({ plan, isCurrent, onUpgrade }: Props) => {
  return (
    <div className={cn(
      'flex flex-col rounded-lg border bg-background p-5 transition-shadow hover:shadow-sm',
      isCurrent ? 'border-primary ring-1 ring-primary' : 'border-border'
    )}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">${plan.price}</span>
          <span className="text-sm text-muted-foreground">/{plan.interval}</span>
        </div>
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onUpgrade}
        disabled={isCurrent}
        className={cn(
          'w-full rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors',
          isCurrent
            ? 'cursor-default bg-muted text-muted-foreground'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {isCurrent ? 'Current Plan' : 'Upgrade'}
      </button>
    </div>
  );
};