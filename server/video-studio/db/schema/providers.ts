import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const videoProviders = pgTable(
  'video_providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    tier: varchar('tier', { length: 50 }).default('Standard').notNull(),
    baseUrl: text('base_url').notNull(),
    apiKeyEnvVar: varchar('api_key_env_var', { length: 100 }).notNull(),
    supportedModels: jsonb('supported_models').$type<string[]>().default([]).notNull(),
    defaultModel: varchar('default_model', { length: 100 }).notNull(),
    maxDuration: integer('max_duration').default(60).notNull(),
    supportedAspectRatios: jsonb('supported_aspect_ratios').$type<string[]>().default([]).notNull(),
    supportedResolutions: jsonb('supported_resolutions').$type<string[]>().default([]).notNull(),
    pricing: jsonb('pricing').$type<Record<string, unknown>>().default({}).notNull(),
    rateLimits: jsonb('rate_limits').$type<Record<string, unknown>>().default({}).notNull(),
    features: jsonb('features').$type<Record<string, unknown>>().default({}).notNull(),
    priority: integer('priority').default(50).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('idx_vp_name').on(table.name),
    activeIdx: index('idx_vp_active').on(table.isActive),
    priorityIdx: index('idx_vp_priority').on(table.priority),
  })
);

export const providerStatistics = pgTable(
  'provider_statistics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 50 }).notNull(),
    workspaceId: uuid('workspace_id'),
    period: varchar('period', { length: 20 }).default('all').notNull(),
    totalJobs: integer('total_jobs').default(0).notNull(),
    successfulJobs: integer('successful_jobs').default(0).notNull(),
    failedJobs: integer('failed_jobs').default(0).notNull(),
    cancelledJobs: integer('cancelled_jobs').default(0).notNull(),
    successRate: decimal('success_rate', { precision: 5, scale: 2 }).default('0').notNull(),
    averageGenerationTime: integer('average_generation_time').default(0).notNull(),
    averageCost: decimal('average_cost', { precision: 10, scale: 4 }).default('0').notNull(),
    totalCost: decimal('total_cost', { precision: 12, scale: 4 }).default('0').notNull(),
    totalDuration: integer('total_duration').default(0).notNull(),
    lastResponseTime: integer('last_response_time').default(0).notNull(),
    lastJobAt: timestamp('last_job_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    providerIdx: index('idx_ps_provider').on(table.provider),
    workspaceIdx: index('idx_ps_workspace').on(table.workspaceId),
    providerPeriodIdx: uniqueIndex('idx_ps_provider_period').on(table.provider, table.period),
  })
);

export const providerHealth = pgTable(
  'provider_health',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).default('Available').notNull(),
    availability: decimal('availability', { precision: 5, scale: 2 }).default('100').notNull(),
    averageResponseTime: integer('average_response_time').default(0).notNull(),
    successRate: decimal('success_rate', { precision: 5, scale: 2 }).default('100').notNull(),
    failureRate: decimal('failure_rate', { precision: 5, scale: 2 }).default('0').notNull(),
    currentQueueSize: integer('current_queue_size').default(0).notNull(),
    lastChecked: timestamp('last_checked').defaultNow().notNull(),
    lastSuccess: timestamp('last_success'),
    lastFailure: timestamp('last_failure'),
    consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
    uptime: decimal('uptime', { precision: 5, scale: 2 }).default('100').notNull(),
  },
  (table) => ({
    providerIdx: uniqueIndex('idx_ph_provider').on(table.provider),
    statusIdx: index('idx_ph_status').on(table.status),
  })
);

export const providerJobs = pgTable(
  'provider_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 50 }).notNull(),
    externalJobId: varchar('external_job_id', { length: 255 }),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id').notNull(),
    productId: uuid('product_id'),
    templateId: uuid('template_id'),
    prompt: text('prompt').notNull(),
    negativePrompt: text('negative_prompt'),
    model: varchar('model', { length: 100 }).notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
    status: varchar('status', { length: 50 }).default('Queued').notNull(),
    progress: integer('progress').default(0).notNull(),
    resultUrl: text('result_url'),
    thumbnailUrl: text('thumbnail_url'),
    duration: integer('duration'),
    resolution: varchar('resolution', { length: 20 }),
    aspectRatio: varchar('aspect_ratio', { length: 10 }),
    cacheHash: varchar('cache_hash', { length: 64 }),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0).notNull(),
    priority: integer('priority').default(0).notNull(),
    estimatedCost: decimal('estimated_cost', { precision: 10, scale: 4 }),
    actualCost: decimal('actual_cost', { precision: 10, scale: 4 }),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    providerIdx: index('idx_pj_provider').on(table.provider),
    workspaceIdx: index('idx_pj_workspace').on(table.workspaceId),
    userIdx: index('idx_pj_user').on(table.userId),
    statusIdx: index('idx_pj_status').on(table.status),
    externalJobIdx: index('idx_pj_external_job').on(table.externalJobId),
    cacheHashIdx: index('idx_pj_cache_hash').on(table.cacheHash),
    createdAtIdx: index('idx_pj_created_at').on(table.createdAt),
  })
);

export const providerCosts = pgTable(
  'provider_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    workspaceId: uuid('workspace_id'),
    jobId: uuid('job_id'),
    estimatedCost: decimal('estimated_cost', { precision: 10, scale: 4 }).notNull(),
    actualCost: decimal('actual_cost', { precision: 10, scale: 4 }),
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    duration: integer('duration'),
    resolution: varchar('resolution', { length: 20 }),
    quality: varchar('quality', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    providerIdx: index('idx_pc_provider').on(table.provider),
    workspaceIdx: index('idx_pc_workspace').on(table.workspaceId),
    jobIdx: index('idx_pc_job').on(table.jobId),
    createdAtIdx: index('idx_pc_created_at').on(table.createdAt),
  })
);

export const providerSettings = pgTable(
  'provider_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    autoRouting: boolean('auto_routing').default(true).notNull(),
    defaultProvider: varchar('default_provider', { length: 50 }).default('HuggingFace').notNull(),
    fallbackEnabled: boolean('fallback_enabled').default(true).notNull(),
    fallbackChain: jsonb('fallback_chain').$type<string[]>().default([]).notNull(),
    maxCostPerVideo: decimal('max_cost_per_video', { precision: 10, scale: 4 }).default('1.00').notNull(),
    preferredQuality: varchar('preferred_quality', { length: 20 }).default('High').notNull(),
    apiKeys: jsonb('api_keys').$type<Record<string, string>>().default({}).notNull(),
    customPriorities: jsonb('custom_priorities').$type<Record<string, number>>().default({}).notNull(),
    excludedProviders: jsonb('excluded_providers').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: uniqueIndex('idx_pset_workspace').on(table.workspaceId),
  })
);