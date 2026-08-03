-- ============================================================================
-- AuraPost AI — PostgreSQL Schema (Phase 2: Database Hardening)
-- ============================================================================
-- Translated 1:1 from the existing SQLite (sql.js) schema in server/db.ts.
-- Design decisions, made deliberately to minimize migration risk:
--
--   1. Primary keys remain TEXT (existing app code generates UUIDv4 strings
--      via uuid.v4() and treats IDs as opaque strings everywhere). Switching
--      to native Postgres UUID type would require touching every call site
--      that builds/compares IDs — out of scope for this pass.
--   2. Boolean-style flags (0/1 in SQLite) remain INTEGER, not BOOLEAN, so
--      that the existing application code (which reads/writes 0/1 literals
--      throughout db.ts) continues to work unmodified against either backend
--      during the transition period. Converting to native BOOLEAN is a good
--      follow-up once all query methods have been ported (see MIGRATION_GUIDE.md).
--   3. Money/amount columns remain DOUBLE PRECISION (mirroring SQLite's REAL)
--      rather than NUMERIC, again to avoid changing arithmetic/rounding
--      behavior the app currently depends on. Recommended follow-up: migrate
--      to NUMERIC(12,2) for exact monetary precision once ported.
--   4. Timestamp columns use TIMESTAMPTZ (Postgres will happily accept the
--      ISO-8601 strings the app already writes via `new Date().toISOString()`).
--   5. SQLite's `COLLATE NOCASE` on users.email has no direct Postgres
--      equivalent without the citext extension (an extra dependency this
--      pass avoids). Case-insensitive uniqueness is instead enforced via a
--      functional unique index on LOWER(email); application query code must
--      be updated to filter with `WHERE LOWER(email) = LOWER($1)` when ported
--      (tracked as a required follow-up in MIGRATION_GUIDE.md — NOT done in
--      this pass, since it requires touching UserRepository query methods).
--
-- This file is idempotent (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT
-- EXISTS) and can be run repeatedly against a fresh or partially-provisioned
-- database.
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER DEFAULT 1000,
  stripe_customer_id TEXT,
  ai_routing TEXT,
  ai_usage_stats TEXT
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  provider_id TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'active',
  email_verified INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
-- Case-insensitive uniqueness (replaces SQLite's COLLATE NOCASE — see header note).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider_provider_id ON users(auth_provider, provider_id);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  payment_provider TEXT NOT NULL DEFAULT 'paypal',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_portal_url TEXT,
  stripe_checkout_session_id TEXT,
  stripe_mode TEXT NOT NULL DEFAULT 'sandbox',
  paypal_subscription_id TEXT,
  paypal_plan_id TEXT,
  paypal_payer_id TEXT,
  paypal_mode TEXT NOT NULL DEFAULT 'sandbox',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end INTEGER DEFAULT 0 NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE billing_subscriptions ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'paypal';
ALTER TABLE billing_subscriptions ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;
ALTER TABLE billing_subscriptions ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT;
ALTER TABLE billing_subscriptions ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT;
ALTER TABLE billing_subscriptions ADD COLUMN IF NOT EXISTS paypal_mode TEXT NOT NULL DEFAULT 'sandbox';
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_workspace ON billing_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_paypal_sub ON billing_subscriptions(paypal_subscription_id);

CREATE TABLE IF NOT EXISTS workspace_credit_pools (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  monthly_allocation INTEGER NOT NULL DEFAULT 0,
  used_this_period INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (workspace_id, bucket)
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id TEXT,
  payment_provider TEXT NOT NULL DEFAULT 'paypal',
  stripe_invoice_id TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  amount_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL,
  hosted_invoice_url TEXT,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'paypal';
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT;
CREATE INDEX IF NOT EXISTS idx_billing_invoices_workspace ON billing_invoices(workspace_id);

CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_id TEXT,
  payment_provider TEXT NOT NULL DEFAULT 'paypal',
  stripe_payment_intent_id TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'paypal';
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payment_history_workspace ON payment_history(workspace_id);

-- PHASE 2 (PayPal integration): idempotency + replay-attack protection for incoming
-- PayPal webhooks. PayPal's webhook event `id` is globally unique per event; a UNIQUE
-- constraint here means a duplicate delivery (PayPal retries on anything but a 2xx)
-- or a maliciously replayed payload can never be processed twice.
CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  id TEXT PRIMARY KEY,
  paypal_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  resource_id TEXT,
  workspace_id TEXT,
  payload TEXT NOT NULL,
  signature_verified INTEGER NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_event_id ON paypal_webhook_events(paypal_event_id);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS shopify_stores (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  access_token TEXT,
  access_token_iv TEXT,
  refresh_token TEXT,
  refresh_token_iv TEXT,
  token_expires_at TIMESTAMPTZ,
  last_token_refresh_at TIMESTAMPTZ,
  scopes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  connection_mode TEXT NOT NULL DEFAULT 'sandbox',
  is_default INTEGER NOT NULL DEFAULT 0,
  connected_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ
);
ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS access_token_iv TEXT;
ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS refresh_token_iv TEXT;
CREATE INDEX IF NOT EXISTS idx_shopify_stores_workspace ON shopify_stores(workspace_id);

CREATE TABLE IF NOT EXISTS shopify_sync_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  webhook_topic TEXT,
  entity_id TEXT,
  summary TEXT NOT NULL,
  synced_products INTEGER NOT NULL DEFAULT 0,
  synced_collections INTEGER NOT NULL DEFAULT 0,
  synced_inventory INTEGER NOT NULL DEFAULT 0,
  imported_orders INTEGER NOT NULL DEFAULT 0,
  imported_customers INTEGER NOT NULL DEFAULT 0,
  revenue_imported DOUBLE PRECISION NOT NULL DEFAULT 0,
  automation_executions INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_jobs_store ON shopify_sync_jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_jobs_workspace ON shopify_sync_jobs(workspace_id);

CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL,
  payload TEXT NOT NULL,
  sync_job_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_store ON shopify_webhook_events(store_id);

CREATE TABLE IF NOT EXISTS shopify_automation_settings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  store_id TEXT NOT NULL UNIQUE,
  auto_sync_every_hour INTEGER NOT NULL DEFAULT 1,
  auto_publish_generated_content INTEGER NOT NULL DEFAULT 0,
  auto_create_social_posts INTEGER NOT NULL DEFAULT 0,
  auto_generate_videos INTEGER NOT NULL DEFAULT 0,
  auto_competitor_monitoring INTEGER NOT NULL DEFAULT 0,
  last_auto_sync_at TIMESTAMPTZ,
  last_automation_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS shopify_automation_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT NOT NULL,
  product_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopify_automation_runs_store ON shopify_automation_runs(store_id);

CREATE TABLE IF NOT EXISTS shopify_product_links (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  shopify_product_id TEXT NOT NULL,
  handle TEXT,
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopify_product_links_store ON shopify_product_links(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_links_product ON shopify_product_links(product_id);

CREATE TABLE IF NOT EXISTS shopify_collections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  shopify_collection_id TEXT NOT NULL,
  title TEXT NOT NULL,
  handle TEXT,
  products_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopify_collections_store ON shopify_collections(store_id);

CREATE TABLE IF NOT EXISTS shopify_orders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  shopify_order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_email TEXT,
  total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store ON shopify_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_workspace ON shopify_orders(workspace_id);

CREATE TABLE IF NOT EXISTS shopify_customers (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  shopify_customer_id TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  orders_count INTEGER NOT NULL DEFAULT 0,
  total_spent DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_store ON shopify_customers(store_id);

CREATE TABLE IF NOT EXISTS queue_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  status TEXT NOT NULL,
  reference_id TEXT,
  payload TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  backoff_ms INTEGER NOT NULL DEFAULT 1000,
  next_run_at TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  dead_letter_reason TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status_next_run ON queue_jobs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_workspace ON queue_jobs(workspace_id);

CREATE TABLE IF NOT EXISTS queue_job_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_queue_job_logs_job ON queue_job_logs(job_id);

CREATE TABLE IF NOT EXISTS queue_workers (
  worker_name TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  active_job_id TEXT,
  memory_usage_mb DOUBLE PRECISION NOT NULL DEFAULT 0,
  queue_length INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  processed_jobs INTEGER NOT NULL DEFAULT 0,
  average_processing_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id TEXT PRIMARY KEY,
  source_job_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  last_error TEXT NOT NULL,
  moved_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT,
  gallery TEXT,
  variants TEXT,
  specifications TEXT,
  vendor TEXT,
  price DOUBLE PRECISION,
  compare_at_price DOUBLE PRECISION,
  currency TEXT,
  availability INTEGER,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_workspace ON products(workspace_id);

CREATE TABLE IF NOT EXISTS import_operations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL,
  credit_charged INTEGER NOT NULL,
  error_message TEXT,
  product_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  fetch_time_ms INTEGER,
  analyze_time_ms INTEGER,
  telemetry TEXT
);
CREATE INDEX IF NOT EXISTS idx_import_operations_workspace ON import_operations(workspace_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON audit_logs(workspace_id);

CREATE TABLE IF NOT EXISTS product_analyses (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  is_latest INTEGER DEFAULT 1 NOT NULL,
  language_code TEXT DEFAULT 'en' NOT NULL,
  confidence_score DOUBLE PRECISION DEFAULT 1.000 NOT NULL,
  ai_provider TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  prompt_tokens_count INTEGER NOT NULL,
  completion_tokens_count INTEGER NOT NULL,
  latency_milliseconds INTEGER NOT NULL,
  opportunity_scores TEXT NOT NULL,
  market_intelligence TEXT NOT NULL,
  marketing_intelligence TEXT NOT NULL,
  brand_intelligence TEXT NOT NULL DEFAULT '{}',
  creative_intelligence TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_analyses_product ON product_analyses(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analyses_workspace ON product_analyses(workspace_id);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  running_balance INTEGER NOT NULL,
  credit_bucket TEXT,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_workspace ON credit_ledger(workspace_id);

CREATE TABLE IF NOT EXISTS content_generations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  credits_charged INTEGER NOT NULL,
  payload TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_latest INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_content_generations_product ON content_generations(product_id);

CREATE TABLE IF NOT EXISTS hooks (
  id TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hooks_generation ON hooks(generation_id);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  hook TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  benefits TEXT NOT NULL,
  cta TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scripts_generation ON scripts(generation_id);

CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  access_token TEXT,
  access_token_iv TEXT,
  refresh_token TEXT,
  refresh_token_iv TEXT,
  token_expires_at TIMESTAMPTZ,
  integration_mode TEXT NOT NULL DEFAULT 'sandbox',
  status TEXT NOT NULL DEFAULT 'connected',
  connected_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS access_token_iv TEXT;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS refresh_token_iv TEXT;
CREATE INDEX IF NOT EXISTS idx_social_accounts_workspace ON social_accounts(workspace_id);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  social_account_id TEXT,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT NOT NULL,
  media_urls TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  preview_text TEXT NOT NULL,
  source_type TEXT,
  source_generation_id TEXT,
  failure_reason TEXT,
  metrics TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_social_posts_workspace ON social_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_batch ON social_posts(batch_id);

CREATE TABLE IF NOT EXISTS video_generations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_latest INTEGER DEFAULT 1 NOT NULL,
  template TEXT NOT NULL,
  output_type TEXT NOT NULL,
  input_mode TEXT NOT NULL,
  prompt TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_fallback_chain TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  progress INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  estimated_render_seconds INTEGER NOT NULL DEFAULT 0,
  source_generation_id TEXT,
  source_analysis_id TEXT,
  source_image_urls TEXT NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  download_url TEXT,
  error_message TEXT,
  scenes TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_video_generations_product ON video_generations(product_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_workspace ON video_generations(workspace_id);

-- ─── Integration Tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workspace_ai_providers (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_key_iv TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  default_model TEXT,
  monthly_usage INTEGER DEFAULT 0,
  last_connection_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(workspace_id, provider)
);

CREATE TABLE IF NOT EXISTS workspace_woocommerce_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  store_url TEXT NOT NULL,
  consumer_key_encrypted TEXT NOT NULL,
  consumer_key_iv TEXT NOT NULL,
  consumer_secret_encrypted TEXT NOT NULL,
  consumer_secret_iv TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(workspace_id)
);

CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,
  redirect_uri TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  device TEXT,
  platform TEXT,
  browser TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_activity_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_id ON sessions(refresh_token_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- image_studio_projects: REMOVED (migrated to projects/project_pages — see
-- scripts/migrate-image-studio-projects.ts and PRODUCTION_REPORT.md)

-- ============================================================================
-- Additional indexes not present in the original SQLite schema, added here
-- because they support query patterns already used by db.ts (e.g. filtering
-- shopify_orders/customers by workspace_id + store_id together) and are cheap
-- to add now while defining the schema fresh.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store_workspace ON shopify_orders(store_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_store_workspace ON shopify_customers(store_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_workspace ON content_generations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_ai_providers_workspace ON workspace_ai_providers(workspace_id);
-- ─── Video Studio Module (merged from AuraPost-AI-video) ─────────────────

-- Generated from server/video-studio/db/schema/*.ts via `drizzle-kit generate`,

-- then made idempotent (IF NOT EXISTS / DO-block guarded FKs) to match this

-- file's existing CREATE-TABLE-IF-NOT-EXISTS style, applied on every boot.

-- These are Drizzle-managed tables (see server/video-studio/db/index.ts);

-- application code reads/writes them through Drizzle, not raw SQL here.

CREATE EXTENSION IF NOT EXISTS pgcrypto;


CREATE TABLE IF NOT EXISTS "favorite_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "video_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"name" varchar(200) NOT NULL,
	"description" text,
	"style" varchar(100),
	"platform" varchar(50),
	"difficulty" varchar(20) DEFAULT 'Medium' NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"thumbnail_url" text,
	"preview_url" text,
	"base_prompt_template" text NOT NULL,
	"supported_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_duration" integer DEFAULT 10 NOT NULL,
	"estimated_cost" numeric(10, 4) DEFAULT '0.05' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "prompt_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	"prompt_fragment" text NOT NULL,
	"negative_fragment" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"cost_multiplier" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"quality_impact" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "video_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_hash" varchar(64) NOT NULL,
	"prompt" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"duration" integer,
	"resolution" varchar(20),
	"cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "video_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"product_id" uuid,
	"template_id" uuid,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"title" varchar(200),
	"description" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"platform" varchar(50),
	"provider" varchar(50),
	"estimated_cost" numeric(10, 4),
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_video_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"vibe" varchar(50),
	"target_audience" varchar(50),
	"product_type" varchar(50),
	"category" varchar(100),
	"recommended_styles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_ready_score" integer DEFAULT 0 NOT NULL,
	"luxury_score" integer DEFAULT 0 NOT NULL,
	"viral_score" integer DEFAULT 0 NOT NULL,
	"improvements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"best_image_url" text,
	"dominant_colors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lighting" varchar(50),
	"background_type" varchar(50),
	"needs_background_removal" boolean DEFAULT false NOT NULL,
	"needs_enhancement" boolean DEFAULT false NOT NULL,
	"processed_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audience_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"age_group" varchar(50) NOT NULL,
	"gender" varchar(50) NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"buying_intent" varchar(50) DEFAULT 'Medium' NOT NULL,
	"income_level" varchar(50) DEFAULT 'Mixed' NOT NULL,
	"lifestyle" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"language" varchar(20),
	"analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "brand_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"logo_url" text,
	"colors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fonts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tone" varchar(100),
	"voice" varchar(100),
	"personality" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"luxury_level" integer DEFAULT 50 NOT NULL,
	"visual_identity" varchar(100),
	"writing_style" varchar(100),
	"cta_style" varchar(100),
	"description" text,
	"website" text,
	"analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "campaign_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"platform" varchar(50) NOT NULL,
	"video_concept" text NOT NULL,
	"caption" text NOT NULL,
	"hook" text NOT NULL,
	"cta" text NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"thumbnail_idea" text,
	"publishing_strategy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prompt" text NOT NULL,
	"negative_prompt" text,
	"template_id" uuid,
	"estimated_cost" numeric(10, 4),
	"estimated_duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "campaign_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"product_id" uuid,
	"brand_id" uuid,
	"audience_id" uuid,
	"goal" varchar(50) DEFAULT 'Conversion' NOT NULL,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"workspace_id" uuid,
	"job_id" uuid,
	"estimated_cost" numeric(10, 4) NOT NULL,
	"actual_cost" numeric(10, 4),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"duration" integer,
	"resolution" varchar(20),
	"quality" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'Available' NOT NULL,
	"availability" numeric(5, 2) DEFAULT '100' NOT NULL,
	"average_response_time" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '100' NOT NULL,
	"failure_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"current_queue_size" integer DEFAULT 0 NOT NULL,
	"last_checked" timestamp DEFAULT now() NOT NULL,
	"last_success" timestamp,
	"last_failure" timestamp,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"uptime" numeric(5, 2) DEFAULT '100' NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"external_job_id" varchar(255),
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid,
	"template_id" uuid,
	"prompt" text NOT NULL,
	"negative_prompt" text,
	"model" varchar(100) NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'Queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"result_url" text,
	"thumbnail_url" text,
	"duration" integer,
	"resolution" varchar(20),
	"aspect_ratio" varchar(10),
	"cache_hash" varchar(64),
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"estimated_cost" numeric(10, 4),
	"actual_cost" numeric(10, 4),
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"auto_routing" boolean DEFAULT true NOT NULL,
	"default_provider" varchar(50) DEFAULT 'HuggingFace' NOT NULL,
	"fallback_enabled" boolean DEFAULT true NOT NULL,
	"fallback_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_cost_per_video" numeric(10, 4) DEFAULT '1.00' NOT NULL,
	"preferred_quality" varchar(20) DEFAULT 'High' NOT NULL,
	"api_keys" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"custom_priorities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"excluded_providers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"workspace_id" uuid,
	"period" varchar(20) DEFAULT 'all' NOT NULL,
	"total_jobs" integer DEFAULT 0 NOT NULL,
	"successful_jobs" integer DEFAULT 0 NOT NULL,
	"failed_jobs" integer DEFAULT 0 NOT NULL,
	"cancelled_jobs" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_generation_time" integer DEFAULT 0 NOT NULL,
	"average_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"total_cost" numeric(12, 4) DEFAULT '0' NOT NULL,
	"total_duration" integer DEFAULT 0 NOT NULL,
	"last_response_time" integer DEFAULT 0 NOT NULL,
	"last_job_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "video_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"tier" varchar(50) DEFAULT 'Standard' NOT NULL,
	"base_url" text NOT NULL,
	"api_key_env_var" varchar(100) NOT NULL,
	"supported_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_model" varchar(100) NOT NULL,
	"max_duration" integer DEFAULT 60 NOT NULL,
	"supported_aspect_ratios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supported_resolutions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pricing" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rate_limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_ft_user_template" ON "favorite_templates" USING btree ("user_id","template_id");
CREATE INDEX IF NOT EXISTS "idx_ft_user" ON "favorite_templates" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_vt_category" ON "video_templates" USING btree ("category");
CREATE INDEX IF NOT EXISTS "idx_vt_popularity" ON "video_templates" USING btree ("popularity");
CREATE INDEX IF NOT EXISTS "idx_vt_active" ON "video_templates" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_pb_category" ON "prompt_blocks" USING btree ("category");
CREATE INDEX IF NOT EXISTS "idx_pb_name" ON "prompt_blocks" USING btree ("name");
CREATE INDEX IF NOT EXISTS "idx_pb_active" ON "prompt_blocks" USING btree ("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_vc_hash" ON "video_cache" USING btree ("cache_hash");
CREATE INDEX IF NOT EXISTS "idx_vc_expires" ON "video_cache" USING btree ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_vc_provider" ON "video_cache" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "idx_vh_user" ON "video_history" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_vh_workspace" ON "video_history" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_vh_job" ON "video_history" USING btree ("job_id");
CREATE INDEX IF NOT EXISTS "idx_vh_favorite" ON "video_history" USING btree ("is_favorite");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pva_product_workspace" ON "product_video_analysis" USING btree ("product_id","workspace_id");
CREATE INDEX IF NOT EXISTS "idx_pva_product" ON "product_video_analysis" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "idx_ap_workspace" ON "audience_profiles" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_bp_workspace" ON "brand_profiles" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_cg_campaign" ON "campaign_generations" USING btree ("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_cg_workspace" ON "campaign_generations" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_cg_platform" ON "campaign_generations" USING btree ("platform");
CREATE INDEX IF NOT EXISTS "idx_cp_workspace" ON "campaign_profiles" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_cp_status" ON "campaign_profiles" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_pc_provider" ON "provider_costs" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "idx_pc_workspace" ON "provider_costs" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_pc_job" ON "provider_costs" USING btree ("job_id");
CREATE INDEX IF NOT EXISTS "idx_pc_created_at" ON "provider_costs" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ph_provider" ON "provider_health" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "idx_ph_status" ON "provider_health" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_pj_provider" ON "provider_jobs" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "idx_pj_workspace" ON "provider_jobs" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_pj_user" ON "provider_jobs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_pj_status" ON "provider_jobs" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_pj_external_job" ON "provider_jobs" USING btree ("external_job_id");
CREATE INDEX IF NOT EXISTS "idx_pj_cache_hash" ON "provider_jobs" USING btree ("cache_hash");
CREATE INDEX IF NOT EXISTS "idx_pj_created_at" ON "provider_jobs" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pset_workspace" ON "provider_settings" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_ps_provider" ON "provider_statistics" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "idx_ps_workspace" ON "provider_statistics" USING btree ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ps_provider_period" ON "provider_statistics" USING btree ("provider","period");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_vp_name" ON "video_providers" USING btree ("name");
CREATE INDEX IF NOT EXISTS "idx_vp_active" ON "video_providers" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_vp_priority" ON "video_providers" USING btree ("priority");

DO $$ BEGIN
  ALTER TABLE "favorite_templates" ADD CONSTRAINT "favorite_templates_template_id_video_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."video_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "campaign_generations" ADD CONSTRAINT "campaign_generations_campaign_id_campaign_profiles_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- Assets Module (server/assets) + Projects Module (server/projects)
-- Added during Image Studio merge. Column types converted from native UUID
-- to TEXT to match this app's existing ID convention (see note above: IDs
-- are opaque app-generated strings, e.g. "default-workspace", not always
-- valid UUID syntax) and CREATE TABLE/INDEX made idempotent to match this
-- file's bootstrap-on-every-start execution model.
-- ============================================================================

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

-- ============================================================================
-- Legacy Adapter Usage Telemetry
-- Tracks every call that still goes through a deprecated compatibility
-- adapter (e.g. legacyImageStudioAdapter), so we can confirm a full release
-- cycle with zero usage before permanently removing any deprecated code.
-- See server/core/telemetry/legacyAdapterTelemetry.ts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS legacy_adapter_usage (
  id TEXT PRIMARY KEY,
  adapter_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  workspace_id TEXT,
  user_id TEXT,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  deprecation_notice TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legacy_adapter_usage_adapter_name ON legacy_adapter_usage(adapter_name);
CREATE INDEX IF NOT EXISTS idx_legacy_adapter_usage_called_at ON legacy_adapter_usage(called_at);
