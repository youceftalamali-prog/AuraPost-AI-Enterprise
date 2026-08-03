/**
 * Asset Types
 * Core type definitions for asset management
 * Phase: 5.3 Part 5
 */

// ============================================
// ASSET TYPE & STATUS
// ============================================

export type AssetType =
  | 'image'
  | 'video'
  | 'svg'
  | 'icon'
  | 'font'
  | 'audio'
  | 'pdf'
  | 'document'
  | 'template'
  | 'ai_generated'
  | 'background'
  | 'texture'
  | 'logo'
  | 'mockup'
  | 'product_image'
  | 'export'
  | 'upload'
  | 'stock';

export type AssetStatus =
  | 'active'
  | 'archived'
  | 'trashed'
  | 'processing'
  | 'failed';

export type AssetPermissionLevel =
  | 'private'
  | 'workspace'
  | 'public';

// ============================================
// ASSET
// ============================================

export interface Asset {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string | null;

  // Core metadata
  name: string;
  description: string | null;
  type: AssetType;
  mimeType: string;
  fileSize: number;

  // File info
  originalName: string | null;
  fileExtension: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;

  // URLs
  originalUrl: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  signedUrl: string | null;
  cdnUrl: string | null;

  // AI Generation metadata
  generationPrompt: string | null;
  negativePrompt: string | null;
  aiModel: string | null;
  seed: number | null;
  provider: string | null;

  // Colors
  dominantColor: string | null;
  colorPalette: string[] | null;

  // EXIF & Technical
  exifData: Record<string, any> | null;
  metadata: Record<string, any>;

  // Organization
  folderId: string | null;
  collectionIds: string[];
  tags: string[];
  keywords: string[];

  // Status & Permissions
  status: AssetStatus;
  permissionLevel: AssetPermissionLevel;
  isFavorite: boolean;
  isPinned: boolean;

  // Usage tracking
  usageCount: number;
  lastUsedAt: Date | null;
  viewsCount: number;
  downloadsCount: number;

  // Source info
  source: string | null;
  creator: string | null;
  license: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  archivedAt: Date | null;
}

export interface AssetInsert {
  workspaceId: string;
  userId: string;
  projectId?: string | null;
  name: string;
  description?: string | null;
  type: AssetType;
  mimeType: string;
  fileSize: number;
  originalName?: string | null;
  fileExtension?: string | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  originalUrl: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  signedUrl?: string | null;
  cdnUrl?: string | null;
  generationPrompt?: string | null;
  negativePrompt?: string | null;
  aiModel?: string | null;
  seed?: number | null;
  provider?: string | null;
  dominantColor?: string | null;
  colorPalette?: string[] | null;
  exifData?: Record<string, any> | null;
  metadata?: Record<string, any>;
  folderId?: string | null;
  collectionIds?: string[];
  tags?: string[];
  keywords?: string[];
  status?: AssetStatus;
  permissionLevel?: AssetPermissionLevel;
  isFavorite?: boolean;
  isPinned?: boolean;
  source?: string | null;
  creator?: string | null;
  license?: string | null;
}

export interface AssetUpdate {
  name?: string;
  description?: string | null;
  projectId?: string | null;
  folderId?: string | null;
  collectionIds?: string[];
  tags?: string[];
  keywords?: string[];
  status?: AssetStatus;
  permissionLevel?: AssetPermissionLevel;
  isFavorite?: boolean;
  isPinned?: boolean;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  dominantColor?: string | null;
  colorPalette?: string[] | null;
  metadata?: Record<string, any>;
  // Added for version-restore (AssetVersionService.restoreVersion): restoring
  // a prior version needs to overwrite the asset's current file pointer and
  // size, which this type didn't previously support.
  originalUrl?: string;
  fileSize?: number;
}

export interface AssetSelect {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  type: AssetType;
  mimeType: string;
  fileSize: number;
  originalName: string | null;
  fileExtension: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  originalUrl: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  signedUrl: string | null;
  cdnUrl: string | null;
  generationPrompt: string | null;
  negativePrompt: string | null;
  aiModel: string | null;
  seed: number | null;
  provider: string | null;
  dominantColor: string | null;
  colorPalette: string[] | null;
  exifData: Record<string, any> | null;
  metadata: Record<string, any>;
  folderId: string | null;
  collectionIds: string[];
  tags: string[];
  keywords: string[];
  status: AssetStatus;
  permissionLevel: AssetPermissionLevel;
  isFavorite: boolean;
  isPinned: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  viewsCount: number;
  downloadsCount: number;
  source: string | null;
  creator: string | null;
  license: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  archivedAt: Date | null;
}

// ============================================
// ASSET FOLDER
// ============================================

