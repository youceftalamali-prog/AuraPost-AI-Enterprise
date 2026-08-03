/**
 * Credit Manager
 * Manages AI credits for users and workspaces
 * Supports: Balance tracking, Credit deduction, Monthly limits,
 *           Transaction history, Package plans, Consumption forecasting,
 *           Credit top-up, Usage alerts, Refund handling
 * Phase: 5.4 Part 4
 *
 * ============================================================================
 * ⚠️ NOT AUTHORITATIVE — CLIENT-SIDE ESTIMATE ONLY. DO NOT GATE SPENDING ON IT.
 * ============================================================================
 * This entire class keeps its state in an in-memory Map (see `balances`
 * below). It resets on every page reload and is never persisted to a
 * server. The REAL, money-accurate credit ledger is
 * `credit_ledger`/`workspace_credit_pools` in the Postgres database,
 * authoritative only through `server/db.ts` (`checkCreditBalance`,
 * `consumeCredits`) — see AUDIT_REPORT.md Issue #4 and
 * PRODUCTION_REPORT.md.
 *
 * Use this class ONLY for client-side UX: showing an estimated balance,
 * a forecast, a "this will cost ~20 credits" preview, plan/package
 * catalogs, or usage alerts. Never use `deductCredits`/`addCredits`/
 * `refund` on this class as the thing that actually authorizes an AI
 * generation request to proceed — a user could trivially bypass it (it's
 * plain client-side JS). The real charge happens server-side, inside the
 * route that performs the generation (see `/api/images/generate` in
 * server.ts for the established pattern: `checkCreditBalance` before
 * calling the provider, `consumeCredits` after a successful result).
 *
 * For an authoritative balance to *display*, fetch it from the server via
 * `src/features/ai/credits/creditApiClient.ts` (added alongside this file)
 * rather than trusting this class's local Map.
 * ============================================================================
 */

import {
  AIProviderType,
  AICreditTransaction,
  AICreditBalance,
} from '../providers/types';

export type CreditPlanType = 'free' | 'starter' | 'pro' | 'enterprise' | 'custom';

export type CreditPackageType =
  | 'starter-pack'
  | 'standard-pack'
  | 'pro-pack'
  | 'enterprise-pack'
  | 'custom-pack';

export interface CreditPlan {
  id: string;
  name: string;
  type: CreditPlanType;
  monthlyCredits: number;
  pricePerMonth: number;
  maxConcurrentRequests: number;
  maxRequestsPerMinute: number;
  features: string[];
  overageCostPerCredit: number;
  rolloverCredits: boolean;
  maxRolloverCredits: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  type: CreditPackageType;
  credits: number;
  price: number;
  bonusCredits: number;
  expiresAt?: number;
  validForDays: number;
}

export interface CreditUsageAlert {
  id: string;
  userId: string;
  workspaceId: string;
  thresholdPercent: number;
  type: 'usage' | 'remaining' | 'daily';
  enabled: boolean;
  lastTriggeredAt?: number;
  notificationChannels: ('email' | 'in-app' | 'webhook')[];
}

export interface CreditForecast {
  userId: string;
  workspaceId: string;
  currentUsage: number;
  projectedUsage: number;
  projectedRemaining: number;
  daysUntilExhaustion: number | null;
  confidence: number;
  recommendation?: string;
}

export interface CreditConfig {
  enableOverdraft: boolean;
  overdraftLimit: number;
  enableAutoTopUp: boolean;
  autoTopUpThreshold: number;
  autoTopUpAmount: number;
  enableRollover: boolean;
  maxRolloverDays: number;
  enableUsageAlerts: boolean;
  defaultAlertThresholds: number[];
  enableForecasting: boolean;
  forecastHistoryDays: number;
}

