# Phase 3.3 — Video Rendering Engine

## Implemented foundation

- Deterministic `aurapost.video-render-plan.v1` contracts.
- Durable-job lifecycle contract: planned, processing, succeeded, failed and cancelled.
- Failed jobs may retry; completed or cancelled jobs are terminal.
- Per-job credit reservation, charge and refund accounting fields.
- FFmpeg rendering with `shell: false`, bounded diagnostics, timeout and guaranteed temporary-file cleanup.
- Sharp-generated caption layers; user text never enters FFmpeg arguments.
- H.264/yuv420p/AAC MP4 faststart output and FFprobe validation.
- 250 MiB output limit.

## Deployment gate

```env
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
VIDEO_RENDER_ENGINE_VERIFIED=false
```

The verified flag must remain false until deployment smoke tests pass.

## Remaining integration slice

Persist batches/jobs in PostgreSQL, resolve approved blueprint and completed media assets, reserve/refund `video` credits atomically, upload private output through StorageProvider, expose signed previews, and add the AR/FR/EN Aura render view. Publishing remains outside V1.
