/**
 * AI Job Queue
 * Manages AI request queue with priorities, concurrency, retry, and progress tracking
 * Supports: Priority queue, Concurrency control, Retry logic, Progress tracking,
 *           Cancellation, Batch processing, Rate limiting, Job persistence
 * Phase: 5.4 Part 4
 */

import {
  AIRequest,
  AIResponse,
  AIJob,
  AIJobStatus,
  AIError,
  AIErrorCode,
  IAIProvider,
} from '../providers/types';

export type JobPriority = 'low' | 'medium' | 'high' | 'critical';

export interface QueueConfig {
  maxConcurrentJobs: number;
  maxQueueSize: number;
  defaultPriority: JobPriority;
  retryAttempts: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  jobTimeoutMs: number;
  enableProgressTracking: boolean;
  enablePersistence: boolean;
  persistenceKey: string;
  rateLimitPerMinute: number;
  enableBatching: boolean;
  maxBatchSize: number;
}

export interface QueueStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  retryingJobs: number;
  averageProcessingTimeMs: number;
  averageQueueWaitMs: number;
  successRate: number;
  queueLength: number;
  throughputPerMinute: number;
}

export interface QueueListener {
  onJobQueued?: (job: AIJob) => void;
  onJobStarted?: (job: AIJob) => void;
  onJobProgress?: (job: AIJob, progress: number) => void;
  onJobCompleted?: (job: AIJob, response: AIResponse) => void;
  onJobFailed?: (job: AIJob, error: AIError) => void;
  onJobCancelled?: (job: AIJob) => void;
  onJobRetrying?: (job: AIJob, attempt: number) => void;
  onQueueDrained?: () => void;
}

export interface QueueJobOptions {
  priority?: JobPriority;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
  onCancel?: () => void;
}

