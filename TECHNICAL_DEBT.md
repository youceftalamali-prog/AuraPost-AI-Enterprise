# AuraPost AI: Technical Debt & Modernization Register

**Target Scope:** Structural Gaps, Code Quality Bottlenecks, Legacy Code Blocks, and Test Coverage Registers  
**Prepared By:** Senior Technical Architect / QA Automation Lead  
**Status:** DRAFTED (Modernization Roadmap Ready)  

---

## 1. High-Priority Architecture Modernization

While the current monolithic architecture compiles cleanly and operates with high reliability, there are several areas of technical debt that should be addressed before deploying to a global audience:

```text
+-------------------+----------------------------+----------+---------------------------------+
| Debt ID           | Target Subsystem           | Severity | Modernization Plan              |
+-------------------+----------------------------+----------+---------------------------------+
| DEBT-001          | sql.js In-Memory DB        | Critical | Migrate to Cloud SQL Postgres   |
| DEBT-002          | Shared App.tsx             | High     | Decouple views to separate files|
| DEBT-003          | Automated Tests            | Medium   | Build Jest & Playwright suites  |
| DEBT-004          | Scraper Parser Regexes     | Medium   | Shift to Playwright scraper APIs|
+-------------------+----------------------------+----------+---------------------------------+
```

---

## 2. Deep Dive Into Core Gaps

### DEBT-001: sql.js In-Memory Database Limitations
- **The Issue:** The backend relies on an in-memory SQL database (`sql.js`) that flushes writes to `/storage/aurapost.db` every 10 seconds. In clustered deployments, this prevents multi-instance horizontal scaling, as each container instance would maintain its own independent in-memory state.
- **Modernization Plan:** Replace `sql.js` with PostgreSQL (using Google Cloud SQL). Use an ORM like Prisma or Drizzle to manage schema models and database migrations.

### DEBT-002: Monolithic `App.tsx` View Switcher
- **The Issue:** `src/App.tsx` manages all client routes, workspaces states, login forms, simulated states, and navigation panels. As the app's features expand, this file will grow in complexity, increasing the risk of code conflicts and regression bugs.
- **Modernization Plan:** Implement a modular routing engine (like `react-router-dom`) and split each dashboard tab into its own dedicated component file under `src/components/` or `src/pages/`.

### DEBT-003: Absolute Lack of Automated Test Suites
- **The Issue:** The project lacks automated tests. Without regression safeguards, modifying core engines (like `QueueEngine` or the scraper extractors) could introduce hard-to-detect bugs.
- **Modernization Plan:** Configure Jest and Supertest to validate backend API controllers. Implement Playwright or Cypress for end-to-end (E2E) testing of key user journeys (like product importing and social publishing).

### DEBT-004: Scraper Extractors Relying on HTML Regex Parsers
- **The Issue:** Extracting product titles, descriptions, and images using regular expressions (`html.match(...)` in `server/extractors/base.ts`) is highly fragile. Minor structure updates in WooCommerce or Amazon listings will break these parsers.
- **Modernization Plan:** Migrate to Puppeteer or Playwright to run real headless browser instances. Utilize LLM-powered scraping prompts to dynamically parse page content, rendering scrapers resilient to layout updates.

---

## 3. Legacy Files & Refactoring Targets

### A. `/server/shopify-extractor.ts`
- **Current Status:** This file is a legacy prototype that has been superseded by the modular, object-oriented scraper classes under `/server/extractors`.
- **Recommendation:** Safely delete this file after verifying that all endpoints have fully migrated to the `ExtractorFactory` router.

### B. High Inline State Coupling in `LoginCard.tsx`
- **Current Status:** The simulated login gateway contains mock credentials directly inside its React state definitions.
- **Recommendation:** Decouple these records into a JSON config file (e.g., `/config/mock_users.json`) or load them via developer environment variables to keep component code clean.
