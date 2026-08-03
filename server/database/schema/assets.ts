/**
 * Assets Database Schema
 * Drizzle ORM schema for asset management tables
 * Compatible with migration: 010_assets.sql
 */

import { randomUUID } from 'crypto';

import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

// ============================================
// ASSET FOLDERS TABLE
// ============================================

export const assetFolders = pgTable(
  'asset_folders',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    color: text('color'),
    icon: text('icon'),
    description: text('description'),
    isSystem: boolean('is_system').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    workspaceIdx: index('idx_asset_folders_workspace').on(table.workspaceId),
    parentIdx: index('idx_asset_folders_parent').on(table.parentId),
    deletedIdx: index('idx_asset_folders_deleted').on(table.deletedAt),
    uniqueNameParent: uniqueIndex('unique_folder_name_parent').on(
      table.workspaceId,
      table.parentId,
      table.name
    ),
  })
);

// ============================================
// ASSETS TABLE
// ============================================

export const assets = pgTable(
  'assets',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(),
    projectId: text('project_id'),

    // Core metadata
    name: text('name').notNull(),
    description: text('description'),
    type: text('type').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),

    // File info
    originalName: text('original_name'),
    fileExtension: text('file_extension'),
    width: integer('width'),
    height: integer('height'),
    aspectRatio: integer('aspect_ratio'),

    // URLs
    originalUrl: text('original_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    previewUrl: text('preview_url'),
    signedUrl: text('signed_url'),
    cdnUrl: text('cdn_url'),

    // AI Generation metadata
    generationPrompt: text('generation_prompt'),
    negativePrompt: text('negative_prompt'),
    aiModel: text('ai_model'),
    seed: bigint('seed', { mode: 'number' }),
    provider: text('provider'),

    // Colors
    dominantColor: text('dominant_color'),
    colorPalette: jsonb('color_palette'),

    // EXIF & Technical
    exifData: jsonb('exif_data'),
    metadata: jsonb('metadata'),

    // Organization
    folderId: text('folder_id'),
    collectionIds: jsonb('collection_ids').default([]),
    tags: jsonb('tags').default([]),
    keywords: jsonb('keywords').default([]),

    // Status & Permissions
    status: text('status').default('active').notNull(),
    permissionLevel: text('permission_level')
      .default('workspace')
      .notNull(),
    isFavorite: boolean('is_favorite').default(false),
    isPinned: boolean('is_pinned').default(false),

    // Usage tracking
    usageCount: integer('usage_count').default(0),
    lastUsedAt: timestamp('last_used_at'),
    viewsCount: integer('views_count').default(0),
    downloadsCount: integer('downloads_count').default(0),

    // Source info
    source: text('source'),
    creator: text('creator'),
    license: text('license'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
    archivedAt: timestamp('archived_at'),
  },
  (table) => ({
    workspaceIdx: index('idx_assets_workspace_id').on(table.workspaceId),
    userIdx: index('idx_assets_user_id').on(table.userId),
    projectIdx: index('idx_assets_project_id').on(table.projectId),
    folderIdx: index('idx_assets_folder_id').on(table.folderId),
    typeIdx: index('idx_assets_type').on(table.type),
    statusIdx: index('idx_assets_status').on(table.status),
    permissionIdx: index('idx_assets_permission').on(table.permissionLevel),
    favoriteIdx: index('idx_assets_favorite').on(table.isFavorite),
    pinnedIdx: index('idx_assets_pinned').on(table.isPinned),
    createdAtIdx: index('idx_assets_created_at').on(table.createdAt),
    deletedIdx: index('idx_assets_deleted_at').on(table.deletedAt),
  })
);

// ============================================
// ASSET COLLECTIONS TABLE
// ============================================

export const assetCollections = pgTable(
  'asset_collections',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    coverAssetId: text('cover_asset_id'),
    isSmart: boolean('is_smart').default(false),
    smartQuery: jsonb('smart_query'),
    isPublic: boolean('is_public').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    workspaceIdx: index('idx_asset_collections_workspace').on(table.workspaceId),
    publicIdx: index('idx_asset_collections_public').on(table.isPublic),
    deletedIdx: index('idx_asset_collections_deleted').on(table.deletedAt),
    uniqueNameWorkspace: uniqueIndex('unique_collection_name_workspace').on(
      table.workspaceId,
      table.name
    ),
  })
);

