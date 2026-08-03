import { CreditCard } from 'lucide-react';
import { PaymentMethod } from '../../pages/BillingPage';
import { cn } from '../../utils/settings.helpers';

interface Props {
  method: PaymentMethod;
  onSetDefault: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export const PaymentMethodCard = ({ method, onSetDefault, onEdit, onRemove }: Props) => {
  return (
    <div className={cn(
      'relative rounded-lg border bg-background p-4 transition-shadow hover:shadow-sm',
      method.isDefault ? 'border-primary ring-1 ring-primary' : 'border-border'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground capitalize">
              {method.type} •••• {method.last4}
            </p>
            <p className="text-xs text-muted-foreground">
              {method.expiry ? `Expires ${method.expiry}` : method.last4}
            </p>
          </div>
        </div>
        {method.isDefault && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Default
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t border-border pt-3">
        {!method.isDefault && (
          <button onClick={onSetDefault} className="text-xs font-medium text-primary hover:underline">
            Set as default
          </button>
        )}
        <button onClick={onEdit} className="text-xs font-medium text-muted-foreground hover:text-foreground">
          Edit
        </button>
        {!method.isDefault && (
          <button onClick={onRemove} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
            Remove
          </button>
        )}
      </div>
    </div>
  );
};