export interface TopUpOptions {
  packageId?: string;
  customCredits?: number;
  applyBonus?: boolean;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

export interface TopUpResult {
  success: boolean;
  transactionId?: string;
  creditsAdded: number;
  newBalance: number;
  expiresAt?: number;
  error?: string;
}

export interface DeductOptions {
  userId: string;
  workspaceId: string;
  amount: number;
  action: string;
  provider: AIProviderType;
  modelId: string;
  requestId?: string;
  description?: string;
  metadata?: Record<string, any>;
  allowOverdraft?: boolean;
}

export interface DeductResult {
  success: boolean;
  transactionId?: string;
  creditsDeducted: number;
  newBalance: number;
  error?: string;
}

export interface RefundOptions {
  transactionId: string;
  amount?: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  success: boolean;
  refundTransactionId?: string;
  creditsRefunded: number;
  newBalance: number;
  error?: string;
}

export class CreditManager {
  private balances: Map<string, AICreditBalance> = new Map();
  private transactions: Map<string, AICreditTransaction[]> = new Map();
  private plans: Map<CreditPlanType, CreditPlan> = new Map();
  private packages: Map<CreditPackageType, CreditPackage> = new Map();
  private alerts: Map<string, CreditUsageAlert[]> = new Map();
  private config: CreditConfig;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(config: Partial<CreditConfig> = {}) {
    this.config = {
      enableOverdraft: config.enableOverdraft || false,
      overdraftLimit: config.overdraftLimit || 0,
      enableAutoTopUp: config.enableAutoTopUp || false,
      autoTopUpThreshold: config.autoTopUpThreshold || 10,
      autoTopUpAmount: config.autoTopUpAmount || 100,
      enableRollover: config.enableRollover !== false,
      maxRolloverDays: config.maxRolloverDays || 90,
      enableUsageAlerts: config.enableUsageAlerts !== false,
      defaultAlertThresholds: config.defaultAlertThresholds || [25, 50, 75, 90],
      enableForecasting: config.enableForecasting !== false,
      forecastHistoryDays: config.forecastHistoryDays || 30,
    };

    this.initializePlans();
    this.initializePackages();
    this.startMonthlyResetTimer();
  }

  /**
   * Initialize available credit plans
   */
  private initializePlans(): void {
    const plans: CreditPlan[] = [
      {
        id: 'free',
        name: 'Free Plan',
        type: 'free',
        monthlyCredits: 100,
        pricePerMonth: 0,
        maxConcurrentRequests: 2,
        maxRequestsPerMinute: 10,
        features: ['Basic AI features', 'Standard quality'],
        overageCostPerCredit: 0.05,
        rolloverCredits: false,
        maxRolloverCredits: 0,
      },
      {
        id: 'starter',
        name: 'Starter Plan',
        type: 'starter',
        monthlyCredits: 1000,
        pricePerMonth: 9.99,
        maxConcurrentRequests: 5,
        maxRequestsPerMinute: 30,
        features: ['All AI features', 'High quality', 'Priority support'],
        overageCostPerCredit: 0.03,
        rolloverCredits: true,
        maxRolloverCredits: 500,
      },
      {
        id: 'pro',
        name: 'Pro Plan',
        type: 'pro',
        monthlyCredits: 5000,
        pricePerMonth: 29.99,
        maxConcurrentRequests: 10,
        maxRequestsPerMinute: 60,
        features: ['All AI features', 'Ultra quality', 'Priority support', 'API access'],
        overageCostPerCredit: 0.02,
        rolloverCredits: true,
        maxRolloverCredits: 2500,
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        type: 'enterprise',
        monthlyCredits: 50000,
        pricePerMonth: 199.99,
        maxConcurrentRequests: 50,
        maxRequestsPerMinute: 300,
        features: ['All AI features', 'Ultra quality', 'Dedicated support', 'API access', 'Custom models'],
        overageCostPerCredit: 0.01,
        rolloverCredits: true,
        maxRolloverCredits: 25000,
      },
    ];

    plans.forEach(plan => {
      this.plans.set(plan.type, plan);
    });
  }

  /**
   * Initialize available credit packages
   */
  private initializePackages(): void {
    const packages: CreditPackage[] = [
      {
        id: 'starter-pack',
        name: 'Starter Pack',
        type: 'starter-pack',
        credits: 500,
        price: 9.99,
        bonusCredits: 50,
        validForDays: 365,
      },
      {
        id: 'standard-pack',
        name: 'Standard Pack',
        type: 'standard-pack',
        credits: 2000,
        price: 29.99,
        bonusCredits: 300,
        validForDays: 365,
      },
      {
        id: 'pro-pack',
        name: 'Pro Pack',
        type: 'pro-pack',
        credits: 10000,
        price: 99.99,
        bonusCredits: 2000,
        validForDays: 365,
      },
      {
        id: 'enterprise-pack',
        name: 'Enterprise Pack',
        type: 'enterprise-pack',
        credits: 50000,
        price: 399.99,
        bonusCredits: 15000,
        validForDays: 365,
      },
    ];

    packages.forEach(pkg => {
      this.packages.set(pkg.type, pkg);
    });
  }

