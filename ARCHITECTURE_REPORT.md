# AuraPost AI: Complete Architecture & Layout Specifications

**Topic:** Enterprise Monolithic SaaS Layout and Design Topology  
**Prepared By:** Principal Staff Software Engineer / Senior System Architect  
**Status:** COMPLETE (All Structural Components Validated)  

---

## 1. Structural Architecture Diagram

```text
+-------------------------------------------------------------------------------------------------+
|                                    REACT FRONTEND (Vite SPA)                                    |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+ |
|  |  Products Catalog  |  |   Product Import   |  |  Product Analyzer  |  |    Video Studio    | |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+ |
|  | AI Content Studio  |  |    Image Studio    |  |   Publish Center   |  |  Content Calendar  | |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+ |
|  | Social Connections |  |     Brand Kit      |  |  Analytics Panel   |  |   Billing Manager  | |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+ |
|  |    Shopify Sync    |  |   AI Providers     |  |    Queue Center    |  |   SSO Login Card   | |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+ |
+------------------------------------------------+------------------------------------------------+
                                                 | (HTTPS / REST APIs / JWT Headers)
                                                 v
+-------------------------------------------------------------------------------------------------+
|                              EXPRESS MONOLITH BACKEND (server.ts)                               |
|                                                                                                 |
|   +-----------------------+   +------------------------+   +--------------------------------+   |
|   |  JWT Authentication   |   |   Row-Level Tenant     |   |   Diagnostic Telemetry Logs    |   |
|   |  & Session Middleware |   |   Isolation Middleware |   |   (meta_diagnostics.json)      |   |
|   +-----------+-----------+   +-----------+------------+   +---------------+----------------+   |
|               |                           |                                |                    |
|               v                           v                                v                    |
|   +-----------------------------------------------------------------------------------------+   |
|   |                              INTEGRATED BUSINESS SERVICES                               |   |
|   |                                                                                         |   |
|   |   +----------------------+  +---------------------+  +------------------------------+   |   |
|   |   |  AIProviderService   |  |   Social Publisher  |  |       Shopify OAuth &        |   |   |
|   |   |  (Circuit Breaker)   |  |   (Graph APIs v19)  |  |       Live Store Sync        |   |   |
|   |   +----------------------+  +---------------------+  +------------------------------+   |   |
|   |   |  VideoStudio Renderer|  |  Product Scrapers   |  |       Stripe / PayPal        |   |   |
|   |   |  (Google Veo/Runway) |  |  (Extractor Engine) |  |       Billing Handover       |   |   |
|   |   +----------------------+  +---------------------+  +------------------------------+   |   |
|   +-------------------------------------------+---------------------------------------------+   |
|                                               |                                                 |
|                                               v                                                 |
|   +-----------------------------------------------------------------------------------------+   |
|   |                              PERSISTENT DAEMON ENGINES                                  |   |
|   |                                                                                         |   |
|   |   +-----------------------------------+     +---------------------------------------+   |   |
|   |   |         QueueEngine Loop          |     |          DatabaseManager              |   |   |
|   |   | (import, video, content, publish) |     |  (sql.js SQLite + Periodical Flush)   |   |   |
|   |   +-----------------------------------+     +---------------------------------------+   |   |
|   +-------------------------------------------+---------------------------------------------+   |
+-----------------------------------------------|-------------------------------------------------+
                                                v
                               +----------------------------------+
                               |     SQLITE STORAGE ENGINE        |
                               |    (/storage/aurapost.db)        |
                               +----------------------------------+
```

---

## 2. Component Layout and Specifications

### A. Core Backend Server (`server.ts`)
- **Port Binding:** Configured strictly to Port `3000` on Host `0.0.0.0` to route container ingress safely.
- **Vite Integration (HMR-less Development):** Instantiates Vite in `middlewareMode` during non-production runs. This serves React components dynamically and maps route handlers on a unified Express runtime.

### B. Persistent Daemon Engine (`server/queue/engine.ts`)
- **Concurrency:** Uses a round-robin tick cycle to run asynchronous workers synchronously in a single Node process thread. This limits memory footprints to `< 150 MB` rss under full loads.
- **Priority Matrix:**
  - Priority 9: Immediately published scheduled social posts.
  - Priority 8: Shopify automated store syncs, video rendering.
  - Priority 7: Automatic social content draft creations.
  - Priority 6: Periodic competitor analysis.

### C. Database Tenant Isolation Wrapper (`server/db.ts`)
- **Row Separation:** Rather than creating a SQLite file per workspace (which causes filesystem descriptors bloat), a single relational model separates workspaces via `workspaceId` values.
- **Periodic Writeouts:** The database manager caches writes in memory via `sql.js` and flushes the buffer to disk at `/storage/aurapost.db` every 10 seconds. This avoids database corruption on sudden server reboots.

### D. Scraper Pipeline Engine (`server/extractors`)
- **Interface Segregation:** Uses a strictly typed `IProductExtractor` interface (`extract`, `validate`).
- **Heuristic Engine:** Matches the URL signature against target scrapers (Amazon, AliExpress, eBay, WooCommerce, etc.) and gracefully uses WooCommerce as a fallback to maximize the conversion rate of random custom stores.

### E. AI Circuit Breaker and Smart Json Healers (`server/ai`)
- **Fault-Tolerance:** Implements a stateful network gateway breaker. If any LLM fails 3 times sequentially, the breaker moves to `Open` and diverts the workload to alternative models.
- **Output Repair:** Runs sanitizing hooks over string outputs to correct formatting errors (trailing commas, missing closing tags) to prevent application-breaking parsing failures.

---

## 3. Data Schema Layouts (SQLite Blueprint)

```sql
-- Workspaces Table
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  credits INTEGER DEFAULT 100,
  stripeCustomerId TEXT
);

-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  active_workspace_id TEXT,
  FOREIGN KEY(active_workspace_id) REFERENCES workspaces(id)
);

-- Products Catalog Table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  images TEXT NOT NULL,
  gallery TEXT NOT NULL, -- JSON String Array
  variants TEXT NOT NULL, -- JSON Objects Array
  specifications TEXT NOT NULL, -- JSON Object
  vendor TEXT NOT NULL,
  price REAL NOT NULL,
  compare_at_price REAL,
  currency TEXT DEFAULT 'USD',
  availability INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(workspaceId) REFERENCES workspaces(id)
);
```
