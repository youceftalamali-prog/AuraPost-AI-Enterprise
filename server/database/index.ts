import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

// Deliberately NOT `NodePgDatabase<typeof schema>` — see the note on
// initAssetsProjectsDb below. The generic must be omitted here too, not
// just at the `drizzle()` call site, since this is the type every
// repository's `db` import is statically checked against.
export type Database = NodePgDatabase;

let realDb: Database | null = null;
let sharedPool: Pool | null = null;

/**
 * Initializes the Assets + Projects modules' Drizzle layer using AuraPost's
 * existing, already-connected pg Pool — exactly the pattern already
 * established for Video Studio (server/video-studio/db/index.ts). Must be
 * called exactly once at server startup (see server.ts), before any
 * /api/assets or /api/projects request can be handled. Never creates a
 * second Pool — one connection, one place that owns shutdown.
 *
 * Deliberately NOT passed a `{ schema }` config: no repository in either
 * module uses Drizzle's relational query API (`db.query.assets.findMany()`)
 * — every repository uses the plain query builder (`db.select()`,
 * `db.update().set()`, `db.insert().values()`). Passing `{ schema }` when
 * it isn't needed turns on "schema mode," which (confirmed via isolated
 * type-check — see PRODUCTION_REPORT.md) breaks TypeScript's inferred
 * `.update(table).set(...)` type for every table, rejecting real columns
 * as "unknown properties." Omitting it restores correct typing everywhere
 * and costs nothing, since the relational API was never used.
 */
export function initAssetsProjectsDb(pool: Pool): Database {
  sharedPool = pool;
  realDb = drizzle(pool) as Database;
  return realDb;
}

export function getAssetsProjectsPool(): Pool {
  if (!sharedPool) {
    throw new Error('Assets/Projects pool accessed before initAssetsProjectsDb() was called.');
  }
  return sharedPool;
}

function getDb(): Database {
  if (!realDb) {
    throw new Error(
      'Assets/Projects database accessed before initialization. ' +
        'initAssetsProjectsDb(pool) must be called at server startup (see server.ts) ' +
        'before handling any /api/assets or /api/projects request.'
    );
  }
  return realDb;
}

/**
 * Every Assets/Projects repository imports `{ db }` from this module and
 * calls it synchronously (e.g. `db.select().from(...)`). This Proxy
 * preserves that exact call pattern unchanged while deferring to the real
 * Drizzle instance created from AuraPost's shared pool at startup.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
}) as Database;
