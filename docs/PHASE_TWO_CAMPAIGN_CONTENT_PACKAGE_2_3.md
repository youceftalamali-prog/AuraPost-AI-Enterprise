# Phase 2.3 — Campaign Content Package

Aura generates a versioned multilingual content package only from the latest approved Campaign Brief.

## Package

- hooks
- short-form video scripts with ordered scenes
- platform-specific ad copy
- short, long, and SEO product descriptions
- lifecycle emails
- landing-page copy, objections, and FAQ
- image prompts and video concepts for later creative stages

## Integrity controls

- approved-brief gate
- product/workspace isolation
- evidence references validated against the approved brief
- rejection of unsupported percentages, guarantees, rankings, scarcity, shipping, certifications, and similar claims
- strict bounded JSON contract (256 KiB maximum)
- provider failures fail honestly; no production fallback package
- immutable package versions and latest pointer
- required idempotency key with in-progress/completed/failed request states
- atomic PostgreSQL credit debit and package persistence (20 AI credits)

## API

- `GET /api/agent/workflows/:workflowId/content-packages/latest`
- `POST /api/agent/workflows/:workflowId/content-packages/generate`

Generation does not publish, schedule, connect social accounts, purchase ads, or trigger Smart Repost. The generated package remains reviewable content for the next creative stages.
