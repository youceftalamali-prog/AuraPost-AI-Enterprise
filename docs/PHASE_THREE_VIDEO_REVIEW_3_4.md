# Phase 3.4 — Video Review & Scene Regeneration

## Review, revision and approval pipeline

- Reviews are persisted with optimistic versions and workspace/user isolation.
- Frame-bounded annotations can be resolved without mutating historical video files.
- Caption-only and visual scene revisions create private immutable MP4 versions while preserving target dimensions, duration, scene order and product integrity.
- Approval requires every annotation to be resolved and every requested revision to have a successful execution job.
- Approved reviews are immutable.
- The version timeline returns original and revised videos through 15-minute signed URLs.
- The latest successful version per target is marked current, while every original remains available for rollback.
- Storage keys are never returned.
- Publishing, scheduling, Smart Repost and paid ads remain disabled.

## Approval and version API

- `PATCH /api/agent/workflows/:workflowId/video-reviews/:reviewId/annotations/:annotationId`
- `POST /api/agent/workflows/:workflowId/video-reviews/:reviewId/approve`
- `GET /api/agent/workflows/:workflowId/video-reviews/:reviewId/versions`