  /**
   * Get or create balance for user/workspace
   */
  private getOrCreateBalance(
    userId: string,
    workspaceId: string,
    planType: CreditPlanType = 'free'
  ): AICreditBalance {
    const key = `${userId}:${workspaceId}`;

    if (!this.balances.has(key)) {
      const plan = this.plans.get(planType);
      const monthlyCredits = plan?.monthlyCredits || 100;

      const balance: AICreditBalance = {
        userId,
        workspaceId,
        totalCredits: monthlyCredits,
        usedCredits: 0,
        remainingCredits: monthlyCredits,
        monthlyLimit: monthlyCredits,
        monthlyUsed: 0,
        monthlyRemaining: monthlyCredits,
        lastUpdated: Date.now(),
      };

      this.balances.set(key, balance);
    }

    return this.balances.get(key)!;
  }

  /**
   * Get balance key
   */
  private getBalanceKey(userId: string, workspaceId: string): string {
    return `${userId}:${workspaceId}`;
  }

  /**
   * Get transaction key
   */
  private getTransactionKey(userId: string, workspaceId: string): string {
    return `${userId}:${workspaceId}`;
  }

  /**
   * Get user/workspace balance
   */
  getBalance(userId: string, workspaceId: string): AICreditBalance {
    return this.getOrCreateBalance(userId, workspaceId);
  }

  /**
   * Check if user has sufficient credits
   */
  hasSufficientCredits(
    userId: string,
    workspaceId: string,
    requiredCredits: number
  ): boolean {
    const balance = this.getBalance(userId, workspaceId);
    const availableCredits = balance.remainingCredits + (this.config.enableOverdraft ? this.config.overdraftLimit : 0);
    return availableCredits >= requiredCredits;
  }

  /**
   * Deduct credits from balance
   */
  async deductCredits(options: DeductOptions): Promise<DeductResult> {
    const { userId, workspaceId } = this.extractUserWorkspace(options);
    const balance = this.getOrCreateBalance(userId, workspaceId);

    // Check if sufficient credits
    const availableCredits = balance.remainingCredits + (this.config.enableOverdraft ? this.config.overdraftLimit : 0);

    if (availableCredits < options.amount && !options.allowOverdraft) {
      return {
        success: false,
        creditsDeducted: 0,
        newBalance: balance.remainingCredits,
        error: 'Insufficient credits',
      };
    }

    // Check overdraft limit
    if (options.amount > availableCredits && !this.config.enableOverdraft) {
      return {
        success: false,
        creditsDeducted: 0,
        newBalance: balance.remainingCredits,
        error: 'Overdraft not allowed',
      };
    }

    // Deduct credits
    balance.usedCredits += options.amount;
    balance.remainingCredits -= options.amount;
    balance.monthlyUsed += options.amount;
    balance.monthlyRemaining -= options.amount;
    balance.lastUpdated = Date.now();

    // Create transaction
    const transaction: AICreditTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      workspaceId,
      amount: options.amount,
      type: 'debit',
      action: options.action,
      provider: options.provider,
      modelId: options.modelId,
      requestId: options.requestId,
      description: options.description || `AI ${options.action}`,
      balanceAfter: balance.remainingCredits,
      createdAt: Date.now(),
    };

    // Store transaction
    const txKey = this.getTransactionKey(userId, workspaceId);
    if (!this.transactions.has(txKey)) {
      this.transactions.set(txKey, []);
    }
    this.transactions.get(txKey)!.push(transaction);

    // Check alerts
    this.checkUsageAlerts(userId, workspaceId);

    // Auto top-up if enabled
    if (this.config.enableAutoTopUp && balance.remainingCredits <= this.config.autoTopUpThreshold) {
      await this.autoTopUp(userId, workspaceId);
    }

    this.emit('creditsDeducted', transaction, balance);

    return {
      success: true,
      transactionId: transaction.id,
      creditsDeducted: options.amount,
      newBalance: balance.remainingCredits,
    };
  }

