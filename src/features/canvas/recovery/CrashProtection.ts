/**
 * Crash Protection
 * Handles error boundaries, safe recovery, rollback, and transaction safety
 * Supports: Error boundaries, Safe recovery, Rollback, Transaction safety, Logging
 * Phase: 5.4 Part 5
 */

export interface ErrorLog {
  id: string;
  timestamp: number;
  error: Error;
  context: Record<string, any>;
  stack?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recovered: boolean;
  recoveryAction?: string;
}

export interface RecoveryCheckpoint {
  id: string;
  projectId: string;
  timestamp: number;
  state: any;
  description: string;
  autoSaved: boolean;
}

export interface TransactionState {
  id: string;
  startedAt: number;
  operations: any[];
  rollbackStack: Array<() => void>;
  committed: boolean;
  rolledBack: boolean;
}

export interface RecoveryConfig {
  maxErrorLogs: number;
  maxCheckpoints: number;
  autoSaveIntervalMs: number;
  enableAutoRecovery: boolean;
  enableTransactionSafety: boolean;
  enableErrorLogging: boolean;
  enableRollback: boolean;
}

export interface RecoveryStats {
  totalErrors: number;
  recoveredErrors: number;
  unrecoveredErrors: number;
  activeTransactions: number;
  completedTransactions: number;
  rolledBackTransactions: number;
  checkpointsCreated: number;
  lastErrorAt: number | null;
  lastRecoveryAt: number | null;
}

export type CanvasErrorHandler = (error: Error, context: Record<string, any>) => void;
export type RecoveryHandler = (checkpoint: RecoveryCheckpoint) => void;

