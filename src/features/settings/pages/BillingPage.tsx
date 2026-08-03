import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { settingsApi } from '../api/settings.api';
import { SettingsModule } from '../types/settings.types';
import { CurrentPlanCard } from '../components/billing/CurrentPlanCard';
import { PlanCard } from '../components/billing/PlanCard';
import { UsageCard } from '../components/billing/UsageCard';
import { PaymentMethodCard } from '../components/billing/PaymentMethodCard';
import { InvoiceTable } from '../components/billing/InvoiceTable';
import { BillingHistoryDialog } from '../components/billing/BillingHistoryDialog';
import { UpgradePlanDialog } from '../components/billing/UpgradePlanDialog';
import { CancelSubscriptionDialog } from '../components/billing/CancelSubscriptionDialog';
import { History, Plus } from 'lucide-react';

export type PlanId = 'free' | 'starter' | 'professional' | 'business' | 'enterprise';
export type BillingStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export type PaymentMethodType = 'visa' | 'mastercard' | 'paypal' | 'bank';
export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: { aiCredits: number; imageGen: number; videoGen: number; storage: number; members: number; };
}

export interface CurrentSubscription {
  plan: Plan;
  status: BillingStatus;
  renewalDate: string;
  workspace: string;
  seats: number;
  monthlyCost: number;
}

export interface UsageMetric {
  label: string;
  used: number;
  total: number;
  unit?: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  plan: string;
  status: InvoiceStatus;
  amount: number;
}

const PLANS: Plan[] = [
  { id: 'free', name: 'Free', price: 0, interval: 'month', features: ['Basic AI generation', '1 Workspace', 'Community support'], limits: { aiCredits: 100, imageGen: 10, videoGen: 0, storage: 1, members: 1 } },
  { id: 'starter', name: 'Starter', price: 29, interval: 'month', features: ['1,000 AI Credits', '100 Images/mo', '10 Videos/mo', '10GB Storage', '3 Members'], limits: { aiCredits: 1000, imageGen: 100, videoGen: 10, storage: 10, members: 3 } },
  { id: 'professional', name: 'Professional', price: 99, interval: 'month', features: ['5,000 AI Credits', '500 Images/mo', '50 Videos/mo', '50GB Storage', '10 Members', 'Priority support'], limits: { aiCredits: 5000, imageGen: 500, videoGen: 50, storage: 50, members: 10 } },
  { id: 'business', name: 'Business', price: 299, interval: 'month', features: ['20,000 AI Credits', 'Unlimited Images', '200 Videos/mo', '200GB Storage', '25 Members', 'Dedicated manager'], limits: { aiCredits: 20000, imageGen: 9999, videoGen: 200, storage: 200, members: 25 } },
  { id: 'enterprise', name: 'Enterprise', price: 999, interval: 'month', features: ['Unlimited AI Credits', 'Unlimited Everything', '1TB Storage', 'Unlimited Members', 'SLA & SSO'], limits: { aiCredits: 999999, imageGen: 999999, videoGen: 999999, storage: 1000, members: 999 } },
];

const MOCK_SUBSCRIPTION: CurrentSubscription = {
  plan: PLANS[2],
  status: 'active',
  renewalDate: '2026-02-15T00:00:00Z',
  workspace: 'AuraPost Main',
  seats: 5,
  monthlyCost: 99,
};

const MOCK_USAGE: UsageMetric[] = [
  { label: 'AI Credits', used: 3200, total: 5000, trend: 'up' },
  { label: 'Image Generation', used: 124, total: 500, trend: 'up' },
  { label: 'Video Generation', used: 12, total: 50, trend: 'neutral' },
  { label: 'Storage', used: 18.5, total: 50, unit: 'GB', trend: 'up' },
  { label: 'Bandwidth', used: 45, total: 100, unit: 'GB', trend: 'down' },
  { label: 'Workspace Members', used: 5, total: 10, trend: 'neutral' },
  { label: 'Products Imported', used: 142, total: 500, trend: 'up' },
  { label: 'Posts Published', used: 89, total: 200, trend: 'up' },
];

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm_1', type: 'visa', last4: '4242', expiry: '12/26', isDefault: true },
  { id: 'pm_2', type: 'paypal', last4: 'john@doe.com', expiry: '', isDefault: false },
];

