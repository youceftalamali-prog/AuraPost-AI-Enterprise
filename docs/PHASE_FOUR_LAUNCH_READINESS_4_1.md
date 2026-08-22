# Phase 4.1 — V1 Launch Readiness Gate

- Provides one fail-closed readiness contract for an authenticated Aura workflow.
- Verifies the V1 release marker, production mode, required PostgreSQL tables, private storage availability and every approved production handoff.
- Blocks readiness if publishing, social connections, Smart Repost or paid ads are enabled before V2 licensing.
- Reports stable blocking codes without secrets, credentials, storage keys, workspace IDs or user IDs.
- Uses `Cache-Control: private, no-store`.
- Readiness is observational and never starts providers, consumes credits, publishes content or changes workflow state.

## API

- `GET /api/agent/workflows/:workflowId/launch-readiness`

HTTP 200 means ready. HTTP 409 returns the same structured report with blocking codes.