  /**
   * Add credits to balance
   */
  async addCredits(
    userId: string,
    workspaceId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<AICreditTransaction> {
    const balance = this.getOrCreateBalance(userId, workspaceId);

    // Add credits
    balance.totalCredits += amount;
    balance.remainingCredits += amount;
    balance.lastUpdated = Date.now();

    // Create transaction
    const transaction: AICreditTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      workspaceId,
      amount,
      type: 'credit',
      action: 'credit_add',
      provider: 'custom' as AIProviderType,
      modelId: 'system',
      description: reason,
      balanceAfter: balance.remainingCredits,
      createdAt: Date.now(),
    };

    // Store transaction
    const txKey = this.getTransactionKey(userId, workspaceId);
    if (!this.transactions.has(txKey)) {
      this.transactions.set(txKey, []);
    }
    this.transactions.get(txKey)!.push(transaction);

    this.emit('creditsAdded', transaction, balance);

    return transaction;
  }

  /**
   * Top-up credits with package
   */
  async topUp(
    userId: string,
    workspaceId: string,
    options: TopUpOptions
  ): Promise<TopUpResult> {
    let creditsToAdd = 0;
    let bonusCredits = 0;
    let expiresAt: number | undefined;

    if (options.packageId) {
      const pkg = this.packages.get(options.packageId as CreditPackageType);
      if (!pkg) {
        return {
          success: false,
          creditsAdded: 0,
          newBalance: this.getBalance(userId, workspaceId).remainingCredits,
          error: 'Invalid package',
        };
      }

      creditsToAdd = pkg.credits;
      bonusCredits = options.applyBonus !== false ? pkg.bonusCredits : 0;
      expiresAt = Date.now() + pkg.validForDays * 24 * 60 * 60 * 1000;
    } else if (options.customCredits) {
      creditsToAdd = options.customCredits;
      expiresAt = options.expiresAt;
    } else {
      return {
        success: false,
        creditsAdded: 0,
        newBalance: this.getBalance(userId, workspaceId).remainingCredits,
        error: 'No credits specified',
      };
    }

    const totalCredits = creditsToAdd + bonusCredits;

    // Add credits
    const transaction = await this.addCredits(
      userId,
      workspaceId,
      totalCredits,
      `Top-up: ${options.packageId || 'custom'} credits`,
      {
        ...options.metadata,
        packageId: options.packageId,
        bonusCredits,
        expiresAt,
      }
    );

    const balance = this.getBalance(userId, workspaceId);

    return {
      success: true,
      transactionId: transaction.id,
      creditsAdded: totalCredits,
      newBalance: balance.remainingCredits,
      expiresAt,
    };
  }

  /**
   * Auto top-up when balance is low
   */
  private async autoTopUp(userId: string, workspaceId: string): Promise<void> {
    const result = await this.topUp(userId, workspaceId, {
      customCredits: this.config.autoTopUpAmount,
      applyBonus: false,
    });

    if (result.success) {
      this.emit('autoTopUp', result, userId, workspaceId);
    }
  }

