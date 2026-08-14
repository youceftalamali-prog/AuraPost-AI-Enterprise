# Phase 3.4 — Video Review & Scene Regeneration

## Phase 3.4.3 selective regeneration

- A revision executes only against a successful source render owned by the same workspace and review.
- Caption-only revisions reuse the approved image asset and reserve only video credits.
- Visual revisions generate one replacement image, reserve AI and video credits separately, and keep every untouched scene asset unchanged.
- The approved target dimensions, scene order, scene durations, product-preservation rule and render plan remain immutable.
- Each revision creates private replacement-image and MP4 objects under a revision-specific storage prefix.
- The previous successful video remains untouched and available for rollback.
- Credit reservation is transactional across AI and video buckets; any provider, render, validation or storage failure refunds both reservations.
- API responses expose only 15-minute signed video URLs, hashes and metadata, never storage keys.

## API

- `GET /api/agent/workflows/:workflowId/video-reviews/:reviewId/revisions/:revisionId`
- `POST /api/agent/workflows/:workflowId/video-reviews/:reviewId/revisions/:revisionId/execute`

## Deployment gates

Visual revisions require the verified image-provider gate. Every revision requires the verified FFmpeg/FFprobe gate. Publishing, scheduling, Smart Repost and paid ads remain disabled.
