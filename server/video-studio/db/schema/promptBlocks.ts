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

export const promptBlocks = pgTable(
  'prompt_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    description: text('description'),
    promptFragment: text('prompt_fragment').notNull(),
    negativeFragment: text('negative_fragment'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    popularity: integer('popularity').default(0).notNull(),
    costMultiplier: decimal('cost_multiplier', { precision: 5, scale: 2 }).default('1.00').notNull(),
    qualityImpact: decimal('quality_impact', { precision: 3, scale: 2 }).default('0.00').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('idx_pb_category').on(table.category),
    nameIdx: index('idx_pb_name').on(table.name),
    activeIdx: index('idx_pb_active').on(table.isActive),
  })
);