import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;

let realDb: Database | null = null;
let sharedPool: Pool | null = null;

/**
 * Initializes the Video Studio's Drizzle layer using AuraPost's existing,
 * already-connected pg Pool (DatabaseManager.getInstance().getPool()).
 *
 * IMPORTANT: this must be called exactly once at server startup, right after
 * DatabaseManager.getInstance() resolves and before any Video Studio route
 * can be hit (see server.ts). It intentionally never creates its own Pool -
 * AuraPost's PostgreSQL connection is reused as-is, so there is only ever one
 * pool, one set of connection-limit/env settings, and one place that owns
 * shutdown.
 */
export function initVideoStudioDb(pool: Pool): Database {
  sharedPool = pool;
  realDb = drizzle(pool, { schema });
  return realDb;
}

/**
 * Raw pool access for the few call sites (health checks) that need it
 * directly rather than through Drizzle. Same underlying connection as
 * everything else - never a second pool.
 */
export function getVideoStudioPool(): Pool {
  if (!sharedPool) {
    throw new Error('Video Studio pool accessed before initVideoStudioDb() was called.');
  }
  return sharedPool;
}

function getDb(): Database {
  if (!realDb) {
    throw new Error(
      'Video Studio database accessed before initialization. ' +
        'initVideoStudioDb(pool) must be called at server startup (see server.ts) ' +
        'before handling any /api/video request.'
    );
  }
  return realDb;
}

/**
 * Every Video Studio repository imports `{ db }` from this module and calls
 * it synchronously (e.g. `db.select().from(...)`). This Proxy preserves that
 * exact call pattern unchanged while deferring to the real Drizzle instance
 * created from AuraPost's shared pool at startup.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
}) as Database;
