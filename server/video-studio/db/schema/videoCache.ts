import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  decimal,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const videoCache = pgTable(
  'video_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cacheHash: varchar('cache_hash', { length: 64 }).notNull(),
    prompt: text('prompt').notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
    videoUrl: text('video_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    provider: varchar('provider', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    duration: integer('duration'),
    resolution: varchar('resolution', { length: 20 }),
    cost: decimal('cost', { precision: 10, scale: 4 }).default('0').notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    hashIdx: uniqueIndex('idx_vc_hash').on(table.cacheHash),
    expiresIdx: index('idx_vc_expires').on(table.expiresAt),
    providerIdx: index('idx_vc_provider').on(table.provider),
  })
);