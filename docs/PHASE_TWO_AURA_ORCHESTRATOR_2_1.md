# Phase 2.1 — Persistent Aura Orchestrator

## Goal

Move Aura workflow context from a 30-minute browser-memory handoff to an authenticated, workspace-scoped PostgreSQL record that can be resumed safely across refreshes and devices.

## API

All routes require the existing JWT and verified workspace membership. The server ignores client-supplied workspace/user identities and reads both from the authenticated request context.

- `GET /api/agent/workflows/active`
- `GET /api/agent/workflows/:workflowId`
- `POST /api/agent/workflows`
- `PATCH /api/agent/workflows/:workflowId`

`POST` accepts `Idempotency-Key`; replaying the same key returns the original workflow. `PATCH` requires `expectedVersion` and returns `409 AGENT_WORKFLOW_VERSION_CONFLICT` for stale writes.

## Persisted context

- source mode and multilingual prompt
- locale (`ar`, `fr`, `en`)
- selected template and product
- current deterministic workflow step
- market and creative context (32 KiB each)
- workflow status and version

## Security and integrity

- workspace/user isolation on every query
- product ownership check before linking a product
- parameterized SQL only
- bounded strings and JSON context
- control-character cleanup
- idempotent creation
- optimistic concurrency on updates
- no publishing, scheduling, paid ads, or Smart Repost execution

## Next integration slice

The Agent-first React workspace will create/resume this server workflow and update it when Aura moves between import, product selection, market analysis, content, image, and video tools.
