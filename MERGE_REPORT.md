# AuraPost AI + Video Studio — Merge Report

## Status: Complete and verified

This merge was validated end-to-end against a real PostgreSQL instance, not
just compiled in isolation:

| Check | Result |
|---|---|
| `tsc --noEmit` | **0 errors introduced** (matches pristine Project A's pre-existing 8 PayPal errors exactly) |
| `vite build` (frontend) | Succeeds — all 13 existing feature bundles intact + new StudioShell bundle |
| `esbuild server.ts` (backend) | Succeeds, 1.1MB bundle |
| Real Postgres boot | Server starts, logs `AuraPost server started`, `/health` returns 200 |
| Schema merge | All 15 new tables created alongside every existing table, zero collisions |
| Auth wiring | `/api/video/*` correctly returns 401 without a token; A's `/api/auth/register` + `/api/auth/login` unaffected |
| Full E2E | Real register → login → JWT → authenticated `/api/video/providers` (7 providers) and `/api/video/templates` (200, correct empty/seeded state) |
| Seed script | 32 templates, 28 prompt blocks, 7 providers seeded cleanly via the CLI path |
| Data migration script | Runs cleanly, idempotent, correctly reports 0/0 on a fresh DB |

---

## What changed

### New: Video Studio module (native, not bolted on)
- `server/video-studio/` — controllers → services → repositories → Drizzle, providers (Veo, Runway, Kling, Pika, Luma, HuggingFace, Wan), brand/audience/campaign intelligence, marketplace-aware product normalizers, prompt orchestration, caching, circuit breakers/retries, queue worker
- `src/video-studio/` — `StudioShell` + 9 sections (dashboard, analyzer, marketplace, generation, queue, history, providers, brand, settings)
- Wired into the existing `video` tab in `App.tsx`, replacing the old single-file `VideoStudio.tsx` (kept on disk, unused, per your "never delete before validated" rule)

### Modified files (7)
- `package.json` — added `drizzle-orm`; fixed a pre-existing postinstall crash (unrelated to the merge, found during install)
- `server/db.ts` — added `getPool()` so the Video Studio's Drizzle layer reuses the *same* pg pool (no second connection)
- `server/core/middleware/AuthMiddleware.ts` — added `attachVideoStudioContext`, a one-line shim mapping `req.user` → `req.userId`/`req.userEmail`
- `server/db/postgres/schema.sql` + `schemaSql.ts` — appended the new module's tables (idempotent `CREATE TABLE IF NOT EXISTS`, DO-block-guarded FKs)
- `server.ts` — new imports, a route-scoped 5MB body parser for `/api/video` (mirrors the existing `/api/images` pattern), `mountVideoStudio()` call, old inline `/api/video/*` endpoints commented out (not deleted)
- `src/App.tsx` — video tab now renders the new `StudioShell`

### New file: `scripts/fix-framer-motion.cjs`
Renamed from `.js` — the original crashed on install because it used CommonJS `require()` inside a `"type": "module"` package. Pre-existing bug, unrelated to the merge, found while running `npm install`.

---

## Architecture decisions made

**Database:** Video Studio uses Drizzle ORM against a set of new tables (`video_templates`, `video_history`, `video_cache`, `video_providers`, `provider_*`, `brand_profiles`, `audience_profiles`, `campaign_*`, `prompt_blocks`) that share AuraPost's existing pg pool. No table-name collisions with AuraPost's own tables (`video_generations`, `workspace_ai_providers`) — this is a clean additive merge, not a replacement, so a data migration script (below) carries old history forward rather than a schema rename.

**Auth:** Video Studio's own cookie/CSRF security layer was **not** used — it assumed a session-cookie model that doesn't match AuraPost's JWT-bearer auth. Instead, every `/api/video/*` route runs through AuraPost's real `requireAuthAndWorkspace()`, with a one-line adapter for the different field names. Verified: unauthenticated requests get a real 401, not a silent bypass.

**Credits:** The original Video Studio module had **zero** integration with AuraPost's credit system. Added: a balance check (`checkCreditBalance('video')`) before a job is queued, and a real deduction (`consumeCredits('video_consume')`) when a job completes — cache hits stay free.

**Frontend styling:** The module's CSS used Tailwind v3 directives and unscoped `body`/`:root`/`*` selectors that would have silently overridden AuraPost's existing dark theme app-wide. Rescoped everything to `.studio-root` and updated to Tailwind v4 syntax (confirmed via the actual production build).

---

## Known gaps — deliberately not auto-migrated

**Provider API keys**: `workspace_ai_providers` (AuraPost's existing encrypted key storage, which already has entries for `kling`/`veo`/`runway`/`pika`) was **not** automatically migrated into the new module's `provider_settings.apiKeys`. Attempting to re-encrypt across two different schemes without visibility into the exact encryption implementation risked silently corrupting keys. Recommended: reconnect providers manually through the new Providers panel.

**`video_generations` → `video_history`**: A real migration script exists at `server/video-studio/scripts/migrateVideoGenerationsToHistory.ts`, run and verified against a live DB. It only migrates *completed* generations with a real video URL, and since the old table has no `user_id` column, it attributes each row to the workspace's owner (`workspace_members.role = 'owner'`) — logged explicitly, with any workspace lacking a resolvable owner skipped and reported rather than guessed at.

**Audit log integration**: The old `VideoStudio.tsx` passed an `onAddAuditLog` callback into AuraPost's audit trail; the new `StudioShell` is self-contained and doesn't call it. Video actions won't appear in AuraPost's audit log until this is wired up — a reasonable follow-up, not done silently.

---

## Notable bugs fixed along the way (not merge artifacts — real pre-existing issues in the Video Studio source)

- Undefined variable reference in `TemplateRankingService.ts`
- Zod v3→v4 breaking change (`z.record()` needs two args now) in 3 validation files
- A dropped `currency` field in the Shopify product normalizer
- A `logger.error()` call-signature misuse
- Two frontend type mismatches (an untyped platform list, and a "categories" endpoint typed as singular when it returns a list)
- A genuine TypeScript inference limitation in Drizzle's insert/update mapped types that only surfaces when this many tables are checked together in one program (confirmed via isolated repro — schema and runtime are correct); fixed properly by replacing the fragile inferred types with explicit, hand-written ones in `types/entities.ts` rather than suppressing errors

## To deploy
1. `npm install`
2. Ensure `DATABASE_URL` is set (schema auto-applies on boot, additive/idempotent)
3. `npx tsx server/video-studio/seeds/runSeeds.ts` — seeds templates/prompt blocks/providers
4. `npx tsx server/video-studio/scripts/migrateVideoGenerationsToHistory.ts` — carries forward old video history
5. Reconnect video provider API keys via the new Providers panel
6. `npm run build && npm start`