// ============================================
// ASSET TAGS TABLE
// ============================================

export const assetTags = pgTable(
  'asset_tags',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    workspaceId: text('workspace_id').notNull(),
    name: text('name').notNull(),
    color: text('color'),
    usageCount: integer('usage_count').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_asset_tags_workspace').on(table.workspaceId),
    nameIdx: index('idx_asset_tags_name').on(table.name),
    uniqueNameWorkspace: uniqueIndex('unique_tag_name_workspace').on(
      table.workspaceId,
      table.name
    ),
  })
);

// ============================================
// ASSET VERSIONS TABLE
// ============================================

export const assetVersions = pgTable(
  'asset_versions',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    assetId: text('asset_id').notNull(),
    versionNumber: integer('version_number').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    metadata: jsonb('metadata'),
    notes: text('notes'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    assetIdx: index('idx_asset_versions_asset').on(table.assetId),
    versionIdx: index('idx_asset_versions_version').on(table.versionNumber),
    uniqueAssetVersion: uniqueIndex('unique_asset_version').on(
      table.assetId,
      table.versionNumber
    ),
  })
);

// ============================================
// ASSET USAGE TABLE
// ============================================

export const assetUsage = pgTable(
  'asset_usage',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    assetId: text('asset_id').notNull(),
    projectId: text('project_id'),
    pageId: text('page_id'),
    layerId: text('layer_id'),
    usedBy: text('used_by').notNull(),
    usedAt: timestamp('used_at').defaultNow().notNull(),
  },
  (table) => ({
    assetIdx: index('idx_asset_usage_asset').on(table.assetId),
    projectIdx: index('idx_asset_usage_project').on(table.projectId),
    usedAtIdx: index('idx_asset_usage_used_at').on(table.usedAt),
  })
);

// ============================================
// ASSET FAVORITES TABLE
// ============================================

export const assetFavorites = pgTable(
  'asset_favorites',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    assetId: text('asset_id').notNull(),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_asset_favorites_user').on(table.userId),
    assetIdx: index('idx_asset_favorites_asset').on(table.assetId),
    uniqueAssetUser: uniqueIndex('unique_asset_user_favorite').on(
      table.assetId,
      table.userId
    ),
  })
);

// ============================================
// ASSET AUDIT LOGS TABLE
// ============================================

export const assetAuditLogs = pgTable(
  'asset_audit_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    assetId: text('asset_id').notNull(),
    userId: text('user_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    action: text('action').notNull(),
    details: jsonb('details'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    assetIdx: index('idx_asset_audit_asset').on(table.assetId),
    workspaceIdx: index('idx_asset_audit_workspace').on(table.workspaceId),
    createdAtIdx: index('idx_asset_audit_created').on(table.createdAt),
  })
);

// ============================================
// TYPE EXPORTS
// ============================================

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type AssetFolder = typeof assetFolders.$inferSelect;
export type NewAssetFolder = typeof assetFolders.$inferInsert;

export type AssetCollection = typeof assetCollections.$inferSelect;
export type NewAssetCollection = typeof assetCollections.$inferInsert;

export type AssetTag = typeof assetTags.$inferSelect;
export type NewAssetTag = typeof assetTags.$inferInsert;

export type AssetVersion = typeof assetVersions.$inferSelect;
export type NewAssetVersion = typeof assetVersions.$inferInsert;

export type AssetUsageRecord = typeof assetUsage.$inferSelect;
export type NewAssetUsage = typeof assetUsage.$inferInsert;

export type AssetFavorite = typeof assetFavorites.$inferSelect;
export type NewAssetFavorite = typeof assetFavorites.$inferInsert;

export type AssetAuditLog = typeof assetAuditLogs.$inferSelect;
export type NewAssetAuditLog = typeof assetAuditLogs.$inferInsert;