  /**
   * Refund credits for a transaction
   */
  async refund(options: RefundOptions): Promise<RefundResult> {
    const { userId, workspaceId } = this.extractUserWorkspace(options);
    const txKey = this.getTransactionKey(userId, workspaceId);
    const transactions = this.transactions.get(txKey) || [];

    const originalTx = transactions.find(t => t.id === options.transactionId);
    if (!originalTx) {
      return {
        success: false,
        creditsRefunded: 0,
        newBalance: this.getBalance(userId, workspaceId).remainingCredits,
        error: 'Original transaction not found',
      };
    }

    if (originalTx.type !== 'debit') {
      return {
        success: false,
        creditsRefunded: 0,
        newBalance: this.getBalance(userId, workspaceId).remainingCredits,
        error: 'Can only refund debit transactions',
      };
    }

    const refundAmount = options.amount || originalTx.amount;

    // Add credits back
    const transaction = await this.addCredits(
      userId,
      workspaceId,
      refundAmount,
      `Refund: ${options.reason}`,
      {
        ...options.metadata,
        originalTransactionId: originalTx.id,
        reason: options.reason,
      }
    );

    const balance = this.getBalance(userId, workspaceId);

    this.emit('creditsRefunded', transaction, originalTx, balance);

    return {
      success: true,
      refundTransactionId: transaction.id,
      creditsRefunded: refundAmount,
      newBalance: balance.remainingCredits,
    };
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(
    userId: string,
    workspaceId: string,
    limit: number = 100,
    offset: number = 0
  ): AICreditTransaction[] {
    const txKey = this.getTransactionKey(userId, workspaceId);
    const transactions = this.transactions.get(txKey) || [];

    return transactions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
  }

  /**
   * Get transactions by type
   */
  getTransactionsByType(
    userId: string,
    workspaceId: string,
    type: 'credit' | 'debit'
  ): AICreditTransaction[] {
    const txKey = this.getTransactionKey(userId, workspaceId);
    const transactions = this.transactions.get(txKey) || [];

    return transactions.filter(t => t.type === type);
  }

  /**
   * Get transactions by date range
   */
  getTransactionsByDateRange(
    userId: string,
    workspaceId: string,
    startDate: number,
    endDate: number
  ): AICreditTransaction[] {
    const txKey = this.getTransactionKey(userId, workspaceId);
    const transactions = this.transactions.get(txKey) || [];

    return transactions.filter(
      t => t.createdAt >= startDate && t.createdAt <= endDate
    );
  }

  /**
   * Get transactions by action
   */
  getTransactionsByAction(
    userId: string,
    workspaceId: string,
    action: string
  ): AICreditTransaction[] {
    const txKey = this.getTransactionKey(userId, workspaceId);
    const transactions = this.transactions.get(txKey) || [];

    return transactions.filter(t => t.action === action);
  }

  /**
   * Get available plans
   */
  getPlans(): CreditPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get plan by type
   */
  getPlan(planType: CreditPlanType): CreditPlan | null {
    return this.plans.get(planType) || null;
  }

  /**
   * Get available packages
   */
  getPackages(): CreditPackage[] {
    return Array.from(this.packages.values());
  }

  /**
   * Get package by type
   */
  getPackage(packageType: CreditPackageType): CreditPackage | null {
    return this.packages.get(packageType) || null;
  }

  /**
   * Change user plan
   */
  changePlan(
    userId: string,
    workspaceId: string,
    newPlanType: CreditPlanType
  ): AICreditBalance {
    const newPlan = this.plans.get(newPlanType);
    if (!newPlan) {
      throw new Error(`Invalid plan type: ${newPlanType}`);
    }

    const balance = this.getOrCreateBalance(userId, workspaceId);
    const key = this.getBalanceKey(userId, workspaceId);

    // Calculate new balance
    const currentUsage = balance.monthlyUsed;
    const newMonthlyLimit = newPlan.monthlyCredits;
    const newRemaining = Math.max(0, newMonthlyLimit - currentUsage);

    const newBalance: AICreditBalance = {
      ...balance,
      totalCredits: balance.totalCredits + (newMonthlyLimit - balance.monthlyLimit),
      monthlyLimit: newMonthlyLimit,
      monthlyRemaining: newRemaining,
      remainingCredits: balance.remainingCredits + (newMonthlyLimit - balance.monthlyLimit),
      lastUpdated: Date.now(),
    };

    this.balances.set(key, newBalance);

    this.emit('planChanged', newBalance, newPlanType);

    return newBalance;
  }

  /**
   * Reset monthly usage (called automatically at month start)
   */
  resetMonthlyUsage(userId: string, workspaceId: string): AICreditBalance {
    const balance = this.getOrCreateBalance(userId, workspaceId);
    const key = this.getBalanceKey(userId, workspaceId);

    // Calculate rollover credits
    let rolloverCredits = 0;
    if (this.config.enableRollover && balance.monthlyRemaining > 0) {
      const plan = this.getPlanForBalance(balance);
      if (plan?.rolloverCredits) {
        rolloverCredits = Math.min(
          balance.monthlyRemaining,
          plan.maxRolloverCredits
        );
      }
    }

    const newBalance: AICreditBalance = {
      ...balance,
      monthlyUsed: 0,
      monthlyRemaining: balance.monthlyLimit + rolloverCredits,
      remainingCredits: balance.remainingCredits + rolloverCredits,
      lastUpdated: Date.now(),
    };

    this.balances.set(key, newBalance);

    // Create rollover transaction if applicable
    if (rolloverCredits > 0) {
      this.addCredits(
        userId,
        workspaceId,
        rolloverCredits,
        'Monthly rollover credits',
        { type: 'rollover' }
      );
    }

    this.emit('monthlyReset', newBalance);

    return newBalance;
  }

  /**
   * Get plan for balance
   */
  private getPlanForBalance(balance: AICreditBalance): CreditPlan | null {
    for (const plan of this.plans.values()) {
      if (plan.monthlyCredits === balance.monthlyLimit) {
        return plan;
      }
    }
    return null;
  }

  /**
   * Start monthly reset timer
   */
  private startMonthlyResetTimer(): void {
    // Check every hour if it's time to reset
    setInterval(() => {
      const now = new Date();
      // Reset on first day of month at midnight
      if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetAllMonthlyUsage();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Reset all monthly usage
   */
  private resetAllMonthlyUsage(): void {
    for (const [key, balance] of this.balances) {
      const [userId, workspaceId] = key.split(':');
      this.resetMonthlyUsage(userId, workspaceId);
    }
  }

  /**
   * Add usage alert
   */
  addUsageAlert(alert: Omit<CreditUsageAlert, 'id'>): CreditUsageAlert {
    const fullAlert: CreditUsageAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };

    const key = `${alert.userId}:${alert.workspaceId}`;
    if (!this.alerts.has(key)) {
      this.alerts.set(key, []);
    }
    this.alerts.get(key)!.push(fullAlert);

    return fullAlert;
  }

  /**
   * Remove usage alert
   */
  removeUsageAlert(alertId: string): boolean {
    for (const [key, alerts] of this.alerts) {
      const index = alerts.findIndex(a => a.id === alertId);
      if (index !== -1) {
        alerts.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Get usage alerts for user/workspace
   */
  getUsageAlerts(userId: string, workspaceId: string): CreditUsageAlert[] {
    const key = `${userId}:${workspaceId}`;
    return this.alerts.get(key) || [];
  }

  /**
   * Check usage alerts
   */
  private checkUsageAlerts(userId: string, workspaceId: string): void {
    if (!this.config.enableUsageAlerts) return;

    const balance = this.getBalance(userId, workspaceId);
    const usagePercent = (balance.monthlyUsed / balance.monthlyLimit) * 100;
    const remainingPercent = (balance.monthlyRemaining / balance.monthlyLimit) * 100;

    const alerts = this.getUsageAlerts(userId, workspaceId);

    for (const alert of alerts) {
      if (!alert.enabled) continue;

      let shouldTrigger = false;

      if (alert.type === 'usage' && usagePercent >= alert.thresholdPercent) {
        shouldTrigger = true;
      } else if (alert.type === 'remaining' && remainingPercent <= alert.thresholdPercent) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        // Check if already triggered recently (within 1 hour)
        if (alert.lastTriggeredAt && Date.now() - alert.lastTriggeredAt < 3600000) {
          continue;
        }

        alert.lastTriggeredAt = Date.now();

        this.emit('usageAlertTriggered', alert, balance);
      }
    }
  }

  /**
   * Get credit forecast
   */
  getForecast(userId: string, workspaceId: string): CreditForecast {
    const balance = this.getBalance(userId, workspaceId);
    const txKey = this.getTransactionKey(userId, workspaceId);
    const transactions = this.transactions.get(txKey) || [];

    // Get transactions from history period
    const cutoffDate = Date.now() - this.config.forecastHistoryDays * 24 * 60 * 60 * 1000;
    const historicalTransactions = transactions.filter(
      t => t.type === 'debit' && t.createdAt >= cutoffDate
    );

    // Calculate average daily usage
    const totalUsed = historicalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const daysInPeriod = Math.max(1, this.config.forecastHistoryDays);
    const averageDailyUsage = totalUsed / daysInPeriod;

    // Calculate days remaining in month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate();

    // Project usage
    const projectedUsage = balance.monthlyUsed + averageDailyUsage * daysRemaining;
    const projectedRemaining = balance.monthlyLimit - projectedUsage;

    // Calculate days until exhaustion
    let daysUntilExhaustion: number | null = null;
    if (averageDailyUsage > 0) {
      daysUntilExhaustion = Math.floor(balance.monthlyRemaining / averageDailyUsage);
    }

    // Calculate confidence (based on data availability)
    const confidence = Math.min(1, historicalTransactions.length / 30);

    // Generate recommendation
    let recommendation: string | undefined;
    if (projectedUsage > balance.monthlyLimit * 1.2) {
      recommendation = 'Consider upgrading your plan or purchasing additional credits';
    } else if (projectedUsage < balance.monthlyLimit * 0.5) {
      recommendation = 'You may be able to downgrade to a lower plan';
    }

    return {
      userId,
      workspaceId,
      currentUsage: balance.monthlyUsed,
      projectedUsage,
      projectedRemaining,
      daysUntilExhaustion,
      confidence,
      recommendation,
    };
  }

  /**
   * Get usage statistics
   */
  getUsageStats(
    userId: string,
    workspaceId: string,
    days: number = 30
  ): {
    totalCreditsUsed: number;
    averageDailyUsage: number;
    peakUsageDay: number;
    peakUsageAmount: number;
    usageByAction: Record<string, number>;
    usageByProvider: Record<string, number>;
    usageByDay: Array<{ date: string; amount: number }>;
  } {
    const txKey = this.getTransactionKey(userId, workspaceId);
    const transactions = this.transactions.get(txKey) || [];

    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentTransactions = transactions.filter(
      t => t.type === 'debit' && t.createdAt >= cutoffDate
    );

    const totalCreditsUsed = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageDailyUsage = totalCreditsUsed / days;

    // Group by day
    const usageByDayMap = new Map<string, number>();
    const usageByActionMap = new Map<string, number>();
    const usageByProviderMap = new Map<string, number>();

    for (const tx of recentTransactions) {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      usageByDayMap.set(date, (usageByDayMap.get(date) || 0) + tx.amount);
      usageByActionMap.set(tx.action, (usageByActionMap.get(tx.action) || 0) + tx.amount);
      usageByProviderMap.set(tx.provider, (usageByProviderMap.get(tx.provider) || 0) + tx.amount);
    }

    // Find peak day
    let peakUsageDay = 0;
    let peakUsageAmount = 0;
    for (const [date, amount] of usageByDayMap) {
      if (amount > peakUsageAmount) {
        peakUsageAmount = amount;
        peakUsageDay = new Date(date).getDate();
      }
    }

    const usageByDay = Array.from(usageByDayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCreditsUsed,
      averageDailyUsage,
      peakUsageDay,
      peakUsageAmount,
      usageByAction: Object.fromEntries(usageByActionMap),
      usageByProvider: Object.fromEntries(usageByProviderMap),
      usageByDay,
    };
  }

  /**
   * Get cost estimate for action
   */
  getCostEstimate(
    action: string,
    provider: AIProviderType,
    modelId: string
  ): number {
    // Base costs per action
    const baseCosts: Record<string, number> = {
      'text-to-image': 10,
      'image-edit': 15,
      'image-variation': 12,
      'inpaint': 15,
      'outpaint': 18,
      'object-removal': 20,
      'upscale': 5,
      'remove-background': 8,
      'relight': 12,
      'recolor': 10,
      'face-enhance': 8,
      'style-transfer': 15,
      'generative-fill': 20,
      'image-analysis': 3,
      'image-description': 2,
    };

    // Provider multipliers
    const providerMultipliers: Record<string, number> = {
      openai: 1.5,
      gemini: 1.0,
      stability: 1.2,
      replicate: 0.8,
      custom: 1.0,
    };

    const baseCost = baseCosts[action] || 10;
    const multiplier = providerMultipliers[provider] || 1.0;

    return Math.round(baseCost * multiplier);
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Credit manager listener error for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Extract user/workspace from options
   */
  private extractUserWorkspace(options: any): { userId: string; workspaceId: string } {
    return {
      userId: options.userId || '',
      workspaceId: options.workspaceId || '',
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CreditConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get configuration
   */
  getConfig(): CreditConfig {
    return { ...this.config };
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.balances.clear();
    this.transactions.clear();
    this.alerts.clear();
  }

  /**
   * Destroy credit manager
   */
  destroy(): void {
    this.listeners.clear();
    this.clearAll();
  }
}

export const creditManager = new CreditManager();