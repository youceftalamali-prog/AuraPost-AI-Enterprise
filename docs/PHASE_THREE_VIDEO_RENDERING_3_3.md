# Phase 3.3 — Video Rendering Engine

## Delivered

- Deterministic `aurapost.video-render-plan.v1` contracts.
- Durable PostgreSQL render batches and target jobs.
- Lifecycle: planned, processing, succeeded, failed, cancelled; failed jobs can retry.
- Approved Production Blueprint and completed matching Media Asset batch are hard prerequisites.
- Atomic `video` credit reservation, success settlement and failure refund with ledger entries.
- Stale processing jobs recover after 30 minutes.
- FFmpeg uses argv with `shell: false`; diagnostics are bounded and timeouts kill the process.
- Sharp rasterizes escaped caption layers before FFmpeg.
- H.264/yuv420p/AAC MP4 faststart output; FFprobe validates codec, dimensions and duration.
- Private StorageProvider upload with SHA-256 and 15-minute signed read URLs; storage keys are never returned.
- AR/FR/EN Aura interface with progress, preview, download, retry and cancellation.
- Workflow handoff: Media Asset Generation → Video Rendering → Campaign Export.

## API

- `GET /api/agent/workflows/:workflowId/video-renders/latest`
- `POST /api/agent/workflows/:workflowId/video-renders`
- `POST /api/agent/workflows/:workflowId/video-renders/:batchId/render-next`
- `POST /api/agent/workflows/:workflowId/video-renders/:batchId/cancel`

## Deployment gate

```env
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
VIDEO_RENDER_ENGINE_VERIFIED=false
```

Keep the verified flag false until real deployment smoke tests verify binaries, codecs, writable temporary storage, CPU/memory/time limits and private object-storage upload. No credits are reserved while the gate is closed. Publishing, scheduling, Smart Repost and paid ads remain outside V1.
