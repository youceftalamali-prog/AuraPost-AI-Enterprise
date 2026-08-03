import { Download } from 'lucide-react';
import { Invoice } from '../../pages/BillingPage';
import { cn } from '../../utils/settings.helpers';

interface Props {
  invoices: Invoice[];
  onDownload: (id: string) => void;
}

export const InvoiceTable = ({ invoices, onDownload }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border p-4">
        <h3 className="text-base font-semibold text-foreground">Invoice History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="transition-colors hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                  {new Date(invoice.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{invoice.plan}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">${invoice.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    invoice.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    invoice.status === 'refunded' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    'bg-red-500/10 text-red-600 dark:text-red-400'
                  )}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDownload(invoice.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};