export interface AssetFolder {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AssetFolderInsert {
  workspaceId: string;
  userId: string;
  name: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  isSystem?: boolean;
}

export interface AssetFolderUpdate {
  name?: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  parentId?: string | null;
}

// ============================================
// ASSET COLLECTION
// ============================================

export interface AssetCollection {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  description: string | null;
  coverAssetId: string | null;
  isSmart: boolean;
  smartQuery: Record<string, any> | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AssetCollectionInsert {
  workspaceId: string;
  userId: string;
  name: string;
  description?: string | null;
  coverAssetId?: string | null;
  isSmart?: boolean;
  smartQuery?: Record<string, any> | null;
  isPublic?: boolean;
}

export interface AssetCollectionUpdate {
  name?: string;
  description?: string | null;
  coverAssetId?: string | null;
  smartQuery?: Record<string, any> | null;
  isPublic?: boolean;
}

// ============================================
// ASSET TAG
// ============================================

export interface AssetTag {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetTagInsert {
  workspaceId: string;
  name: string;
  color?: string | null;
}

// ============================================
// ASSET VERSION
// ============================================

export interface AssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  fileUrl: string;
  fileSize: number;
  metadata: Record<string, any> | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface AssetVersionInsert {
  assetId: string;
  versionNumber: number;
  fileUrl: string;
  fileSize: number;
  metadata?: Record<string, any> | null;
  notes?: string | null;
  createdBy: string;
}

// ============================================
// ASSET USAGE
// ============================================

export interface AssetUsage {
  id: string;
  assetId: string;
  projectId: string | null;
  pageId: string | null;
  layerId: string | null;
  usedBy: string;
  usedAt: Date;
}

export interface AssetUsageInsert {
  assetId: string;
  projectId?: string | null;
  pageId?: string | null;
  layerId?: string | null;
  usedBy: string;
}

// ============================================
// ASSET AUDIT LOG
// ============================================

export interface AssetAuditLog {
  id: string;
  assetId: string;
  userId: string;
  workspaceId: string;
  action: string;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AssetAuditLogInsert {
  assetId: string;
  userId: string;
  workspaceId: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ============================================
// ASSET FILTERS & PAGINATION
// ============================================

export interface AssetFilters {
  workspaceId: string;
  type?: AssetType | AssetType[];
  status?: AssetStatus;
  folderId?: string | null;
  collectionId?: string;
  tags?: string[];
  keywords?: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
  projectId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  fileSizeMin?: number;
  fileSizeMax?: number;
  widthMin?: number;
  widthMax?: number;
  heightMin?: number;
  heightMax?: number;
  dominantColor?: string;
  search?: string;
  mimeType?: string;
  aiGenerated?: boolean;
}

export interface AssetPagination {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'fileSize' | 'usageCount';
  sortDirection?: 'asc' | 'desc';
}

export interface AssetQueryResult {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// ASSET STATISTICS
// ============================================

export interface AssetStatistics {
  assetId: string;
  usageCount: number;
  viewsCount: number;
  downloadsCount: number;
  lastUsedAt: Date | null;
  projectsUsing: number;
  pagesUsing: number;
  layersUsing: number;
}

export interface WorkspaceAssetStats {
  workspaceId: string;
  totalAssets: number;
  totalSizeBytes: number;
  imageCount: number;
  videoCount: number;
  aiGeneratedCount: number;
  favoriteCount: number;
  pinnedCount: number;
  folderCount: number;
  collectionCount: number;
}

// ============================================
// ASSET UPLOAD
// ============================================

export interface AssetUploadRequest {
  workspaceId: string;
  userId: string;
  projectId?: string;
  folderId?: string;
  name: string;
  description?: string;
  type?: AssetType;
  tags?: string[];
  keywords?: string[];
  collectionIds?: string[];
  permissionLevel?: AssetPermissionLevel;
  metadata?: Record<string, any>;
}

export interface AssetUploadProgress {
  assetId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message?: string;
  fileSize?: number;
  uploadedBytes?: number;
}

export interface AssetUploadResult {
  asset: Asset;
  thumbnailUrl?: string;
  previewUrl?: string;
  processingTimeMs: number;
}

// ============================================
// ASSET BULK ACTIONS
// ============================================

export type AssetBulkAction =
  | 'delete'
  | 'archive'
  | 'restore'
  | 'favorite'
  | 'unfavorite'
  | 'pin'
  | 'unpin'
  | 'tag'
  | 'move'
  | 'download'
  | 'export';

export interface AssetBulkActionRequest {
  assetIds: string[];
  action: AssetBulkAction;
  data?: {
    tags?: string[];
    folderId?: string;
    format?: string;
    quality?: number;
  };
}

export interface AssetBulkActionResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    assetId: string;
    error: string;
  }>;
}

// ============================================
// ASSET DUPLICATE DETECTION
// ============================================

export interface AssetDuplicate {
  asset1: Asset;
  asset2: Asset;
  similarity: number;
  matchType: 'exact' | 'similar' | 'same-hash';
}

export interface DuplicateDetectionResult {
  duplicates: AssetDuplicate[];
  totalDuplicates: number;
  potentialSpaceSaved: number;
}

// ============================================
// ASSET EXPORT OPTIONS
// ============================================

export interface AssetExportOptions {
  format: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'original';
  quality?: number;
  scale?: number;
  width?: number;
  height?: number;
  transparent?: boolean;
  includeMetadata?: boolean;
}

// ============================================
// ASSET THUMBNAIL
// ============================================

export interface ThumbnailConfig {
  width: number;
  height: number;
  quality: number;
  format: 'jpg' | 'png' | 'webp';
  fit: 'cover' | 'contain' | 'fill';
}

export const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  width: 256,
  height: 256,
  quality: 85,
  format: 'jpg',
  fit: 'cover',
};

// ============================================
// ASSET METADATA EXTRACTION
// ============================================

export interface ExtractedMetadata {
  width?: number;
  height?: number;
  aspectRatio?: number;
  fileSize?: number;
  mimeType?: string;
  dominantColor?: string;
  colorPalette?: string[];
  exifData?: Record<string, any>;
  aiMetadata?: {
    prompt?: string;
    negativePrompt?: string;
    model?: string;
    seed?: number;
    provider?: string;
  };
}