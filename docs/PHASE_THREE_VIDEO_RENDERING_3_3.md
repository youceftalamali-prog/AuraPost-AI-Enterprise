# Phase 3.3 — Video Rendering Engine

## Engine contract

`videoRenderEngine.ts` converts an approved frame-accurate render target plus generated scene images into a private H.264 MP4. Commands use `spawn` with `shell: false`; no user text is placed in command arguments. Captions are escaped and rasterized by Sharp before FFmpeg.

## Output policy

- 30 FPS, H.264, yuv420p, AAC silent track, MP4 faststart.
- Approved target dimensions and durations only.
- 250 MiB output limit.
- FFprobe verifies codec, dimensions and duration before storage or billing settlement.
- Temporary files are removed in `finally` on success or failure.
- Rendering remains locked until `VIDEO_RENDER_ENGINE_VERIFIED=true` after a deployment smoke test.

## Required deployment configuration

```env
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
VIDEO_RENDER_ENGINE_VERIFIED=false
```

Do not set the verification flag to true until both binaries, codecs, writable temporary storage, CPU/memory limits and object storage uploads pass in the real deployment.

## Next integration slice

The durable render-batch API connects this engine to the approved Production Blueprint and completed Phase 3.2 media batch, atomically reserves/refunds video credits, stores MP4 output through `StorageProvider`, and exposes signed preview URLs in Aura. Publishing remains disabled.
