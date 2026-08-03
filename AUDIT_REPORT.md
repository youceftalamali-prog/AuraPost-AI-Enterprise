# AuraPost AI — Full Architectural Audit (Main+Video merge ⨯ Image Studio)

Scope inspected: `AuraPost-AI-merged.zip` (405 files — Main App + Video Studio, already merged) against `AuraPost_ImageAI_Reorganized.zip` (149 files — Image Studio: Assets, Projects, Canvas Engine, AI providers).

Method: full file inventory diff, exported-symbol collision scan (503 imageai exports vs. 669 merged exports, exact-name matched), grep-verified inspection of every flagged collision, DB schema/table cross-reference, route/mount pattern trace, storage/upload trace, TODO/mock scan. Items requiring a live build (bundle size, tree-shaking, full circular-import graph) are marked **deferred to build phase** below with the reason, rather than estimated.

---

## 1. Critical Issues (must resolve before/during merge)

| # | Issue | Location | Risk | Fix | Impact |
|---|---|---|---|---|---|
| 1 | **Live duplicate persistence for image projects.** A legacy `image_studio_projects` table (flat `layers TEXT` blob, no versions/pages/sharing) is actively read/written today via `server/db.ts` (raw SQL, lines ~4510-4565) and declared in `schema.sql`/`schemaSql.ts`. Image Studio's new `projects.schema.ts` (Drizzle) defines a completely different, richer model: `projects` + `project_pages` + `project_versions` + `project_shares` + `project_activity_logs`, where `Project.type` already includes `'video'` alongside `'design'/'template'/'brand'/'social'/'print'` — i.e. it was designed to be the *one* project system. | `server/db.ts`, `server/db/postgres/schema.sql` vs. `imageai/server/database/schema/projects.schema.ts` | **High** — data loss / two sources of truth for "a project" if left as-is | Write a one-time migration: read every `image_studio_projects` row, create an equivalent `projects` row (`type='design'`) + one `project_pages` row holding the existing `layers` JSON, then drop the legacy table and all `server/db.ts` methods that touch it. | Removes the exact "duplicate model" scenario the brief calls out; unifies image + video under one Project System (goal already half-satisfied by the schema design). |
| 2 | **New Assets/Projects modules mounted before the app's blanket auth gate, so they need their own auth wiring.** ~~Every controller/route in `imageai/server/modules/{assets,projects}` has no reference to `req.user`~~ — **correction after implementation**: `server.ts` already has a blanket `app.use("/api", requireAuthAndWorkspace())` gate (added in a prior security pass) covering every `/api/*` route registered *after* it, which already protected the legacy `/api/images/projects*` routes end-to-end even before this merge — that part of the original Issue #2 claim was wrong and has been corrected. The real gap: `mountVideoStudio`/`mountAssetsProjects` are called *before* that blanket gate (line ~172 vs ~449), the same reason Video Studio already needed its own explicit auth wiring — so the new Assets/Projects modules needed the same, which is what was actually missing. | `imageai/server/modules/{assets,projects}/routes/*.ts`, mount order in `server.ts` | **Medium** (narrower than originally reported) | Mirror `video-studio/mount.ts`'s pattern exactly for the new modules (done — see `server/mountAssetsProjects.ts`). No changes needed for the legacy image routes beyond removing the redundant middleware that had been added on top of the pre-existing gate. | Assets/Projects now consistently protected; legacy routes' redundant double-auth removed to avoid duplicate logic. |
| 3 | **Asset upload is a non-functional stub with a broken import.** `AssetUploadService.ts` imports `PipelineLogger` from `'../../../../services/ad-engine/utils/PipelineLogger'` — **this path does not exist anywhere in either archive** (dangling import, would fail at compile/runtime). The actual upload/thumbnail/preview methods are `TODO: Integrate with S3/Cloudflare R2 storage service` — they just build a fake URL string (`https://storage.aurapost.ai/...`) and never write bytes anywhere. | `imageai/server/modules/assets/services/AssetUploadService.ts` | **High** — violates "no mock implementations," and it's a broken build as-is | Two things: (a) delete the dangling `PipelineLogger` import, wire to the merged project's actual logger (`server/core/logger`); (b) **there is no real storage backend in either codebase today** — video-studio's adapters reference storage only inline, no S3/R2/GCS client exists anywhere. This needs a real decision: which storage backend, since it doesn't pre-exist to "reuse." | Flagging now because it changes scope — this isn't a merge/dedupe task, it's new infrastructure that both modules currently fake. |
| 4 | **Two AI provider registries, two credit systems.** `providerRegistry` exists in both `imageai/src/features/ai/providers/ProviderRegistry.ts` (image providers: Gemini/OpenAI/Stability) and `server/video-studio/providers/video/ProviderRegistry.ts` (video providers: Veo/Runway/Kling/Pika/etc.) — same class/singleton name, different provider sets, one client-side one server-side. Credits: server already has a real ledger (`credit_ledger`, `workspace_credit_pools` tables, wired through `server/billing`) while Image Studio ships its own client-side `CreditManager.ts`. | `imageai/src/features/ai/providers/ProviderRegistry.ts`, `imageai/src/features/ai/credits/CreditManager.ts` vs. `server/video-studio/providers/video/ProviderRegistry.ts`, `server/billing/*` | **Medium-High** | Keep two *registries* (image-gen providers and video-gen providers are genuinely different provider APIs) but rename to avoid the identical export (`imageProviderRegistry` / `videoProviderRegistry`) — that satisfies "no ambiguous duplicate" without forcing incompatible provider shapes together. Credits: `CreditManager.ts` must be rewired to call the existing server-side `credit_ledger` API, not maintain its own count — the server ledger is the single source of truth per your "Only one Credit Service" requirement. | Prevents a client-trusted credit balance (security issue) and the exact "duplicate credit service" the brief flags. |

