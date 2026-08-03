/**
 * Project Types
 * Core type definitions for project management
 * Phase: 5.3 Part 5
 */

// ============================================
// PROJECT STATUS & VISIBILITY
// ============================================

export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'published'
  | 'archived'
  | 'trashed';

export type ProjectVisibility =
  | 'private'
  | 'workspace'
  | 'public';

export type ProjectType =
  | 'design'
  | 'template'
  | 'brand'
  | 'social'
  | 'print'
  | 'video';

// ============================================
// PROJECT
// ============================================

export interface Project {
  id: string;
  workspaceId: string;
  userId: string;

  // Core info
  name: string;
  slug: string;
  description: string | null;
  type: ProjectType;

  // Status
  status: ProjectStatus;
  visibility: ProjectVisibility;

  // Canvas
  canvasWidth: number;
  canvasHeight: number;

  // Cover
  coverImageUrl: string | null;
  thumbnailUrl: string | null;

  // Brand
  brandKitId: string | null;

  // Metadata
  metadata: Record<string, any>;
  tags: string[];

  // Flags
  isFavorite: boolean;
  isLocked: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isPublished: boolean;

  // Timestamps
  archivedAt: Date | null;
  trashedAt: Date | null;
  publishedAt: Date | null;
  lastOpenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProjectInsert {
  workspaceId: string;
  userId: string;
  name: string;
  slug?: string;
  description?: string | null;
  type?: ProjectType;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  canvasWidth?: number;
  canvasHeight?: number;
  coverImageUrl?: string | null;
  brandKitId?: string | null;
  metadata?: Record<string, any>;
  tags?: string[];
  isFavorite?: boolean;
}

export interface ProjectUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  type?: ProjectType;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  canvasWidth?: number;
  canvasHeight?: number;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  brandKitId?: string | null;
  metadata?: Record<string, any>;
  tags?: string[];
  isFavorite?: boolean;
  isLocked?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  isPublished?: boolean;
  lastOpenedAt?: Date;
}

export interface ProjectSelect {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  canvasWidth: number;
  canvasHeight: number;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  brandKitId: string | null;
  metadata: Record<string, any>;
  tags: string[];
  isFavorite: boolean;
  isLocked: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isPublished: boolean;
  archivedAt: Date | null;
  trashedAt: Date | null;
  publishedAt: Date | null;
  lastOpenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ============================================
// PROJECT PAGE
// ============================================

export interface ProjectPage {
  id: string;
  projectId: string;
  name: string;
  pageIndex: number;
  canvasData: Record<string, any>;
  layersSnapshot: any[];
  thumbnailUrl: string | null;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProjectPageInsert {
  projectId: string;
  name: string;
  pageIndex?: number;
  canvasData?: Record<string, any>;
  layersSnapshot?: any[];
  thumbnailUrl?: string | null;
  width?: number;
  height?: number;
}

export interface ProjectPageUpdate {
  name?: string;
  pageIndex?: number;
  canvasData?: Record<string, any>;
  layersSnapshot?: any[];
  thumbnailUrl?: string | null;
  width?: number;
  height?: number;
}

// ============================================
// PROJECT VERSION
// ============================================

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  name: string | null;
  description: string | null;
  snapshot: Record<string, any>;
  layersSnapshot: any[];
  canvasData: Record<string, any>;
  thumbnailUrl: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface ProjectVersionInsert {
  projectId: string;
  versionNumber: number;
  name?: string | null;
  description?: string | null;
  snapshot?: Record<string, any>;
  layersSnapshot?: any[];
  canvasData?: Record<string, any>;
  thumbnailUrl?: string | null;
  createdBy: string;
}

// ============================================
// PROJECT SHARE
// ============================================

export type ShareType = 'user' | 'workspace' | 'public' | 'link';
export type SharePermission = 'view' | 'edit' | 'admin';

export interface ProjectShare {
  id: string;
  projectId: string;
  sharedBy: string;
  sharedWith: string | null;
  shareType: ShareType;
  permission: SharePermission;
  token: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface ProjectShareInsert {
  projectId: string;
  sharedBy: string;
  sharedWith?: string | null;
  shareType: ShareType;
  permission?: SharePermission;
  token?: string | null;
  expiresAt?: Date | null;
}

export interface ProjectShareUpdate {
  permission?: SharePermission;
  expiresAt?: Date | null;
}

// ============================================
// PROJECT ACTIVITY LOG
// ============================================

export interface ProjectActivityLog {
  id: string;
  projectId: string;
  userId: string;
  workspaceId: string;
  action: string;
  details: Record<string, any> | null;
  createdAt: Date;
}

export interface ProjectActivityLogInsert {
  projectId: string;
  userId: string;
  workspaceId: string;
  action: string;
  details?: Record<string, any>;
}

// ============================================
// PROJECT FILTERS & PAGINATION
// ============================================

export interface ProjectFilters {
  workspaceId: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  type?: ProjectType;
  isFavorite?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  isPublished?: boolean;
  search?: string;
  tags?: string[];
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ProjectPagination {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'lastOpenedAt';
  sortDirection?: 'asc' | 'desc';
}

export interface ProjectQueryResult {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// PROJECT STATISTICS
// ============================================

export interface ProjectStatistics {
  projectId: string;
  pageCount: number;
  versionCount: number;
  shareCount: number;
  activityCount: number;
  lastEditedAt: Date | null;
  lastOpenedAt: Date | null;
  totalEdits: number;
  totalExports: number;
  totalAIActions: number;
}

export interface WorkspaceProjectStats {
  workspaceId: string;
  totalProjects: number;
  draftCount: number;
  activeCount: number;
  publishedCount: number;
  archivedCount: number;
  trashedCount: number;
  favoriteCount: number;
}

// ============================================
// PROJECT DUPLICATE OPTIONS
// ============================================

export interface ProjectDuplicateOptions {
  newName?: string;
  includePages?: boolean;
  includeVersions?: boolean;
  includeShares?: boolean;
  resetStatistics?: boolean;
}

// ============================================
// PROJECT EXPORT OPTIONS
// ============================================

export interface ProjectExportOptions {
  format: 'json' | 'zip';
  includePages?: boolean;
  includeVersions?: boolean;
  includeAssets?: boolean;
  includeMetadata?: boolean;
}

// ============================================
// PROJECT RESTORE OPTIONS
// ============================================

export interface ProjectRestoreOptions {
  fromVersion?: number;
  restorePages?: boolean;
  restoreMetadata?: boolean;
}

// ============================================
// PROJECT SNAPSHOT
// ============================================

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  name: string;
  project: Project;
  pages: ProjectPage[];
  versions: ProjectVersion[];
  createdAt: number;
  thumbnailUrl?: string;
}

// ============================================
// PROJECT TEMPLATE
// ============================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  metadata: Record<string, any>;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
}