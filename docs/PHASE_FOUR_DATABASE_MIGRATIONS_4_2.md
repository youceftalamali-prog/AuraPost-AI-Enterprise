# Phase 4.2 — Unified Database Migrations & Runtime Hardening

## 4.2.1 Central migration foundation

- `server/database/auraMigrations.ts` is the canonical ordered Aura V1 schema plan.
- Migrations run behind a PostgreSQL transaction-scoped advisory lock.
- Each migration is recorded in `aura_schema_migrations` with a SHA-256 checksum.
- A changed applied migration fails closed instead of silently drifting production schema.
- All Aura API requests wait for the startup migration barrier.
- Migration failures roll back atomically and propagate to the server error boundary.

## 4.2.2 Router DDL retirement and PostgreSQL verification

- Aura routers receive a migration-aware Pool facade.
- Legacy inline `CREATE TABLE IF NOT EXISTS aura_*` initialization is suppressed and never reaches PostgreSQL.
- Business queries, transactions, clients and pool methods still use the shared real Pool.
- Startup continues to fail closed until the canonical migration completes.
- Unit tests prove schema writes are intercepted while normal SQL is forwarded.
- `npm run test:migrations` runs an opt-in real PostgreSQL upgrade test when `TEST_DATABASE_URL` is available.
- The PostgreSQL test creates an isolated schema, runs two concurrent startup migrations, reruns idempotently, validates checksums and drops the schema.

Literal compatibility SQL constants can now be deleted from individual router source files without changing runtime schema ownership. Future schema changes must be new append-only numbered migrations.
