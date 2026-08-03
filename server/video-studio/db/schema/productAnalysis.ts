import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const productVideoAnalysis = pgTable(
  'product_video_analysis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    vibe: varchar('vibe', { length: 50 }),
    targetAudience: varchar('target_audience', { length: 50 }),
    productType: varchar('product_type', { length: 50 }),
    category: varchar('category', { length: 100 }),
    recommendedStyles: jsonb('recommended_styles').$type<string[]>().default([]).notNull(),
    keywords: jsonb('keywords').$type<string[]>().default([]).notNull(),
    videoReadyScore: integer('video_ready_score').default(0).notNull(),
    luxuryScore: integer('luxury_score').default(0).notNull(),
    viralScore: integer('viral_score').default(0).notNull(),
    improvements: jsonb('improvements').$type<string[]>().default([]).notNull(),
    bestImageUrl: text('best_image_url'),
    dominantColors: jsonb('dominant_colors').$type<string[]>().default([]).notNull(),
    lighting: varchar('lighting', { length: 50 }),
    backgroundType: varchar('background_type', { length: 50 }),
    needsBackgroundRemoval: boolean('needs_background_removal').default(false).notNull(),
    needsEnhancement: boolean('needs_enhancement').default(false).notNull(),
    processedImages: jsonb('processed_images').$type<string[]>().default([]).notNull(),
    rawAnalysis: jsonb('raw_analysis').$type<Record<string, unknown>>().default({}).notNull(),
    analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
  },
  (table) => ({
    productWorkspaceIdx: uniqueIndex('idx_pva_product_workspace').on(
      table.productId,
      table.workspaceId
    ),
    productIdx: index('idx_pva_product').on(table.productId),
  })
);