-- ============================================
-- Migration: 011_projects.sql
-- Description: Projects Management Schema
-- Phase: 5.3 Part 5
-- ============================================

-- ============================================
-- PROJECTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- Core info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'design',

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'private',

  -- Canvas
  canvas_width INTEGER NOT NULL DEFAULT 1920,
  canvas_height INTEGER NOT NULL DEFAULT 1080,

  -- Cover
  cover_image_url TEXT,
  thumbnail_url TEXT,

  -- Brand
  brand_kit_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,

  -- Flags
  is_favorite BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_trashed BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,

  -- Timestamps
  archived_at TIMESTAMPTZ,
  trashed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Foreign keys
  CONSTRAINT fk_projects_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_brand_kit
    FOREIGN KEY (brand_kit_id) REFERENCES brand_kits(id) ON DELETE SET NULL,
  CONSTRAINT unique_project_slug_workspace
    UNIQUE (workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_is_favorite ON projects(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON projects(is_archived) WHERE is_archived = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_is_trashed ON projects(is_trashed) WHERE is_trashed = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_projects_search ON projects
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================
-- PROJECT PAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS project_pages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  -- Page info
  name TEXT NOT NULL,
  page_index INTEGER NOT NULL DEFAULT 0,

  -- Canvas data
  canvas_data JSONB DEFAULT '{}'::jsonb,
  layers_snapshot JSONB DEFAULT '[]'::jsonb,

  -- Thumbnail
  thumbnail_url TEXT,

  -- Dimensions
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Foreign keys
  CONSTRAINT fk_project_pages_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT unique_project_page_index
    UNIQUE (project_id, page_index)
);

CREATE INDEX IF NOT EXISTS idx_project_pages_project_id ON project_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_pages_page_index ON project_pages(page_index);
CREATE INDEX IF NOT EXISTS idx_project_pages_deleted_at ON project_pages(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- PROJECT VERSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  -- Version info
  version_number INTEGER NOT NULL,
  name TEXT,
  description TEXT,

  -- Snapshot
  snapshot JSONB DEFAULT '{}'::jsonb,
  layers_snapshot JSONB DEFAULT '[]'::jsonb,
  canvas_data JSONB DEFAULT '{}'::jsonb,

  -- Thumbnail
  thumbnail_url TEXT,

  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_project_versions_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_versions_creator
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_project_version
    UNIQUE (project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_version_number ON project_versions(version_number DESC);

-- ============================================
-- PROJECT SHARES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS project_shares (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  -- Share info
  shared_by TEXT NOT NULL,
  shared_with TEXT,
  share_type TEXT NOT NULL DEFAULT 'link',
  permission TEXT NOT NULL DEFAULT 'view',

  -- Token for link sharing
  token TEXT,
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Foreign keys
  CONSTRAINT fk_project_shares_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_shares_shared_by
    FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_shares_shared_with
    FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_by ON project_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_with ON project_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_project_shares_token ON project_shares(token);
CREATE INDEX IF NOT EXISTS idx_project_shares_deleted_at ON project_shares(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- PROJECT ACTIVITY LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS project_activity_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,

  -- Activity info
  action TEXT NOT NULL,
  details JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_project_activity_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_activity_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_activity_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_activity_project_id ON project_activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_user_id ON project_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_workspace_id ON project_activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_created_at ON project_activity_logs(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp for projects
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

CREATE TRIGGER trigger_project_pages_updated_at
  BEFORE UPDATE ON project_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_project_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := trim(BOTH '-' FROM NEW.slug);
    NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_project_slug
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_project_slug();

-- Function to log project activity
CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_activity_logs (project_id, user_id, workspace_id, action, details)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.workspace_id, OLD.workspace_id),
    TG_OP,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_name', OLD.name,
      'new_name', NEW.name
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_project_activity
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_project_activity();

-- ============================================
-- VIEWS
-- ============================================

-- View for workspace project statistics
CREATE OR REPLACE VIEW workspace_project_stats AS
SELECT
  workspace_id,
  COUNT(*) as total_projects,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
  COUNT(CASE WHEN is_archived THEN 1 END) as archived_count,
  COUNT(CASE WHEN is_trashed THEN 1 END) as trashed_count,
  COUNT(CASE WHEN is_favorite THEN 1 END) as favorite_count
FROM projects
WHERE deleted_at IS NULL
GROUP BY workspace_id;

-- View for recent projects
CREATE OR REPLACE VIEW recent_projects AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.workspace_id,
  p.user_id,
  p.status,
  p.thumbnail_url,
  p.updated_at,
  p.last_opened_at,
  (SELECT COUNT(*) FROM project_pages pp WHERE pp.project_id = p.id AND pp.deleted_at IS NULL) as page_count
FROM projects p
WHERE p.deleted_at IS NULL
  AND p.is_trashed = FALSE
ORDER BY COALESCE(p.last_opened_at, p.updated_at) DESC
LIMIT 50;

-- View for project details with page count
CREATE OR REPLACE VIEW project_details AS
SELECT
  p.*,
  (SELECT COUNT(*) FROM project_pages pp WHERE pp.project_id = p.id AND pp.deleted_at IS NULL) as page_count,
  (SELECT COUNT(*) FROM project_versions pv WHERE pv.project_id = p.id) as version_count,
  (SELECT COUNT(*) FROM project_shares ps WHERE ps.project_id = p.id AND ps.deleted_at IS NULL) as share_count
FROM projects p
WHERE p.deleted_at IS NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================