/**
 * Projects Database Schema
 * Drizzle ORM schema for project management tables
 * Compatible with migration: 011_projects.sql
 */

import { randomUUID } from 'crypto';

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================
// PROJECTS TABLE
// ============================================

export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(),

    // Core info
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    type: text('type').default('design').notNull(),

    // Status
    status: text('status').default('draft').notNull(),
    visibility: text('visibility').default('private').notNull(),

    // Canvas
    canvasWidth: integer('canvas_width').default(1920).notNull(),
    canvasHeight: integer('canvas_height').default(1080).notNull(),

    // Cover
    coverImageUrl: text('cover_image_url'),
    thumbnailUrl: text('thumbnail_url'),

    // Brand
    brandKitId: text('brand_kit_id'),

    // Metadata
    metadata: jsonb('metadata').default({}),
    tags: jsonb('tags').default([]),

    // Flags
    isFavorite: boolean('is_favorite').default(false),
    isLocked: boolean('is_locked').default(false),
    isArchived: boolean('is_archived').default(false),
    isTrashed: boolean('is_trashed').default(false),
    isPublished: boolean('is_published').default(false),

    // Timestamps
    archivedAt: timestamp('archived_at'),
    trashedAt: timestamp('trashed_at'),
    publishedAt: timestamp('published_at'),
    lastOpenedAt: timestamp('last_opened_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    workspaceIdx: index('idx_projects_workspace_id').on(table.workspaceId),
    userIdx: index('idx_projects_user_id').on(table.userId),
    statusIdx: index('idx_projects_status').on(table.status),
    visibilityIdx: index('idx_projects_visibility').on(table.visibility),
    favoriteIdx: index('idx_projects_is_favorite').on(table.isFavorite),
    archivedIdx: index('idx_projects_is_archived').on(table.isArchived),
    trashedIdx: index('idx_projects_is_trashed').on(table.isTrashed),
    createdAtIdx: index('idx_projects_created_at').on(table.createdAt),
    updatedAtIdx: index('idx_projects_updated_at').on(table.updatedAt),
    deletedIdx: index('idx_projects_deleted_at').on(table.deletedAt),
    uniqueSlugWorkspace: uniqueIndex('unique_project_slug_workspace').on(
      table.workspaceId,
      table.slug
    ),
  })
);

// ============================================
// PROJECT PAGES TABLE
// ============================================

export const projectPages = pgTable(
  'project_pages',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    projectId: text('project_id').notNull(),

    // Page info
    name: text('name').notNull(),
    pageIndex: integer('page_index').default(0).notNull(),

    // Canvas data
    canvasData: jsonb('canvas_data').default({}),
    layersSnapshot: jsonb('layers_snapshot').default([]),

    // Thumbnail
    thumbnailUrl: text('thumbnail_url'),

    // Dimensions
    width: integer('width').default(1920).notNull(),
    height: integer('height').default(1080).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    projectIdx: index('idx_project_pages_project_id').on(table.projectId),
    pageIndexIdx: index('idx_project_pages_page_index').on(table.pageIndex),
    deletedIdx: index('idx_project_pages_deleted_at').on(table.deletedAt),
    uniqueProjectPage: uniqueIndex('unique_project_page_index').on(
      table.projectId,
      table.pageIndex
    ),
  })
);

// ============================================
// PROJECT VERSIONS TABLE
// ============================================

export const projectVersions = pgTable(
  'project_versions',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    projectId: text('project_id').notNull(),

    // Version info
    versionNumber: integer('version_number').notNull(),
    name: text('name'),
    description: text('description'),

    // Snapshot
    snapshot: jsonb('snapshot').default({}),
    layersSnapshot: jsonb('layers_snapshot').default([]),
    canvasData: jsonb('canvas_data').default({}),

    // Thumbnail
    thumbnailUrl: text('thumbnail_url'),

    // Metadata
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index('idx_project_versions_project_id').on(table.projectId),
    versionIdx: index('idx_project_versions_version_number').on(
      table.versionNumber
    ),
    uniqueProjectVersion: uniqueIndex('unique_project_version').on(
      table.projectId,
      table.versionNumber
    ),
  })
);

// ============================================
// PROJECT SHARES TABLE
// ============================================

export const projectShares = pgTable(
  'project_shares',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    projectId: text('project_id').notNull(),

    // Share info
    sharedBy: text('shared_by').notNull(),
    sharedWith: text('shared_with'),
    shareType: text('share_type').default('link').notNull(),
    permission: text('permission').default('view').notNull(),

    // Token for link sharing
    token: text('token'),
    expiresAt: timestamp('expires_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    projectIdx: index('idx_project_shares_project_id').on(table.projectId),
    sharedByIdx: index('idx_project_shares_shared_by').on(table.sharedBy),
    sharedWithIdx: index('idx_project_shares_shared_with').on(table.sharedWith),
    tokenIdx: index('idx_project_shares_token').on(table.token),
    deletedIdx: index('idx_project_shares_deleted_at').on(table.deletedAt),
  })
);

// ============================================
// PROJECT ACTIVITY LOG TABLE
// ============================================

export const projectActivityLogs = pgTable(
  'project_activity_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    projectId: text('project_id').notNull(),
    userId: text('user_id').notNull(),
    workspaceId: text('workspace_id').notNull(),

    // Activity info
    action: text('action').notNull(),
    details: jsonb('details'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index('idx_project_activity_project_id').on(table.projectId),
    userIdx: index('idx_project_activity_user_id').on(table.userId),
    workspaceIdx: index('idx_project_activity_workspace_id').on(
      table.workspaceId
    ),
    createdAtIdx: index('idx_project_activity_created_at').on(table.createdAt),
  })
);

// ============================================
// TYPE EXPORTS
// ============================================

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectPage = typeof projectPages.$inferSelect;
export type NewProjectPage = typeof projectPages.$inferInsert;

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type NewProjectVersion = typeof projectVersions.$inferInsert;

export type ProjectShare = typeof projectShares.$inferSelect;
export type NewProjectShare = typeof projectShares.$inferInsert;

export type ProjectActivityLog = typeof projectActivityLogs.$inferSelect;
export type NewProjectActivityLog = typeof projectActivityLogs.$inferInsert;