## 2. Other confirmed collisions (exact symbol name reused, different meaning)

Full symbol diff found only **4** exact-name collisions across 1,172 exported symbols — genuinely low overlap, but each is a real conflict, not a false positive:

| Symbol | imageai meaning | merged meaning |
|---|---|---|
| `AIProviderConfig` | image-provider config shape | video-provider config shape (`src/types.ts` / `server/ai/provider.ts`) |
| `ErrorHandler` | a type alias for a callback (`(error, context) => void`) | an Express error-handling function (`server/core/errors/ErrorHandler.ts`) |
| `ImageAnalysisResult` | image-editing AI analysis shape | product-photo intelligence shape (`server/video-studio/types/intelligence.ts`) |
| `providerRegistry` | see Issue #4 above | see Issue #4 above |

Fix for all four: namespace on import (`import { ProviderRegistry as ImageProviderRegistry }`) or rename at source — no shared type actually applies to both use cases, so these are not mergeable into one definition.

## 3. Non-collision findings (things that are cleanly separable — good news)

- **CSS/theming**: zero conflict. Image Studio ships no `.css` files at all — 100% Tailwind utility classes in JSX. Merged app has its own `src/index.css` + `video-studio/styles/*.css`. No tailwind config file exists at repo root (v4, config-in-CSS via `@tailwindcss/vite`), so Image Studio's Tailwind classes will resolve through the same pipeline once its components are compiled in — no theme unification work needed.
- **DB/ORM approach isn't actually a new inconsistency I'd be introducing** — correcting my earlier note: the merged repo already runs **two** DB access patterns side by side (raw SQL in `server/db/postgres/*` + `server/db.ts` for the core app, and Drizzle ORM in `server/video-studio/db/schema/*` for Video Studio, sharing the same `pg.Pool` via `initVideoStudioDb(pool)`). Image Studio's Drizzle schemas match the **Video Studio** convention exactly, not the core one. Correct move: give Assets/Projects their own `initXDb(pool)` following `server/video-studio/db/index.ts` verbatim, reusing the one shared Pool — zero new infra, zero second connection pool.
- **Route mounting precedent already exists and is documented in-repo**: `server/video-studio/mount.ts` is a clean template — injected auth middleware, injected shared Pool, `Router()` sub-app, mounted at a single path prefix. Assets/Projects modules should get `server/assets/mount.ts` and `server/projects/mount.ts` (or one combined mount) built the same way.
- **Migration numbering**: Image Studio ships `010_assets.sql` / `011_projects.sql`. Need to check the merged repo's actual migration sequence directory before assigning numbers (schema.sql is a consolidated snapshot, not the migration folder — the real migrations folder wasn't present in this zip; flagging to confirm before writing `010`/`011` so they don't collide with existing numbered migrations if any exist outside this archive).

