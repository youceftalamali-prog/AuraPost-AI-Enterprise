# Phase 3.4 — Video Review & Scene Regeneration

## Foundation

- Versioned deterministic `aurapost.video-review.v1` contract.
- Frame-bounded annotations for visual, caption, timing and compliance feedback.
- Scene revision requests reference one rendered target and one approved scene.
- Revisions may replace a visual prompt and/or overlay text while preserving scene duration and product integrity.
- Duplicate revision requests are idempotent by SHA-256.
- Approved reviews are immutable.
- Approval is blocked while annotations or revision requests remain unresolved.

## Safety boundary

This foundation plans review and selective revision only. It does not call an image provider, reserve credits, replace a successful video, or publish content. The next slice persists reviews and revision attempts, regenerates only the selected scene, re-renders a new immutable video version, and keeps the previous successful version available for rollback.