export class CrashProtection {
  private errorLogs: ErrorLog[] = [];
  private checkpoints: Map<string, RecoveryCheckpoint[]> = new Map();
  private transactions: Map<string, TransactionState> = new Map();
  private config: RecoveryConfig;
  private errorHandlers: Set<CanvasErrorHandler> = new Set();
  private recoveryHandlers: Set<RecoveryHandler> = new Set();
  private autoSaveTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private stats: RecoveryStats;
  private globalErrorHandler: ((event: ErrorEvent) => void) | null = null;
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = {
      maxErrorLogs: config.maxErrorLogs || 1000,
      maxCheckpoints: config.maxCheckpoints || 50,
      autoSaveIntervalMs: config.autoSaveIntervalMs || 30000,
      enableAutoRecovery: config.enableAutoRecovery !== false,
      enableTransactionSafety: config.enableTransactionSafety !== false,
      enableErrorLogging: config.enableErrorLogging !== false,
      enableRollback: config.enableRollback !== false,
    };

    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      unrecoveredErrors: 0,
      activeTransactions: 0,
      completedTransactions: 0,
      rolledBackTransactions: 0,
      checkpointsCreated: 0,
      lastErrorAt: null,
      lastRecoveryAt: null,
    };

    if (this.config.enableErrorLogging) {
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle window errors
    this.globalErrorHandler = (event: ErrorEvent) => {
      this.logError(event.error || new Error(event.message), {
        type: 'window-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // Handle unhandled promise rejections
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      
      this.logError(error, {
        type: 'unhandled-rejection',
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.globalErrorHandler);
      window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
  }

  /**
   * Log error
   */
  logError(
    error: Error,
    context: Record<string, any> = {},
    severity: ErrorLog['severity'] = 'error'
  ): ErrorLog {
    const log: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      error,
      context,
      stack: error.stack,
      severity,
      recovered: false,
    };

    this.errorLogs.push(log);
    this.stats.totalErrors++;
    this.stats.lastErrorAt = log.timestamp;

    // Limit error logs
    if (this.errorLogs.length > this.config.maxErrorLogs) {
      this.errorLogs.shift();
    }

    // Notify error handlers
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, context);
      } catch (e) {
        console.error('Error handler failed:', e);
      }
    });

    // Auto-recover if enabled
    if (this.config.enableAutoRecovery && severity === 'critical') {
      this.attemptRecovery(context.projectId);
    }

    return log;
  }

  /**
   * Attempt recovery from checkpoint
   */
  attemptRecovery(projectId: string): RecoveryCheckpoint | null {
    const checkpoints = this.checkpoints.get(projectId);
    if (!checkpoints || checkpoints.length === 0) {
      return null;
    }

    // Get latest checkpoint
    const checkpoint = checkpoints[checkpoints.length - 1];

    // Notify recovery handlers
    this.recoveryHandlers.forEach(handler => {
      try {
        handler(checkpoint);
      } catch (e) {
        console.error('Recovery handler failed:', e);
      }
    });

    this.stats.recoveredErrors++;
    this.stats.lastRecoveryAt = Date.now();

    // Mark recent errors as recovered
    const recentErrors = this.errorLogs.slice(-10);
    recentErrors.forEach(log => {
      if (!log.recovered) {
        log.recovered = true;
        log.recoveryAction = 'checkpoint-restore';
      }
    });

    return checkpoint;
  }

  /**
   * Create recovery checkpoint
   */
  createCheckpoint(
    projectId: string,
    state: any,
    description: string,
    autoSaved: boolean = false
  ): RecoveryCheckpoint {
    const checkpoint: RecoveryCheckpoint = {
      id: `checkpoint_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      projectId,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)), // Deep copy
      description,
      autoSaved,
    };

    if (!this.checkpoints.has(projectId)) {
      this.checkpoints.set(projectId, []);
    }

    const checkpoints = this.checkpoints.get(projectId)!;
    checkpoints.push(checkpoint);
    this.stats.checkpointsCreated++;

    // Limit checkpoints
    if (checkpoints.length > this.config.maxCheckpoints) {
      checkpoints.shift();
    }

    return checkpoint;
  }

  /**
   * Get checkpoints for project
   */
  getCheckpoints(projectId: string): RecoveryCheckpoint[] {
    return this.checkpoints.get(projectId) || [];
  }

  /**
   * Get latest checkpoint for project
   */
  getLatestCheckpoint(projectId: string): RecoveryCheckpoint | null {
    const checkpoints = this.checkpoints.get(projectId);
    if (!checkpoints || checkpoints.length === 0) {
      return null;
    }
    return checkpoints[checkpoints.length - 1];
  }

  /**
   * Delete checkpoint
   */
  deleteCheckpoint(projectId: string, checkpointId: string): boolean {
    const checkpoints = this.checkpoints.get(projectId);
    if (!checkpoints) return false;

    const index = checkpoints.findIndex(c => c.id === checkpointId);
    if (index === -1) return false;

    checkpoints.splice(index, 1);
    return true;
  }

  /**
   * Clear all checkpoints for project
   */
  clearCheckpoints(projectId: string): void {
    this.checkpoints.delete(projectId);
  }

  /**
   * Start transaction
   */
  startTransaction(id?: string): string {
    const transactionId = id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const transaction: TransactionState = {
      id: transactionId,
      startedAt: Date.now(),
      operations: [],
      rollbackStack: [],
      committed: false,
      rolledBack: false,
    };

    this.transactions.set(transactionId, transaction);
    this.stats.activeTransactions++;

    return transactionId;
  }

  /**
   * Add operation to transaction
   */
  addTransactionOperation(
    transactionId: string,
    operation: any,
    rollbackFn: () => void
  ): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.committed || transaction.rolledBack) {
      return false;
    }

    transaction.operations.push(operation);
    transaction.rollbackStack.push(rollbackFn);

    return true;
  }

  /**
   * Commit transaction
   */
  commitTransaction(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.committed || transaction.rolledBack) {
      return false;
    }

    transaction.committed = true;
    transaction.rollbackStack = []; // Clear rollback stack
    this.stats.activeTransactions--;
    this.stats.completedTransactions++;

    return true;
  }

  /**
   * Rollback transaction
   */
  rollbackTransaction(transactionId: string): boolean {
    if (!this.config.enableRollback) {
      return false;
    }

    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.committed || transaction.rolledBack) {
      return false;
    }

    // Execute rollback functions in reverse order
    const rollbackFns = [...transaction.rollbackStack].reverse();
    for (const rollbackFn of rollbackFns) {
      try {
        rollbackFn();
      } catch (error) {
        this.logError(error as Error, {
          type: 'rollback-error',
          transactionId,
        });
      }
    }

    transaction.rolledBack = true;
    transaction.rollbackStack = [];
    this.stats.activeTransactions--;
    this.stats.rolledBackTransactions++;

    return true;
  }

  /**
   * Get transaction state
   */
  getTransaction(transactionId: string): TransactionState | null {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Check if transaction is active
   */
  isTransactionActive(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    return transaction !== undefined && !transaction.committed && !transaction.rolledBack;
  }

  /**
   * Execute with transaction safety
   */
  async executeWithTransaction<T>(
    operation: () => Promise<T>,
    rollbackFn?: () => void
  ): Promise<T> {
    const transactionId = this.startTransaction();

    try {
      const result = await operation();
      
      if (rollbackFn) {
        this.addTransactionOperation(transactionId, null, rollbackFn);
      }

      this.commitTransaction(transactionId);
      return result;
    } catch (error) {
      this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * Execute with retry
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Start autosave for project
   */
  startAutosave(
    projectId: string,
    getState: () => any,
    onSave: (checkpoint: RecoveryCheckpoint) => void
  ): void {
    // Stop existing autosave
    this.stopAutosave(projectId);

    const timer = setInterval(() => {
      try {
        const state = getState();
        const checkpoint = this.createCheckpoint(
          projectId,
          state,
          'Autosave checkpoint',
          true
        );
        onSave(checkpoint);
      } catch (error) {
        this.logError(error as Error, {
          type: 'autosave-error',
          projectId,
        });
      }
    }, this.config.autoSaveIntervalMs);

    this.autoSaveTimers.set(projectId, timer);
  }

  /**
   * Stop autosave for project
   */
  stopAutosave(projectId: string): void {
    const timer = this.autoSaveTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(projectId);
    }
  }

  /**
   * Stop all autosaves
   */
  stopAllAutosaves(): void {
    for (const [projectId, timer] of this.autoSaveTimers) {
      clearInterval(timer);
    }
    this.autoSaveTimers.clear();
  }

  /**
   * Register error handler
   */
  onError(handler: CanvasErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  /**
   * Unregister error handler
   */
  offError(handler: CanvasErrorHandler): void {
    this.errorHandlers.delete(handler);
  }

  /**
   * Register recovery handler
   */
  onRecovery(handler: RecoveryHandler): void {
    this.recoveryHandlers.add(handler);
  }

  /**
   * Unregister recovery handler
   */
  offRecovery(handler: RecoveryHandler): void {
    this.recoveryHandlers.delete(handler);
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit?: number): ErrorLog[] {
    const logs = [...this.errorLogs];
    if (limit) {
      return logs.slice(-limit);
    }
    return logs;
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorLog['severity']): ErrorLog[] {
    return this.errorLogs.filter(log => log.severity === severity);
  }

  /**
   * Get unrecovered errors
   */
  getUnrecoveredErrors(): ErrorLog[] {
    return this.errorLogs.filter(log => !log.recovered);
  }

  /**
   * Clear error logs
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Get statistics
   */
  getStats(): RecoveryStats {
    return { ...this.stats };
  }

  /**
   * Get configuration
   */
  getConfig(): RecoveryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RecoveryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Export recovery data
   */
  exportRecoveryData(): string {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        errorLogs: this.errorLogs,
        checkpoints: Object.fromEntries(this.checkpoints),
        stats: this.stats,
      },
      null,
      2
    );
  }

  /**
   * Import recovery data
   */
  importRecoveryData(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.errorLogs && Array.isArray(data.errorLogs)) {
        this.errorLogs = data.errorLogs;
      }

      if (data.checkpoints && typeof data.checkpoints === 'object') {
        for (const [projectId, checkpoints] of Object.entries(data.checkpoints)) {
          if (Array.isArray(checkpoints)) {
            this.checkpoints.set(projectId, checkpoints);
          }
        }
      }

      if (data.stats) {
        this.stats = { ...this.stats, ...data.stats };
      }

      return true;
    } catch (error) {
      console.error('Failed to import recovery data:', error);
      return false;
    }
  }

  /**
   * Check if project has recovery checkpoint
   */
  hasRecoveryCheckpoint(projectId: string): boolean {
    const checkpoints = this.checkpoints.get(projectId);
    return checkpoints !== undefined && checkpoints.length > 0;
  }

  /**
   * Get recovery checkpoint age
   */
  getCheckpointAge(projectId: string): number | null {
    const checkpoint = this.getLatestCheckpoint(projectId);
    if (!checkpoint) return null;
    return Date.now() - checkpoint.timestamp;
  }

  /**
   * Check if checkpoint is stale
   */
  isCheckpointStale(projectId: string, maxAgeMs: number = 300000): boolean {
    const age = this.getCheckpointAge(projectId);
    return age === null || age > maxAgeMs;
  }

  /**
   * Get active transaction count
   */
  getActiveTransactionCount(): number {
    return this.stats.activeTransactions;
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): TransactionState[] {
    return Array.from(this.transactions.values()).filter(
      tx => !tx.committed && !tx.rolledBack
    );
  }

  /**
   * Rollback all active transactions
   */
  rollbackAllTransactions(): void {
    const activeTransactions = this.getActiveTransactions();
    for (const transaction of activeTransactions) {
      this.rollbackTransaction(transaction.id);
    }
  }

  /**
   * Destroy crash protection
   */
  destroy(): void {
    // Remove global error handlers
    if (typeof window !== 'undefined') {
      if (this.globalErrorHandler) {
        window.removeEventListener('error', this.globalErrorHandler);
      }
      if (this.unhandledRejectionHandler) {
        window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
      }
    }

    // Stop all autosaves
    this.stopAllAutosaves();

    // Rollback all active transactions
    this.rollbackAllTransactions();

    // Clear data
    this.errorLogs = [];
    this.checkpoints.clear();
    this.transactions.clear();
    this.errorHandlers.clear();
    this.recoveryHandlers.clear();
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errorLogs.length;
  }

  /**
   * Get checkpoint count for project
   */
  getCheckpointCount(projectId: string): number {
    const checkpoints = this.checkpoints.get(projectId);
    return checkpoints ? checkpoints.length : 0;
  }

  /**
   * Check if error logging is enabled
   */
  isErrorLoggingEnabled(): boolean {
    return this.config.enableErrorLogging;
  }

  /**
   * Check if auto recovery is enabled
   */
  isAutoRecoveryEnabled(): boolean {
    return this.config.enableAutoRecovery;
  }

  /**
   * Check if transaction safety is enabled
   */
  isTransactionSafetyEnabled(): boolean {
    return this.config.enableTransactionSafety;
  }

  /**
   * Check if rollback is enabled
   */
  isRollbackEnabled(): boolean {
    return this.config.enableRollback;
  }

  /**
   * Get recovery success rate
   */
  getRecoverySuccessRate(): number {
    if (this.stats.totalErrors === 0) return 1;
    return this.stats.recoveredErrors / this.stats.totalErrors;
  }

  /**
   * Get average recovery time
   */
  getAverageRecoveryTime(): number {
    const recoveredErrors = this.errorLogs.filter(log => log.recovered);
    if (recoveredErrors.length === 0) return 0;

    const totalTime = recoveredErrors.reduce((sum, log) => {
      return sum + (log.timestamp - (this.stats.lastErrorAt || log.timestamp));
    }, 0);

    return totalTime / recoveredErrors.length;
  }
}

export const crashProtection = new CrashProtection();