## 4. Scan-level findings

- **TODO/mock density**: 13 TODO/mock markers in Image Studio (concentrated almost entirely in the one broken `AssetUploadService.ts` — see Issue #3) vs. 48 in the already-merged app (pre-existing, not introduced by this merge — out of scope unless you want them included in cleanup).
- **Circular imports / unused exports / bundle size / tree-shaking**: these require running the actual TypeScript compiler and bundler against the *merged* import graph (a name-level grep can't detect cycles or dead exports reliably once cross-module imports are wired up, and bundle size is meaningless before the app builds). **Deferred to the build-verification phase (step 4 of the plan below)** — I'll run `tsc --noEmit`, and a dependency-cruiser/madge pass once files are actually merged, and report real numbers rather than estimate them.

## 5. Dependency graph (module-level, post-merge target)

```
server.ts
 ├─ core/{middleware,logger,errors,config}         (shared, untouched)
 ├─ identity/*  (JWT auth)                          (shared, untouched)
 ├─ db/postgres/* + db.ts (raw SQL)                 (shared pool owner)
 ├─ billing/* + credit_ledger                       ← CreditManager.ts (imageai) rewired to call this
 ├─ video-studio/mount.ts  → Drizzle db (shared pool) → providers/video/* (videoProviderRegistry)
 ├─ assets/mount.ts [NEW]  → Drizzle db (shared pool) → modules/assets/*
 └─ projects/mount.ts [NEW]→ Drizzle db (shared pool) → modules/projects/*  (type: design|template|brand|social|print|video)

src/
 ├─ components/*                                    (shared, untouched)
 ├─ video-studio/*                                  (untouched, existing)
 └─ features/{ai,canvas}/*  [NEW from imageai]
      ├─ ai/providers  → renamed imageProviderRegistry
      ├─ ai/credits    → CreditManager.ts calls server credit_ledger API (no local balance)
      └─ canvas/*      → net-new, no existing canvas engine to dedupe against
```

## 6. Final implementation plan (unchanged order, now evidence-backed)

1. **DB migration**: write `image_studio_projects → projects/project_pages` backfill script; drop legacy table + `db.ts` methods.
2. **Server mount**: add `assets/mount.ts` + `projects/mount.ts` cloned from `video-studio/mount.ts`'s pattern (shared Pool, shared auth injection).
3. **Fix Issue #3**: remove dangling import, wire real logger; flag storage-backend decision to you before faking anything further.
4. **Rename collisions** (#4 + the 4 symbol clashes) at source.
5. **Rewire credits**: `CreditManager.ts` → server `credit_ledger` endpoints.
6. **Wire frontend**: mount `features/{ai,canvas}` into `src/components`.
7. **Build verification**: `tsc --noEmit`, madge/circular-import pass, unused-export pass — real numbers reported, not estimated.
8. **Package final ZIP.**

Audit is complete. Nothing has been modified. Waiting on your go-ahead — and specifically a decision on Issue #3 (storage backend: S3, Cloudflare R2, or local disk for now?) since that's the one item that's a genuine open product decision rather than a merge/dedupe call.
