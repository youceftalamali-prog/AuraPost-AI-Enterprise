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
import { relations } from 'drizzle-orm';

export const videoTemplates = pgTable(
  'video_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: varchar('category', { length: 100 }).notNull(),
    subcategory: varchar('subcategory', { length: 100 }),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    style: varchar('style', { length: 100 }),
    platform: varchar('platform', { length: 50 }),
    difficulty: varchar('difficulty', { length: 20 }).default('Medium').notNull(),
    popularity: integer('popularity').default(0).notNull(),
    thumbnailUrl: text('thumbnail_url'),
    previewUrl: text('preview_url'),
    basePromptTemplate: text('base_prompt_template').notNull(),
    supportedModels: jsonb('supported_models').$type<string[]>().default([]).notNull(),
    estimatedDuration: integer('estimated_duration').default(10).notNull(),
    estimatedCost: decimal('estimated_cost', { precision: 10, scale: 4 }).default('0.05').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('idx_vt_category').on(table.category),
    popularityIdx: index('idx_vt_popularity').on(table.popularity),
    activeIdx: index('idx_vt_active').on(table.isActive),
  })
);

export const favoriteTemplates = pgTable(
  'favorite_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => videoTemplates.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userTemplateIdx: uniqueIndex('idx_ft_user_template').on(table.userId, table.templateId),
    userIdx: index('idx_ft_user').on(table.userId),
  })
);

export const videoTemplatesRelations = relations(videoTemplates, ({ many }) => ({
  favorites: many(favoriteTemplates),
}));

export const favoriteTemplatesRelations = relations(favoriteTemplates, ({ one }) => ({
  template: one(videoTemplates, {
    fields: [favoriteTemplates.templateId],
    references: [videoTemplates.id],
  }),
}));