const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-2026-001', date: '2026-01-15T00:00:00Z', plan: 'Professional', status: 'paid', amount: 99 },
  { id: 'INV-2025-012', date: '2025-12-15T00:00:00Z', plan: 'Professional', status: 'paid', amount: 99 },
  { id: 'INV-2025-011', date: '2025-11-15T00:00:00Z', plan: 'Starter', status: 'paid', amount: 29 },
];

export const BillingPage = () => {
  const { setDirty } = useSettings();
  const [subscription, setSubscription] = useState<CurrentSubscription>(MOCK_SUBSCRIPTION);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(MOCK_PAYMENT_METHODS);
  
  const [showHistory, setShowHistory] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const isDirty = JSON.stringify(subscription) !== JSON.stringify(MOCK_SUBSCRIPTION) || 
                    JSON.stringify(paymentMethods) !== JSON.stringify(MOCK_PAYMENT_METHODS);
    setDirty(isDirty);
  }, [subscription, paymentMethods, setDirty]);

  const handleUpgradeClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowUpgrade(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    try {
      await settingsApi.patch(SettingsModule.BILLING, 'current', { action: 'upgrade', planId: selectedPlan.id });
    } catch (e) { /* fallback */ }
    setSubscription(prev => ({ ...prev, plan: selectedPlan, monthlyCost: selectedPlan.price }));
    setShowUpgrade(false);
  };

  const handleConfirmCancel = async () => {
    try {
      await settingsApi.patch(SettingsModule.BILLING, 'current', { action: 'cancel' });
    } catch (e) { /* fallback */ }
    setSubscription(prev => ({ ...prev, status: 'canceled' }));
    setShowCancel(false);
  };

  const handleSetDefaultPayment = async (id: string) => {
    try {
      await settingsApi.patch(SettingsModule.BILLING, 'current', { action: 'set_default_payment', paymentMethodId: id });
    } catch (e) { /* fallback */ }
    setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: pm.id === id })));
  };

  const handleRemovePayment = async (id: string) => {
    try {
      await settingsApi.patch(SettingsModule.BILLING, 'current', { action: 'remove_payment', paymentMethodId: id });
    } catch (e) { /* fallback */ }
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Billing & Subscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your plan, usage, payment methods, and invoices.</p>
        </div>
        <button onClick={() => setShowHistory(true)} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
          <History className="h-4 w-4" /> Billing History
        </button>
      </div>

      <CurrentPlanCard subscription={subscription} onChangePlan={() => setShowUpgrade(true)} onCancel={() => setShowCancel(true)} />
      <UsageCard metrics={MOCK_USAGE} />

      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Available Plans</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} isCurrent={plan.id === subscription.plan.id} onUpgrade={() => handleUpgradeClick(plan)} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Payment Methods</h3>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Method
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {paymentMethods.map(pm => (
            <PaymentMethodCard key={pm.id} method={pm} onSetDefault={() => handleSetDefaultPayment(pm.id)} onEdit={() => {}} onRemove={() => handleRemovePayment(pm.id)} />
          ))}
        </div>
      </div>

      <InvoiceTable invoices={MOCK_INVOICES} onDownload={() => {}} />

      {showHistory && <BillingHistoryDialog isOpen={showHistory} onClose={() => setShowHistory(false)} />}
      {showUpgrade && selectedPlan && <UpgradePlanDialog isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} currentPlan={subscription.plan} selectedPlan={selectedPlan} onConfirm={handleConfirmUpgrade} />}
      {showCancel && <CancelSubscriptionDialog isOpen={showCancel} onClose={() => setShowCancel(false)} onConfirm={handleConfirmCancel} />}
    </div>
  );
};