# Phase 3.2 — Media Asset Generation

## Scope

This phase turns the approved `aurapost.production-blueprint.v1` asset slots into durable, tenant-isolated media jobs. It generates scene images only; voiceover stays explicitly blocked until a verified TTS provider is introduced. Product-reference slots are preserved as references and are not regenerated.

## Safety and billing

- An approved latest Production Blueprint is mandatory.
- Generation is locked unless `MEDIA_ASSET_PROVIDER_VERIFIED=true` (or isolated `TEST_MODE=true`).
- Supported byte-returning providers are `gemini_images` and `stability_ai`; remote provider URLs are rejected so temporary or untrusted files are never persisted as campaign assets.
- Each image reserves 20 AI credits atomically before the provider call.
- Failed provider, validation, conversion, or storage operations refund those 20 credits atomically.
- Provider error bodies are never stored or returned. Jobs expose stable error codes only.
- Output is decoded with a 25 MiB limit, normalized with Sharp to the target dimensions, converted to WebP, checksummed with SHA-256, and stored privately through `StorageProvider`.
- Read APIs issue 15-minute signed URLs; storage keys remain server-side.

## API

- `GET /api/agent/workflows/:workflowId/media-assets/latest`
- `POST /api/agent/workflows/:workflowId/media-assets`
- `POST /api/agent/workflows/:workflowId/media-assets/:batchId/generate-next`
- `POST /api/agent/workflows/:workflowId/media-assets/:batchId/cancel`

`generate-next` processes one durable job per call. Aura can call it repeatedly to complete a batch without holding one request open for the entire campaign.

## Deferred

- TTS/voiceover provider execution.
- Video composition and render queue (Phase 3.3).
- Scene-level review/regeneration controls (Phase 3.4).
- Publishing, scheduling, social connections, paid ads, and Smart Repost remain disabled for V1.
