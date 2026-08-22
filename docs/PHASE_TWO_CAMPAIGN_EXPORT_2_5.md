# Phase 2.5 — Campaign Export

Aura creates an immutable, portable snapshot from the latest approved Campaign Brief, its current Content Package, and the approved Creative Direction linked to that package.

## Formats

- JSON: machine-readable manifest and complete campaign bundle
- Markdown: human-readable brief, evidence, copy, scripts, landing page, visual system, storyboards, prompts, accessibility, and compliance notes

## Integrity and privacy

- deterministic SHA-256 checksum over the canonical campaign bundle
- source business versions recorded in the manifest
- no workspace or user identifiers inside downloaded files
- two MiB bundle limit
- HTML/control-character escaping in Markdown
- authenticated workspace/user/workflow isolation on creation and download
- immutable export versions and latest pointer
- required idempotency key and transaction-scoped workflow lock
- `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`
- safe server-generated filenames

## API

- `GET /api/agent/workflows/:workflowId/exports/latest`
- `POST /api/agent/workflows/:workflowId/exports`
- `GET /api/agent/workflows/:workflowId/exports/:exportId/download?format=json|markdown`

Export is deterministic and does not consume AI credits. It never publishes, schedules, connects accounts, buys ads, or triggers Smart Repost.