const PRIORITY_WEIGHTS: Record<JobPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export class AIJobQueue {
  private queue: AIJob[] = [];
  private activeJobs: Map<string, AIJob> = new Map();
  private completedJobs: Map<string, AIJob> = new Map();
  private failedJobs: Map<string, AIJob> = new Map();
  private cancelledJobs: Map<string, AIJob> = new Map();
  private jobResolvers: Map<string, {
    resolve: (response: AIResponse) => void;
    reject: (error: AIError) => void;
  }> = new Map();
  private jobTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private jobProgress: Map<string, number> = new Map();
  private listeners: Set<QueueListener> = new Set();
  private provider: IAIProvider | null = null;
  private config: QueueConfig;
  private isProcessing: boolean = false;
  private processingTimer: ReturnType<typeof setInterval> | null = null;
  private rateLimitCounter: number = 0;
  private rateLimitResetAt: number = 0;
  private stats: {
    totalProcessingTimeMs: number;
    totalQueueWaitMs: number;
    completedCount: number;
    failedCount: number;
    startTime: number;
  } = {
    totalProcessingTimeMs: 0,
    totalQueueWaitMs: 0,
    completedCount: 0,
    failedCount: 0,
    startTime: Date.now(),
  };

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrentJobs: config.maxConcurrentJobs || 3,
      maxQueueSize: config.maxQueueSize || 100,
      defaultPriority: config.defaultPriority || 'medium',
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      retryBackoffMultiplier: config.retryBackoffMultiplier || 2,
      jobTimeoutMs: config.jobTimeoutMs || 60000,
      enableProgressTracking: config.enableProgressTracking !== false,
      enablePersistence: config.enablePersistence || false,
      persistenceKey: config.persistenceKey || 'ai_job_queue',
      rateLimitPerMinute: config.rateLimitPerMinute || 60,
      enableBatching: config.enableBatching || false,
      maxBatchSize: config.maxBatchSize || 5,
    };

    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    this.startProcessing();
  }

  /**
   * Set AI provider for the queue
   */
  setProvider(provider: IAIProvider): void {
    this.provider = provider;
  }

  /**
   * Add job to queue
   */
  async enqueue(
    request: AIRequest,
    options: QueueJobOptions = {}
  ): Promise<AIResponse> {
    // Check queue size
    if (this.queue.length >= this.config.maxQueueSize) {
      throw this.createError(
        AIErrorCode.INTERNAL_ERROR,
        'Queue is full. Please try again later.',
        false
      );
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      throw this.createError(
        AIErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded. Please wait before submitting more requests.',
        true
      );
    }

    // Create job
    const job: AIJob = {
      id: request.id,
      requestId: request.id,
      status: 'queued',
      progress: 0,
      request,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: options.retryAttempts ?? this.config.retryAttempts,
      metadata: options.metadata,
    };

    // Apply priority
    const priority = options.priority || this.config.defaultPriority;
    (job as any).priority = priority;

    // Insert into queue based on priority
    this.insertJobByPriority(job);

    // Setup progress callback
    if (options.onProgress && this.config.enableProgressTracking) {
      this.jobProgress.set(job.id, 0);
    }

    // Return promise that resolves when job completes
    return new Promise((resolve, reject) => {
      this.jobResolvers.set(job.id, { resolve, reject });

      // Setup timeout
      const timeoutMs = options.timeoutMs || this.config.jobTimeoutMs;
      const timeout = setTimeout(() => {
        this.handleJobTimeout(job.id);
      }, timeoutMs);
      this.jobTimeouts.set(job.id, timeout);

      // Notify listeners
      this.emit('onJobQueued', job);

      // Persist if enabled
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }
    });
  }

  /**
   * Add multiple jobs to queue
   */
  async enqueueBatch(
    requests: AIRequest[],
    options: QueueJobOptions = {}
  ): Promise<AIResponse[]> {
    if (!this.config.enableBatching) {
      // Process sequentially
      const results: AIResponse[] = [];
      for (const request of requests) {
        const result = await this.enqueue(request, options);
        results.push(result);
      }
      return results;
    }

    // Batch processing
    const promises = requests.map(request => this.enqueue(request, options));
    return Promise.all(promises);
  }

  /**
   * Cancel a job
   */
  async cancel(jobId: string): Promise<boolean> {
    // Check if job is in queue
    const queueIndex = this.queue.findIndex(j => j.id === jobId);
    if (queueIndex !== -1) {
      const job = this.queue[queueIndex];
      job.status = 'cancelled';
      this.queue.splice(queueIndex, 1);
      this.cancelledJobs.set(jobId, job);

      // Reject promise
      const resolver = this.jobResolvers.get(jobId);
      if (resolver) {
        resolver.reject(
          this.createError(AIErrorCode.CANCELLED, 'Job was cancelled', false)
        );
        this.jobResolvers.delete(jobId);
      }

      // Clear timeout
      this.clearJobTimeout(jobId);

      this.emit('onJobCancelled', job);
      return true;
    }

    // Check if job is active
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      // Try to cancel with provider
      if (this.provider) {
        await this.provider.cancel(jobId);
      }

      activeJob.status = 'cancelled';
      this.activeJobs.delete(jobId);
      this.cancelledJobs.set(jobId, activeJob);

      // Reject promise
      const resolver = this.jobResolvers.get(jobId);
      if (resolver) {
        resolver.reject(
          this.createError(AIErrorCode.CANCELLED, 'Job was cancelled', false)
        );
        this.jobResolvers.delete(jobId);
      }

      // Clear timeout
      this.clearJobTimeout(jobId);

      this.emit('onJobCancelled', activeJob);
      return true;
    }

    return false;
  }

  /**
   * Cancel all jobs
   */
  async cancelAll(): Promise<number> {
    let cancelledCount = 0;

    // Cancel queued jobs
    const queuedJobs = [...this.queue];
    for (const job of queuedJobs) {
      await this.cancel(job.id);
      cancelledCount++;
    }

    // Cancel active jobs
    const activeJobIds = Array.from(this.activeJobs.keys());
    for (const jobId of activeJobIds) {
      await this.cancel(jobId);
      cancelledCount++;
    }

    return cancelledCount;
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.isProcessing = false;
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.startProcessing();
    }
  }

  /**
   * Check if queue is paused
   */
  isPaused(): boolean {
    return !this.isProcessing;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): AIJob | null {
    // Check queue
    const queuedJob = this.queue.find(j => j.id === jobId);
    if (queuedJob) return queuedJob;

    // Check active
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) return activeJob;

    // Check completed
    const completedJob = this.completedJobs.get(jobId);
    if (completedJob) return completedJob;

    // Check failed
    const failedJob = this.failedJobs.get(jobId);
    if (failedJob) return failedJob;

    // Check cancelled
    const cancelledJob = this.cancelledJobs.get(jobId);
    if (cancelledJob) return cancelledJob;

    return null;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): AIJobStatus | null {
    const job = this.getJob(jobId);
    return job?.status || null;
  }

  /**
   * Get job progress
   */
  getJobProgress(jobId: string): number {
    return this.jobProgress.get(jobId) || 0;
  }

  /**
   * Update job progress (called by provider)
   */
  updateJobProgress(jobId: string, progress: number): void {
    if (!this.config.enableProgressTracking) return;

    const normalizedProgress = Math.max(0, Math.min(100, progress));
    this.jobProgress.set(jobId, normalizedProgress);

    const job = this.getJob(jobId);
    if (job) {
      job.progress = normalizedProgress;
      this.emit('onJobProgress', job, normalizedProgress);
    }
  }

  /**
   * Get all queued jobs
   */
  getQueuedJobs(): AIJob[] {
    return [...this.queue];
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): AIJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get all completed jobs
   */
  getCompletedJobs(limit: number = 100): AIJob[] {
    const jobs = Array.from(this.completedJobs.values());
    return jobs.sort((a, b) => b.completedAt! - a.completedAt!).slice(0, limit);
  }

  /**
   * Get all failed jobs
   */
  getFailedJobs(limit: number = 100): AIJob[] {
    const jobs = Array.from(this.failedJobs.values());
    return jobs.sort((a, b) => b.completedAt! - a.completedAt!).slice(0, limit);
  }

  /**
   * Get all cancelled jobs
   */
  getCancelledJobs(limit: number = 100): AIJob[] {
    const jobs = Array.from(this.cancelledJobs.values());
    return jobs.sort((a, b) => b.completedAt! - a.completedAt!).slice(0, limit);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const totalJobs =
      this.queue.length +
      this.activeJobs.size +
      this.completedJobs.size +
      this.failedJobs.size +
      this.cancelledJobs.size;

    const retryingJobs = Array.from(this.activeJobs.values()).filter(
      j => j.status === 'retrying'
    ).length;

    const avgProcessingTime =
      this.stats.completedCount > 0
        ? this.stats.totalProcessingTimeMs / this.stats.completedCount
        : 0;

    const avgQueueWait =
      this.stats.completedCount > 0
        ? this.stats.totalQueueWaitMs / this.stats.completedCount
        : 0;

    const successRate =
      this.stats.completedCount + this.stats.failedCount > 0
        ? this.stats.completedCount /
          (this.stats.completedCount + this.stats.failedCount)
        : 0;

    const elapsedMinutes = (Date.now() - this.stats.startTime) / 60000;
    const throughput = elapsedMinutes > 0 ? this.stats.completedCount / elapsedMinutes : 0;

    return {
      totalJobs,
      queuedJobs: this.queue.length,
      processingJobs: this.activeJobs.size,
      completedJobs: this.completedJobs.size,
      failedJobs: this.failedJobs.size,
      cancelledJobs: this.cancelledJobs.size,
      retryingJobs,
      averageProcessingTimeMs: avgProcessingTime,
      averageQueueWaitMs: avgQueueWait,
      successRate,
      queueLength: this.queue.length,
      throughputPerMinute: throughput,
    };
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): number {
    const count = this.completedJobs.size;
    this.completedJobs.clear();
    return count;
  }

  /**
   * Clear failed jobs
   */
  clearFailedJobs(): number {
    const count = this.failedJobs.size;
    this.failedJobs.clear();
    return count;
  }

  /**
   * Clear cancelled jobs
   */
  clearCancelledJobs(): number {
    const count = this.cancelledJobs.size;
    this.cancelledJobs.clear();
    return count;
  }

  /**
   * Clear all jobs
   */
  clearAllJobs(): void {
    this.queue = [];
    this.activeJobs.clear();
    this.completedJobs.clear();
    this.failedJobs.clear();
    this.cancelledJobs.clear();
    this.jobResolvers.clear();
    this.jobProgress.clear();

    // Clear all timeouts
    for (const timeout of this.jobTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.jobTimeouts.clear();

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<AIResponse | null> {
    const failedJob = this.failedJobs.get(jobId);
    if (!failedJob) return null;

    // Remove from failed jobs
    this.failedJobs.delete(jobId);

    // Reset job state
    failedJob.status = 'queued';
    failedJob.retryCount = 0;
    failedJob.error = undefined;
    failedJob.progress = 0;

    // Re-enqueue
    return this.enqueue(failedJob.request, {
      priority: (failedJob as any).priority,
      retryAttempts: failedJob.maxRetries,
    });
  }

  /**
   * Add listener
   */
  addListener(listener: QueueListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener
   */
  removeListener(listener: QueueListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get configuration
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && this.activeJobs.size === 0;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.length >= this.config.maxQueueSize;
  }

  /**
   * Get queue capacity
   */
  getCapacity(): number {
    return this.config.maxQueueSize - this.queue.length;
  }

  /**
   * Wait for queue to drain
   */
  async waitForDrain(timeoutMs: number = 60000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isEmpty()) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      const checkInterval = setInterval(() => {
        if (this.isEmpty()) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
    });
  }

  /**
   * Destroy queue
   */
  destroy(): void {
    this.pause();
    this.clearAllJobs();
    this.listeners.clear();

    if (this.config.enablePersistence) {
      this.clearStorage();
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Start processing loop
   */
  private startProcessing(): void {
    this.isProcessing = true;

    // Process queue every 100ms
    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, 100);
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isProcessing || !this.provider) return;

    // Check if we can process more jobs
    while (
      this.queue.length > 0 &&
      this.activeJobs.size < this.config.maxConcurrentJobs
    ) {
      const job = this.queue.shift();
      if (!job) break;

      // Check rate limit
      if (!this.checkRateLimit()) {
        // Put job back in queue
        this.queue.unshift(job);
        break;
      }

      // Process job
      this.processJob(job);
    }

    // Check if queue is drained
    if (this.queue.length === 0 && this.activeJobs.size === 0) {
      this.emit('onQueueDrained');
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: AIJob): Promise<void> {
    job.status = 'processing';
    job.startedAt = Date.now();
    this.activeJobs.set(job.id, job);

    // Track queue wait time
    const waitTime = job.startedAt - job.createdAt;
    this.stats.totalQueueWaitMs += waitTime;

    this.emit('onJobStarted', job);

    try {
      // Update progress
      if (this.config.enableProgressTracking) {
        this.updateJobProgress(job.id, 10);
      }

      // Execute with provider
      const response = await this.provider!.execute(job.request);

      // Update progress
      if (this.config.enableProgressTracking) {
        this.updateJobProgress(job.id, 100);
      }

      if (response.status === 'completed') {
        // Job completed successfully
        job.status = 'completed';
        job.response = response;
        job.completedAt = Date.now();

        this.activeJobs.delete(job.id);
        this.completedJobs.set(job.id, job);

        // Update stats
        const processingTime = job.completedAt - job.startedAt!;
        this.stats.totalProcessingTimeMs += processingTime;
        this.stats.completedCount++;

        // Resolve promise
        const resolver = this.jobResolvers.get(job.id);
        if (resolver) {
          resolver.resolve(response);
          this.jobResolvers.delete(job.id);
        }

        this.emit('onJobCompleted', job, response);
      } else if (response.status === 'failed') {
        // Job failed - try retry
        await this.handleJobFailure(job, response.error!);
      } else if (response.status === 'cancelled') {
        // Job was cancelled
        job.status = 'cancelled';
        job.completedAt = Date.now();

        this.activeJobs.delete(job.id);
        this.cancelledJobs.set(job.id, job);

        const resolver = this.jobResolvers.get(job.id);
        if (resolver) {
          resolver.reject(
            this.createError(AIErrorCode.CANCELLED, 'Job was cancelled', false)
          );
          this.jobResolvers.delete(job.id);
        }

        this.emit('onJobCancelled', job);
      }
    } catch (error) {
      // Handle unexpected error
      const aiError: AIError = {
        code: AIErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };

      await this.handleJobFailure(job, aiError);
    } finally {
      // Clear timeout
      this.clearJobTimeout(job.id);

      // Persist if enabled
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: AIJob, error: AIError): Promise<void> {
    job.error = error;

    // Check if retryable
    if (error.retryable && job.retryCount < job.maxRetries) {
      job.retryCount++;
      job.status = 'retrying';

      this.emit('onJobRetrying', job, job.retryCount);

      // Calculate delay with exponential backoff
      const delay =
        this.config.retryDelayMs *
        Math.pow(this.config.retryBackoffMultiplier, job.retryCount - 1);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Check if job was cancelled during wait
      if (this.cancelledJobs.has(job.id)) {
        return;
      }

      // Re-process job
      this.activeJobs.delete(job.id);
      this.processJob(job);
    } else {
      // Max retries reached or not retryable
      job.status = 'failed';
      job.completedAt = Date.now();

      this.activeJobs.delete(job.id);
      this.failedJobs.set(job.id, job);

      // Update stats
      this.stats.failedCount++;

      // Reject promise
      const resolver = this.jobResolvers.get(job.id);
      if (resolver) {
        resolver.reject(error);
        this.jobResolvers.delete(job.id);
      }

      this.emit('onJobFailed', job, error);
    }
  }

  /**
   * Handle job timeout
   */
  private handleJobTimeout(jobId: string): void {
    const activeJob = this.activeJobs.get(jobId);
    if (!activeJob) return;

    const timeoutError: AIError = {
      code: AIErrorCode.TIMEOUT,
      message: 'Job timed out',
      retryable: true,
    };

    this.handleJobFailure(activeJob, timeoutError);
  }

  /**
   * Insert job into queue by priority
   */
  private insertJobByPriority(job: AIJob): void {
    const jobPriority = PRIORITY_WEIGHTS[(job as any).priority || 'medium'];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const existingPriority = PRIORITY_WEIGHTS[
        (this.queue[i] as any).priority || 'medium'
      ];
      if (existingPriority < jobPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, job);
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(): boolean {
    const now = Date.now();

    // Reset counter if window has passed
    if (now >= this.rateLimitResetAt) {
      this.rateLimitCounter = 0;
      this.rateLimitResetAt = now + 60000; // 1 minute window
    }

    if (this.rateLimitCounter >= this.config.rateLimitPerMinute) {
      return false;
    }

    this.rateLimitCounter++;
    return true;
  }

  /**
   * Clear job timeout
   */
  private clearJobTimeout(jobId: string): void {
    const timeout = this.jobTimeouts.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.jobTimeouts.delete(jobId);
    }
  }

  /**
   * Create error object
   */
  private createError(
    code: AIErrorCode,
    message: string,
    retryable: boolean
  ): AIError {
    return {
      code,
      message,
      retryable,
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: keyof QueueListener, ...args: any[]): void {
    for (const listener of this.listeners) {
      const handler = listener[event];
      if (typeof handler === 'function') {
        try {
          (handler as any)(...args);
        } catch (error) {
          console.error(`Queue listener error for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Save queue state to storage
   */
  private saveToStorage(): void {
    try {
      const state = {
        queue: this.queue,
        activeJobs: Array.from(this.activeJobs.values()),
        completedJobs: Array.from(this.completedJobs.values()),
        failedJobs: Array.from(this.failedJobs.values()),
        timestamp: Date.now(),
      };

      localStorage.setItem(this.config.persistenceKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save queue state:', error);
    }
  }

  /**
   * Load queue state from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.persistenceKey);
      if (!stored) return;

      const state = JSON.parse(stored);

      // Restore queue (only queued jobs, not active)
      if (state.queue && Array.isArray(state.queue)) {
        this.queue = state.queue;
      }

      // Restore failed jobs for potential retry
      if (state.failedJobs && Array.isArray(state.failedJobs)) {
        for (const job of state.failedJobs) {
          if (job.retryCount < job.maxRetries) {
            this.queue.push(job);
          } else {
            this.failedJobs.set(job.id, job);
          }
        }
      }

      // Restore completed jobs
      if (state.completedJobs && Array.isArray(state.completedJobs)) {
        for (const job of state.completedJobs) {
          this.completedJobs.set(job.id, job);
        }
      }
    } catch (error) {
      console.error('Failed to load queue state:', error);
    }
  }

  /**
   * Clear storage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.config.persistenceKey);
    } catch (error) {
      console.error('Failed to clear queue state:', error);
    }
  }
}

export const aiJobQueue = new AIJobQueue();