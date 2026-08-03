# Legacy `image_studio_projects` / `/api/images/projects*` — Dependency Report

Generated before touching any legacy code, per instruction. Full-repo grep for every identifier tied to the legacy surface (table name, db.ts methods, HTTP paths).

## 1. `image_studio_projects` (table)

| Consumer | Type | Action |
|---|---|---|
| `server/db.ts` (4 methods: `saveImageStudioProject`, `getImageStudioProjects`, `deleteImageStudioProject`, `duplicateImageStudioProject`) | Live code, called only from `server.ts` | **Adapter-first**: methods rewritten to delegate to the new Projects module (see below) rather than deleted outright, so the exported method names keep working for any caller not yet re-pointed. |
| `server/db/postgres/schemaSql.ts`, `schema.sql` | Boot-time table creation | Already handled: `CREATE TABLE` removed from the boot script (existing DBs keep the table until the migration script is run; fresh DBs never create it — see AUDIT_REPORT.md Issue #1). |
| `scripts/migrate-image-studio-projects.ts` | New, purpose-built backfill | Reads the legacy table explicitly by design; not affected. |
| `scripts/migrate-sqlite-to-postgres.ts` | **Historical** SQLite→Postgres one-time migration (predates this merge, moves a legacy SQLite file's tables into Postgres) | **Not touched.** It's a one-time bootstrap script for an even earlier deployment path, not part of the running app's request path — copying `image_studio_projects` rows from a SQLite export is exactly its job and stays correct regardless of the new schema, since it just seeds the same table the new backfill script then picks up. |
| `DIFFS/*.md`, `PATCHES/*.patch` | Historical diff/patch artifacts from a prior audit session | Static records of past changes, not executed by the app. Left as-is. |

## 2. `/api/images/projects*` (HTTP surface)

| Consumer | Type | Contract needed | Action |
|---|---|---|---|
| `src/components/ImageStudio.tsx` (5 call sites: list, save, delete, duplicate) | **Live frontend**, actively rendered in `App.tsx` | Exact existing request/response JSON shape (`{id, workspaceId, name, aspectRatio, canvasWidth, canvasHeight, layers, createdAt, updatedAt}`) | **Must not break.** Endpoint paths/methods/response shape preserved exactly; only the auth requirement changes (was: none: now: Bearer token, matching `tests/api.test.ts` below). |
| `tests/api.test.ts` (line 59) | **Existing test**, already asserts `/api/images/projects` is in the `protectedEndpoints` list and must reject unauthenticated requests | Confirms auth was already the intended contract — this test is presumably failing today since the route currently has zero auth. | Adding `requireAuth`/`requireWorkspaceAccess` makes this existing (previously-failing) test pass; no test changes needed. |
| `scripts/audit_and_test.ts` (line 181) | Smoke-test script, sends `Authorization: Bearer <token>` from a prior login step for every call | Any authenticated 2xx response | Compatible as-is; no script changes needed. |

## 3. Verdict (pre-implementation)

No consumer requires the raw `image_studio_projects` table or an unauthenticated route — the frontend only depends on the HTTP contract (preserved), and the one test that references the endpoint actually expects the auth this migration adds. Safe to proceed with:

- Rewriting the 4 `server/db.ts` methods to delegate to the new Projects module (adapter — see `server/projects/legacyImageStudioAdapter.ts`), keeping their signatures unchanged.
- Adding `requireAuth` + `requireWorkspaceAccess` to the 4 `/api/images/projects*` routes in `server.ts`.
- **Not** dropping the legacy table automatically — it stays until `scripts/migrate-image-studio-projects.ts --drop-legacy-table` is run explicitly, after production data is verified migrated.

## 4. Final disposition (post-implementation)

- `server.ts`'s 4 routes now call `server/projects/legacyImageStudioAdapter.ts` directly (auth added: `requireAuth` + `requireWorkspaceAccess`).
- `server/db.ts`'s 4 methods were **not deleted** — kept as explicitly `@deprecated` thin delegates to the same adapter (so any undiscovered external caller still gets correct, consistent data instead of silently breaking or writing to the orphaned table). Flagged as a deletion candidate for a follow-up cleanup pass after a full deploy cycle confirms zero calls in production logs.
- Legacy `image_studio_projects` table itself: left in the database (not dropped) until `scripts/migrate-image-studio-projects.ts --drop-legacy-table` is run explicitly.
