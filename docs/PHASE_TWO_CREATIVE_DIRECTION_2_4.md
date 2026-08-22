# Phase 2.4 — Creative Direction

Aura converts the latest Campaign Content Package into a reviewable, versioned production direction. It does not generate media or publish content.

## Output

- visual concept, mood, palette, typography, composition, lighting, and texture guidance
- product hero, detail, and lifestyle presentation
- prohibited product alterations
- platform aspect ratios, safe zones, text density, and pacing
- timed storyboards with framing, action, camera motion, lighting, overlays, voiceover, and asset prompts
- image prompts and negative prompts
- visual continuity, transitions, audio mood, caption style
- accessibility and compliance guidance

## Controls

- latest Campaign Content Package and its approved source brief are required
- AR/FR/EN output follows the Aura workflow locale
- evidence-reference validation and unsupported-claim rejection
- strict bounds, six-digit color validation, aspect-ratio validation, and storyboard timing checks
- 256 KiB payload maximum
- idempotent request reservation
- immutable versions and optimistic approval revisions
- atomic 15-credit debit and persistence
- authenticated workspace/user/workflow isolation

## API

- `GET /api/agent/workflows/:workflowId/creative-directions/latest`
- `POST /api/agent/workflows/:workflowId/creative-directions/generate`
- `PATCH /api/agent/workflows/:workflowId/creative-directions/:directionId`

Approval prepares the direction for Phase 2.5 Campaign Export. No image generation, video generation, social publishing, scheduling, paid ads, or Smart Repost is triggered.
