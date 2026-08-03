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
} from 'drizzle-orm/pg-core';

export const videoHistory = pgTable(
  'video_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id'),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    productId: uuid('product_id'),
    templateId: uuid('template_id'),
    videoUrl: text('video_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    title: varchar('title', { length: 200 }),
    description: text('description'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    platform: varchar('platform', { length: 50 }),
    provider: varchar('provider', { length: 50 }),
    estimatedCost: decimal('estimated_cost', { precision: 10, scale: 4 }),
    isFavorite: boolean('is_favorite').default(false).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_vh_user').on(table.userId),
    workspaceIdx: index('idx_vh_workspace').on(table.workspaceId),
    jobIdx: index('idx_vh_job').on(table.jobId),
    favoriteIdx: index('idx_vh_favorite').on(table.isFavorite),
  })
);