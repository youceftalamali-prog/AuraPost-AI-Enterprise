import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const brandProfiles = pgTable(
  'brand_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    logoUrl: text('logo_url'),
    colors: jsonb('colors').$type<string[]>().default([]).notNull(),
    fonts: jsonb('fonts').$type<string[]>().default([]).notNull(),
    tone: varchar('tone', { length: 100 }),
    voice: varchar('voice', { length: 100 }),
    personality: jsonb('personality').$type<string[]>().default([]).notNull(),
    values: jsonb('values').$type<string[]>().default([]).notNull(),
    luxuryLevel: integer('luxury_level').default(50).notNull(),
    visualIdentity: varchar('visual_identity', { length: 100 }),
    writingStyle: varchar('writing_style', { length: 100 }),
    ctaStyle: varchar('cta_style', { length: 100 }),
    description: text('description'),
    website: text('website'),
    analysis: jsonb('analysis').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_bp_workspace').on(table.workspaceId),
  })
);

export const audienceProfiles = pgTable(
  'audience_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    ageGroup: varchar('age_group', { length: 50 }).notNull(),
    gender: varchar('gender', { length: 50 }).notNull(),
    interests: jsonb('interests').$type<string[]>().default([]).notNull(),
    buyingIntent: varchar('buying_intent', { length: 50 }).default('Medium').notNull(),
    incomeLevel: varchar('income_level', { length: 50 }).default('Mixed').notNull(),
    lifestyle: jsonb('lifestyle').$type<string[]>().default([]).notNull(),
    location: jsonb('location').$type<string[]>().default([]).notNull(),
    language: varchar('language', { length: 20 }),
    analysis: jsonb('analysis').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_ap_workspace').on(table.workspaceId),
  })
);

export const campaignProfiles = pgTable(
  'campaign_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    productId: uuid('product_id'),
    brandId: uuid('brand_id'),
    audienceId: uuid('audience_id'),
    goal: varchar('goal', { length: 50 }).default('Conversion').notNull(),
    platforms: jsonb('platforms').$type<string[]>().default([]).notNull(),
    status: varchar('status', { length: 50 }).default('Draft').notNull(),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_cp_workspace').on(table.workspaceId),
    statusIdx: index('idx_cp_status').on(table.status),
  })
);

export const campaignGenerations = pgTable(
  'campaign_generations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaignProfiles.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    platform: varchar('platform', { length: 50 }).notNull(),
    videoConcept: text('video_concept').notNull(),
    caption: text('caption').notNull(),
    hook: text('hook').notNull(),
    cta: text('cta').notNull(),
    hashtags: jsonb('hashtags').$type<string[]>().default([]).notNull(),
    thumbnailIdea: text('thumbnail_idea'),
    publishingStrategy: jsonb('publishing_strategy')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    prompt: text('prompt').notNull(),
    negativePrompt: text('negative_prompt'),
    templateId: uuid('template_id'),
    estimatedCost: decimal('estimated_cost', { precision: 10, scale: 4 }),
    estimatedDuration: integer('estimated_duration'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    campaignIdx: index('idx_cg_campaign').on(table.campaignId),
    workspaceIdx: index('idx_cg_workspace').on(table.workspaceId),
    platformIdx: index('idx_cg_platform').on(table.platform),
  })
);

// decimal import for campaignGenerations.estimatedCost
import { decimal } from 'drizzle-orm/pg-core';

export const campaignProfilesRelations = relations(campaignProfiles, ({ many }) => ({
  generations: many(campaignGenerations),
}));

export const campaignGenerationsRelations = relations(campaignGenerations, ({ one }) => ({
  campaign: one(campaignProfiles, {
    fields: [campaignGenerations.campaignId],
    references: [campaignProfiles.id],
  }),
}));