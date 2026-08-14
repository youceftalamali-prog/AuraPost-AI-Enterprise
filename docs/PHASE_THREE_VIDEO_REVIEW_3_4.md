# Phase 3.4 — Video Review & Scene Regeneration

## Delivered foundation and persistence

- Versioned deterministic `aurapost.video-review.v1` contract.
- PostgreSQL-backed reviews scoped by workflow, workspace and user.
- Review creation requires the latest completed Video Rendering batch.
- Frame-bounded annotations for visual, caption, timing and compliance feedback.
- Optimistic version checks prevent two sessions from silently overwriting feedback.
- Scene revision requests reference one rendered job and approved scene.
- Revisions may replace a visual prompt and/or overlay text while preserving scene duration and product integrity.
- Duplicate revision requests are idempotent by SHA-256.
- Approved reviews are immutable.

## API

- `GET /api/agent/workflows/:workflowId/video-reviews/latest`
- `POST /api/agent/workflows/:workflowId/video-reviews`
- `POST /api/agent/workflows/:workflowId/video-reviews/:reviewId/annotations`
- `POST /api/agent/workflows/:workflowId/video-reviews/:reviewId/revisions`

## Safety boundary

The current slice persists review and revision intent only. It does not call an image provider, reserve credits, replace a successful video, or publish content. The selective-regeneration slice will regenerate only the chosen scene, create a new immutable video version, preserve the previous successful version for rollback, and settle credits only for completed work.
