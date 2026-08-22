# Phase 3.5 — Production Export & Delivery Package

- Requires the latest immutable Campaign Export and an approved Video Review.
- Selects exactly one latest successful video version per production target.
- Keeps original and revision objects private; delivery assets are exposed only through authenticated download routes and five-minute signed redirects.
- Records campaign, review and blueprint hashes plus per-video SHA-256, dimensions, duration, codec and size.
- Creates immutable versioned delivery manifests with JSON and Markdown downloads.
- Originals remain in storage for rollback even when a revision is selected for delivery.
- The Aura AR/FR/EN delivery view previews and downloads approved MP4 files.
- Delivery consumes no AI, video or publishing credits.
- Publishing, scheduling, social connections, paid ads and Smart Repost remain disabled.

## API

- `GET /api/agent/workflows/:workflowId/production-deliveries/latest`
- `POST /api/agent/workflows/:workflowId/production-deliveries`
- `GET /api/agent/workflows/:workflowId/production-deliveries/:deliveryId/download?format=json|markdown`
- `GET /api/agent/workflows/:workflowId/production-deliveries/:deliveryId/assets/:assetId/download`
