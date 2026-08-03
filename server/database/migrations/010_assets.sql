-- ============================================
-- Migration: 010_assets.sql
-- Description: Assets Management Schema
-- Phase: 5.3 Part 5
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- ============================================
-- ASSET FOLDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS asset_folders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  color TEXT,
  icon TEXT,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT fk_asset_folders_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_folders_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_folders_parent
    FOREIGN KEY (parent_id) REFERENCES asset_folders(id) ON DELETE CASCADE,
  CONSTRAINT unique_folder_name_parent
    UNIQUE (workspace_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_asset_folders_workspace ON asset_folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_asset_folders_parent ON asset_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_asset_folders_deleted ON asset_folders(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- ASSETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT,

  -- Core metadata
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,

  -- File info
  original_name TEXT,
  file_extension TEXT,
  width INTEGER,
  height INTEGER,
  aspect_ratio DECIMAL(5, 2),

  -- URLs
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  preview_url TEXT,
  signed_url TEXT,
  cdn_url TEXT,

  -- AI Generation metadata
  generation_prompt TEXT,
  negative_prompt TEXT,
  ai_model TEXT,
  seed BIGINT,
  provider TEXT,

  -- Colors
  dominant_color TEXT,
  color_palette JSONB,

  -- EXIF & Technical
  exif_data JSONB,
  metadata JSONB,

  -- Organization
  folder_id TEXT,
  collection_ids JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  keywords JSONB DEFAULT '[]'::jsonb,

  -- Status & Permissions
  status TEXT NOT NULL DEFAULT 'active',
  permission_level TEXT NOT NULL DEFAULT 'workspace',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,

  -- Source info
  source TEXT,
  creator TEXT,
  license TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Foreign keys
  CONSTRAINT fk_assets_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_assets_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_assets_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_assets_folder
    FOREIGN KEY (folder_id) REFERENCES asset_folders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_workspace_id ON assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_permission ON assets(permission_level);
CREATE INDEX IF NOT EXISTS idx_assets_favorite ON assets(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_assets_pinned ON assets(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_collection_ids ON assets USING GIN(collection_ids);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets(deleted_at) WHERE deleted_at IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_assets_search ON assets
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================
-- ASSET COLLECTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS asset_collections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_asset_id TEXT,
  is_smart BOOLEAN DEFAULT FALSE,
  smart_query JSONB,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT fk_asset_collections_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_collections_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_collections_cover
    FOREIGN KEY (cover_asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  CONSTRAINT unique_collection_name_workspace
    UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_asset_collections_workspace ON asset_collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_asset_collections_public ON asset_collections(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_asset_collections_deleted ON asset_collections(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- ASSET TAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS asset_tags (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_asset_tags_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT unique_tag_name_workspace
    UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_asset_tags_workspace ON asset_tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_name ON asset_tags(name);

-- ============================================
-- ASSET VERSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS asset_versions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  metadata JSONB,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_asset_versions_asset
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_versions_creator
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_asset_version
    UNIQUE (asset_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_asset_versions_asset ON asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_version ON asset_versions(version_number DESC);

-- ============================================
-- ASSET USAGE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS asset_usage (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  project_id TEXT,
  page_id TEXT,
  layer_id TEXT,
  used_by TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_asset_usage_asset
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_usage_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_usage_user
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asset_usage_asset ON asset_usage(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_project ON asset_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_used_at ON asset_usage(used_at DESC);

-- ============================================
-- ASSET FAVORITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS asset_favorites (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_asset_favorites_asset
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_asset_user_favorite
    UNIQUE (asset_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_favorites_user ON asset_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_favorites_asset ON asset_favorites(asset_id);

-- ============================================
-- ASSET AUDIT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS asset_audit_logs (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_asset_audit_asset
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_audit_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_audit_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asset_audit_asset ON asset_audit_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_audit_workspace ON asset_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_asset_audit_created ON asset_audit_logs(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_assets_updated_at();

CREATE TRIGGER trigger_asset_folders_updated_at
  BEFORE UPDATE ON asset_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_assets_updated_at();

CREATE TRIGGER trigger_asset_collections_updated_at
  BEFORE UPDATE ON asset_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_assets_updated_at();

CREATE TRIGGER trigger_asset_tags_updated_at
  BEFORE UPDATE ON asset_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_assets_updated_at();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_asset_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assets
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = NEW.asset_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_asset_usage
  AFTER INSERT ON asset_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_asset_usage();

-- Function to increment tag usage
CREATE OR REPLACE FUNCTION increment_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE asset_tags
  SET usage_count = usage_count + 1
  WHERE workspace_id = NEW.workspace_id
    AND name = ANY(
      SELECT jsonb_array_elements_text(NEW.tags)
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_tag_usage
  AFTER INSERT OR UPDATE ON assets
  FOR EACH ROW
  WHEN (NEW.tags IS DISTINCT FROM OLD.tags)
  EXECUTE FUNCTION increment_tag_usage();

-- ============================================
-- VIEWS
-- ============================================

-- View for workspace storage statistics
CREATE OR REPLACE VIEW workspace_storage_stats AS
SELECT
  workspace_id,
  COUNT(*) as total_assets,
  SUM(file_size) as total_size_bytes,
  COUNT(CASE WHEN type = 'image' THEN 1 END) as image_count,
  COUNT(CASE WHEN type = 'video' THEN 1 END) as video_count,
  COUNT(CASE WHEN type = 'ai_generated' THEN 1 END) as ai_generated_count,
  COUNT(CASE WHEN is_favorite THEN 1 END) as favorite_count
FROM assets
WHERE deleted_at IS NULL
GROUP BY workspace_id;

-- View for most used assets
CREATE OR REPLACE VIEW most_used_assets AS
SELECT
  a.id,
  a.name,
  a.workspace_id,
  a.usage_count,
  a.last_used_at,
  a.thumbnail_url
FROM assets a
WHERE a.deleted_at IS NULL
ORDER BY a.usage_count DESC
LIMIT 100;

-- View for duplicate detection
CREATE OR REPLACE VIEW potential_duplicates AS
SELECT
  a1.id as asset1_id,
  a2.id as asset2_id,
  a1.name as name1,
  a2.name as name2,
  a1.file_size,
  a1.workspace_id
FROM assets a1
INNER JOIN assets a2
  ON a1.workspace_id = a2.workspace_id
  AND a1.id != a2.id
  AND a1.file_size = a2.file_size
  AND a1.deleted_at IS NULL
  AND a2.deleted_at IS NULL
WHERE a1.created_at < a2.created_at;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================