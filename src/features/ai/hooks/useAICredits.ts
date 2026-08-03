/**
 * useAICredits Hook
 * Hook for managing AI credits
 * Phase: 5.4 Part 4
 */

import { useState, useEffect, useCallback } from 'react';
import { creditManager, CreditPlan, CreditPackage } from '../credits/CreditManager';
import { AIProviderType } from '../providers/types';

export interface UseAICreditsOptions {
  userId: string;
  workspaceId: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export interface UseAICreditsReturn {
  // State
  balance: {
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
    monthlyLimit: number;
    monthlyUsed: number;
    monthlyRemaining: number;
  };
  isLoading: boolean;
  error: any | null;
  
  // Actions
  refreshBalance: () => Promise<void>;
  hasSufficientCredits: (required: number) => boolean;
  getCostEstimate: (action: string, provider: AIProviderType, modelId: string) => number;
  getPlans: () => CreditPlan[];
  getPackages: () => CreditPackage[];
  topUp: (packageId: string) => Promise<any>;
  changePlan: (planType: string) => Promise<any>;
  
  // Statistics
  getUsageStats: (days?: number) => any;
  getForecast: () => any;
  getTransactionHistory: (limit?: number) => any[];
}

export function useAICredits(options: UseAICreditsOptions): UseAICreditsReturn {
  const [balance, setBalance] = useState({
    totalCredits: 0,
    usedCredits: 0,
    remainingCredits: 0,
    monthlyLimit: 0,
    monthlyUsed: 0,
    monthlyRemaining: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const refreshBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const bal = creditManager.getBalance(options.userId, options.workspaceId);
      setBalance({
        totalCredits: bal.totalCredits,
        usedCredits: bal.usedCredits,
        remainingCredits: bal.remainingCredits,
        monthlyLimit: bal.monthlyLimit,
        monthlyUsed: bal.monthlyUsed,
        monthlyRemaining: bal.monthlyRemaining,
      });
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [options.userId, options.workspaceId]);

  useEffect(() => {
    refreshBalance();

    if (options.autoRefresh !== false) {
      const interval = setInterval(refreshBalance, options.refreshIntervalMs || 30000);
      return () => clearInterval(interval);
    }
  }, [refreshBalance, options.autoRefresh, options.refreshIntervalMs]);

  const hasSufficientCredits = useCallback((required: number) => {
    return creditManager.hasSufficientCredits(
      options.userId,
      options.workspaceId,
      required
    );
  }, [options.userId, options.workspaceId]);

  const getCostEstimate = useCallback((action: string, provider: AIProviderType, modelId: string) => {
    return creditManager.getCostEstimate(action, provider, modelId);
  }, []);

  const getPlans = useCallback(() => {
    return creditManager.getPlans();
  }, []);

  const getPackages = useCallback(() => {
    return creditManager.getPackages();
  }, []);

  const topUp = useCallback(async (packageId: string) => {
    try {
      const result = await creditManager.topUp(options.userId, options.workspaceId, {
        packageId: packageId as any,
      });
      await refreshBalance();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [options.userId, options.workspaceId, refreshBalance]);

  const changePlan = useCallback(async (planType: string) => {
    try {
      const result = creditManager.changePlan(
        options.userId,
        options.workspaceId,
        planType as any
      );
      await refreshBalance();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [options.userId, options.workspaceId, refreshBalance]);

  const getUsageStats = useCallback((days: number = 30) => {
    return creditManager.getUsageStats(options.userId, options.workspaceId, days);
  }, [options.userId, options.workspaceId]);

  const getForecast = useCallback(() => {
    return creditManager.getForecast(options.userId, options.workspaceId);
  }, [options.userId, options.workspaceId]);

  const getTransactionHistory = useCallback((limit: number = 50) => {
    return creditManager.getTransactionHistory(
      options.userId,
      options.workspaceId,
      limit
    );
  }, [options.userId, options.workspaceId]);

  return {
    balance,
    isLoading,
    error,
    refreshBalance,
    hasSufficientCredits,
    getCostEstimate,
    getPlans,
    getPackages,
    topUp,
    changePlan,
    getUsageStats,
    getForecast,
    getTransactionHistory,
  };
}