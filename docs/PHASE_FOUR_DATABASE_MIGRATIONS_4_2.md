# Phase 4.2 — Unified Database Migrations & Runtime Hardening

## 4.2.1 Central migration foundation

- `server/database/auraMigrations.ts` is the canonical ordered Aura V1 schema plan.
- Migrations run behind a PostgreSQL transaction-scoped advisory lock.
- Each migration is recorded in `aura_schema_migrations` with a SHA-256 checksum.
- A changed applied migration fails closed instead of silently drifting production schema.
- All Aura API requests wait for the startup migration barrier.
- Migration failures roll back atomically and propagate to the server error boundary.
- The central plan covers workflows, campaign content, creative direction, export, production blueprint, media, render, review, revision and delivery tables.

## Remaining 4.2 work

- remove compatibility `CREATE TABLE IF NOT EXISTS` blocks from legacy Aura routers after PostgreSQL integration verification;
- split future schema changes into append-only numbered migrations;
- add PostgreSQL upgrade, rollback and concurrent-start integration tests.
