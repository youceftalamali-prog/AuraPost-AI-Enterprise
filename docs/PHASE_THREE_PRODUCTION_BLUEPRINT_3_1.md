# Phase 3.1 — Production Blueprint and Scene Graph

Phase 3 begins with a deterministic compilation gate between approved Creative Direction and paid media generation.

## Contract

Aura compiles the latest approved Creative Direction into an immutable `aurapost.production-blueprint.v1` document. Each storyboard becomes a render target with explicit dimensions, 30 FPS timing, safe areas, frame-accurate scenes, ordered layers, transitions, asset slots, accessibility rules, product-preservation rules, and compliance notes.

Supported render targets are `9:16`, `16:9`, `1:1`, and `4:5`. Unsupported ratios fail closed so the source direction can be corrected instead of silently cropped.

## Safety and cost boundary

Creating or approving a blueprint does not call an AI/media provider, render video, charge credits, publish, schedule, connect social accounts, or buy ads. Required assets remain in `planned` state for Phase 3.2.

Blueprint content is limited to 512 KiB and receives a deterministic SHA-256 content hash. Portable scene IDs and asset-slot IDs never expose user or workspace identifiers.

## Persistence

`aura_production_blueprints` stores immutable business versions, optimistic review revisions, the exact source Brief/Content Package/Creative Direction IDs, locale, status, hash, and latest pointer. Creation requires `Idempotency-Key`, authenticated workspace/user/workflow isolation, and a PostgreSQL transaction advisory lock.

## API

- `GET /api/agent/workflows/:workflowId/production-blueprints/latest`
- `POST /api/agent/workflows/:workflowId/production-blueprints`
- `PATCH /api/agent/workflows/:workflowId/production-blueprints/:blueprintId`

Approval is the gate for Phase 3.2 asset generation.
