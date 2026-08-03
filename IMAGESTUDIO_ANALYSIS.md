# `src/components/ImageStudio.tsx` — Responsibility & Architecture Analysis

2,989 lines, single default-exported function component. No code modified in this pass — analysis only, per instruction.

## 0. Shape of the file

- Lines 1–85: imports + `VisualLayer` type (a flat, DOM-positioned layer model: `x/y/width/height/rotation/color/opacity` — **not** backed by an HTML canvas for editing; a real `<canvas>` is only created transiently inside `drawAndExportCanvas()` to flatten layers into a PNG at export time).
- Lines 86–540: `TEMPLATES_LIBRARY` — a large static data array (preset layer-array templates).
- Lines 541–666: ~35 `useState` hooks + refs — one flat state bag for two entirely different features (see below).
- Lines 666–1506: ~29 handler functions (`handleX`/`loadX`), all closures over the shared state bag.
- Lines 1506 on: JSX render, gated by `activeTab === "copy" | "graphics"`, and inside `"graphics"`, by `studioSubTab` (9 values: `templates`, `ai-gen`, `backdrops`, `manual`, `camera-shoot`, `brand-kit`, `social-guides`, `audit`, `assets`).

The component is really **two products sharing one file and one state bag**: an "AI Content Studio" (product copywriting, `activeTab==="copy"`) and a "Creative Graphics Studio" (the graphics/canvas tool, `activeTab==="graphics"`). They share only: `workspaceId`, `onAddAuditLog`, `selectedProductId`/`activeProduct`, and the outer shell/tab switcher.

## 1. Major responsibilities inventory

| # | Responsibility | Key state/functions | Lines (approx) |
|---|---|---|---|
| 1 | Outer shell + top-level tab switcher (Copy Deck vs. Creative Graphics) | `activeTab` | 1512–1550 |
| 2 | **AI Content Studio**: product selection, copy-type/language selection, triggering async copywriting generation, polling/loading history, clipboard copy | `products`, `selectedProductId`, `contentType`, `languageCode`, `history`, `handleTriggerGenerate`, `loadContentHistory`, `handleCopy` | 689–926 (logic), 1551–1710 (JSX) |
| 3 | **Graphics Studio shell**: sub-tab switcher (9 modes), shared canvas dimension/export-format state | `studioSubTab`, `canvasAspectRatio`, `canvasWidth/Height`, `exportFormat`, `exportResolution` | 561–566, 1710–1804 |
| 4 | **Template library browsing/loading** (`templates` sub-tab) | `TEMPLATES_LIBRARY`, `templateSearch`, `selectedCategory`, `handleLoadTemplate` | 86–540, 1190–1203, 1804–1894 |
| 5 | **AI image generation** (`ai-gen` sub-tab): prompt input, provider/mode selection, calling `/api/images/generate` | `aiPrompt`, `aiProvider`, `aiGenMode`, `productImageBase64`, `aiGenerating`, `handleGenerateAIImage` | 619–623, 1027–1077, 1894–2033 |
| 6 | **Backdrop presets** (`backdrops` sub-tab): one-click preset backgrounds | `handleReplaceBackgroundPreset` | 1077–1093, 2033–2106 |
| 7 | **Manual layer editor / "Canvas"** (`manual` sub-tab): add/select/move/resize/rotate/delete/lock/hide/reorder layers, per-layer property panel (color, font, opacity, filters), drag interaction | `layers`, `selectedLayerId`, `layerText/Color/FontSize/Rotation/Opacity/FontFamily`, `isDragging`, `dragOffset`, `handleAddTextLayer/AddShapeLayer/AddStickerLayer/DeleteLayer/ToggleLock/ToggleVisible/MoveLayerZIndex/updateActiveLayerProp`, `handleLayerMouseDown/handleCanvasMouseMove/handleCanvasMouseUp` | 632–665, 962–1027, 1093–1249, 2106–2463 |
| 8 | **Undo/redo history** (for the manual layer editor only) | `undoStack`, `redoStack`, `commitLayersState`, `handleUndo`, `handleRedo` | 583–584, 666–689 |
| 9 | **Product photography presets** (`camera-shoot` sub-tab) — purely a prompt-preset picker that pre-fills `aiPrompt` and jumps to the `ai-gen` sub-tab | — | 2463–2525 |
| 10 | **Brand Kit sync** (`brand-kit` sub-tab): fetch brand intelligence, apply brand colors/fonts to text layers | `brandIntelligence`, `loadingBrandKit`, `loadBrandKitData`, `handleApplyBrandKitToCanvas` | 877–893, 1203–1231, 2525–2575 |
| 11 | **Social export presets** (`social-guides` sub-tab): resize canvas to platform aspect ratios | `handleResizeForSocial`, `socialOverlay` | 1231–1249, 2575–2630 |
| 12 | **AI Vision audit** (`audit` sub-tab): rasterize canvas, POST to `/api/images/analyze` (Gemini Vision), render report | `auditing`, `auditReport`, `handleRunAIVisionAudit` | 1474–1506, 2630–2709 |
| 13 | **Local "asset library"** (`assets` sub-tab): a hardcoded 2-item array, extended in-memory only by `handleSaveToAssetLibrary` (never persisted — lost on refresh) | `savedAssets`, `handleSaveToAssetLibrary` | 645–660, 1458–1474, 2709–2745 |
| 14 | **Canvas export/rasterization**: flattens `layers` into an offscreen `<canvas>`, produces a PNG data URL | `drawAndExportCanvas`, `handleDownloadCanvasPNG` | 1249–1458 |
| 15 | **Project persistence** (save/load/list/duplicate/delete "graphics" projects) — the legacy `/api/images/projects*` surface (now backed by the new Projects module via the adapter, see prior work) | `projectsList`, `activeProjectId`, `projectTitle`, `loadProjects`, `handleSaveProject`, `handleDuplicateProject`, `handleDeleteProject`, `handleLoadProject` | 689–841 |
| 16 | Product catalog loading (shared by both tabs, drives `activeProduct`) | `products`, `loadingProducts`, `loadProducts` | 841–861 |

## 2. Classification

### UI-only (pure layout/presentation, no business rules)
- Outer shell + tab/sub-tab switchers (#1, #3).
- Template gallery grid, backdrop preset grid, social-guides preset grid, camera-shoot preset grid (#4 render, #6 render, #9, #11 render) — the *rendering* of these; the underlying data (`TEMPLATES_LIBRARY`) and the state transition on click are not.
- Layer property panel form fields (inputs bound to `layerText/Color/FontSize/...`) — presentation of #7's state.
- Copy Deck cards / clipboard-copy buttons (#2's render + `handleCopy`, which is a trivial `navigator.clipboard` wrapper).

### Business logic (workspace/product rules, not tied to rendering)
- Copy generation orchestration: `handleTriggerGenerate`, `loadContentHistory` (#2).
- Undo/redo stack management: `commitLayersState`, `handleUndo`, `handleRedo` (#8) — generic, not really "business" but structural state logic, reusable as-is.
- Layer mutation logic: `handleAddTextLayer/AddShapeLayer/AddStickerLayer/DeleteLayer/ToggleLock/ToggleVisible/MoveLayerZIndex/updateActiveLayerProp`, drag handlers (#7).
- Brand Kit sync + apply (#10).
- Social resize logic (#11).
- Project CRUD orchestration (#15) — now a thin wrapper over the already-migrated Projects module via `legacyImageStudioAdapter.ts`.
- Product catalog loading (#16).

### AI-provider responsibilities (belong with the AI feature, not the component)
- `handleGenerateAIImage` → `/api/images/generate` (#5).
- `handleRunAIVisionAudit` → `/api/images/analyze` (#12).
- Camera-shoot presets (#9) are UI convenience that *feeds* the AI-gen responsibility (prompt pre-fill), not a distinct engine.
- Note: none of this currently touches `src/features/ai/*` (the new `ImageProviderRegistry`/`CreditManager`) — it's a separate, simpler direct-fetch implementation. This is a **second, parallel AI-calling path** distinct from the new `features/ai` provider abstraction — a duplication to resolve during extraction (see Risks, §5).

### Canvas Engine responsibilities (belong with `src/features/canvas`, once wired)
- The entire manual layer editor: layer data model (`VisualLayer`), add/transform/reorder/lock/visibility, drag-to-move, per-layer property editing (#7).
- Undo/redo (#8) — the new Canvas Engine (`src/features/canvas/engine`, `.../store`) almost certainly has its own, more capable history system; this is the clearest direct duplicate in the whole file.
- Canvas export/rasterization (#14) — the new Canvas Engine has its own `export/` module; this hand-rolled `drawAndExportCanvas` duplicates that.
- Template loading into layers (#4's `handleLoadTemplate`) once templates become canvas-engine documents.

### Asset Management responsibilities (belong with the new Assets module)
- The local `savedAssets` array and `handleSaveToAssetLibrary` (#13) — currently fake/non-persistent; this is a direct, low-risk swap for the real `server/assets` API (upload the exported PNG via `AssetUploadService`, list real assets instead of the hardcoded array).

### Should remain inside `ImageStudio.tsx` (or its thin successor)
- The outer shell: tab switcher, workspace/product context plumbing (`workspaceId`, `onAddAuditLog`, `selectedProductIdFromCatalog`, `activeProduct`).
- Orchestration of *which* feature module is mounted for the current tab/sub-tab (once decomposed, this file's only job).
- The AI Content Studio's copy-generation flow can plausibly stay here long-term (#2) since it has no overlap with the Canvas Engine or Assets modules — it's a genuinely distinct, self-contained feature that just happens to share this file today. (Optional future extraction to its own component, but not required by the current merge.)

## 3. Safely extractable without behavior change

These have few/no cross-cutting dependencies beyond `layers`/`workspaceId` and can become hooks or child components with prop/callback interfaces mirroring today's closures, with no observable behavior difference:

- `useUndoRedo(layers, setLayers)` — wraps #8 (`commitLayersState`/`handleUndo`/`handleRedo`). Purely generic.
- `useLayerEditor(layers, setLayers, selectedLayerId, setSelectedLayerId)` — wraps #7's mutation handlers. Self-contained given `layers` state.
- `useCanvasExport(layers, canvasWidth, canvasHeight)` — wraps `drawAndExportCanvas`/`handleDownloadCanvasPNG` (#14). Pure function of `layers` + dimensions, no other component state needed.
- `useBrandKitSync(selectedProductId)` — wraps #10's fetch + apply-to-layers (the apply half still needs `layers`/`setLayers`, so it'd take them as params).
- `<TemplateGallery>`, `<BackdropPresetGrid>`, `<SocialGuidesPanel>`, `<CameraShootPresets>` — presentational components; each just needs callbacks (`onSelectTemplate`, `onSelectBackdrop`, etc.) and read-only data.
- `<AssetLibraryPanel>` — once backed by the real Assets API, becomes a clean, mostly self-contained component (fetch + grid + "apply to canvas" callback).
- Project CRUD (#15) → `useImageStudioProjects(workspaceId)` hook — already isolated logic, only needs `layers`/`canvasWidth/Height`/`projectTitle` in and `setLayers`/`setActiveProjectId`/etc. out.

## 4. Dependencies between responsibilities (why this isn't a trivial split)

```
workspaceId, onAddAuditLog ──▶ used by nearly everything (audit logging, API calls)

selectedProductId ──▶ activeProduct ──▶ used by:
                                          - Copy generation (#2)
                                          - Camera-shoot prompt presets (#9)
                                          - AI Vision audit's productTitle (#12)

layers (single array) ──▶ read/written by:
                            - Manual layer editor (#7)          [primary owner]
                            - Undo/redo (#8)                    [wraps every mutation]
                            - Template loading (#4)              (replaces layers wholesale)
                            - Backdrop presets (#6)               (mutates background layer)
                            - Brand Kit apply (#10)               (mutates text layers)
                            - Canvas export (#14)                 (reads layers to rasterize)
                            - Asset library "apply to canvas" (#13) (mutates background layer)
                            - Project save/load (#15)             (serializes/deserializes layers)

canvasWidth/Height/aspectRatio ──▶ used by: manual editor render, export (#14), social resize (#11),
                                            project save/load (#15)

drawAndExportCanvas() ──▶ depended on by: download (#14), save-to-asset-library (#13), AI vision audit (#12)
  — i.e. three separate sub-tabs share this one function. Any extraction must keep it a single
  shared utility, not three copies.

selectedLayerId ──▶ drives the property-panel sync `useEffect` (layerText/Color/FontSize/... local
                    state) — this is a second, denormalized copy of the selected layer's fields
                    that must stay in sync; a real risk point (see §5).
```

**Key structural fact**: `layers` is a single flat array touched by 7 of the 16 responsibilities above. It is the one piece of state that cannot be cleanly owned by a single extracted module without either (a) lifting it to a shared store (which is exactly what `src/features/canvas/store` already is), or (b) passing it through prop-drilling across every extracted piece — meaning **the manual editor, undo/redo, template loading, backdrop presets, brand-kit apply, export, and asset-apply must all migrate to the new Canvas Engine's store together**, not one at a time, or they'll fork into two divergent copies of "what the current design looks like."

## 5. Risks of splitting the file

1. **`layers`/Canvas Engine state duplication mid-migration.** If the manual editor is extracted to use the new Canvas Engine's store before export/brand-kit/asset-apply are also migrated, those remaining responsibilities would either break (reading a `layers` variable that no longer exists) or silently operate on a stale, disconnected copy. This is the single biggest risk — see §1 in the dependency graph above.
2. **Undo/redo semantics differ.** The file's undo/redo (#8) is a simple two-stack array-of-layer-snapshots. `src/features/canvas`'s history system (per the audit) is presumably far more capable (likely command-based, not full-snapshot). Swapping naively could silently change undo granularity (e.g. one undo per keystroke vs. per discrete action) — a real, user-visible regression risk if not verified explicitly.
3. **Two parallel AI-calling paths.** `handleGenerateAIImage`/`handleRunAIVisionAudit` call `/api/images/generate`/`/api/images/analyze` directly via `fetch`, entirely bypassing `src/features/ai`'s `ImageProviderRegistry`/`CreditManager`. Extracting the AI-gen sub-tab into a component backed by the new provider abstraction changes *which code path* runs generation — needs explicit verification that the new path still charges credits the same way (it now does, server-side, per the credit-unification work) and supports the same provider/mode options (`aiGenMode`: `text_to_image | product_to_image | image_to_image | backdrop_generation | marketing_banner` — need to confirm the new provider registry supports all five modes before cutting over).
4. **Fake asset library → real Assets API changes persistence semantics.** Today, "saved assets" vanish on refresh (in-memory only). Wiring `#13` to the real Assets module makes them durable and workspace-shared — a *behavior change*, not a pure refactor, even though it looks like a bug fix. Needs explicit product sign-off, not just silent extraction, since existing users may be relying on (or unaware of) the current ephemeral behavior.
5. **Property-panel state duplication.** `layerText/Color/FontSize/Rotation/Opacity/FontFamily` are a denormalized copy of the selected layer's fields, synced one-directionally via `useEffect`. Any extraction that changes when/how that sync fires (e.g. moving it into a child component with its own effect timing) risks the classic "stale controlled input" bug — property panel showing the previous layer's values momentarily, or edits writing to the wrong layer.
6. **`drawAndExportCanvas` is a shared dependency of three sub-tabs.** Extracting it must produce exactly one function/hook consumed by all three call sites (download, save-to-library, AI audit) — extracting it three times (once per sub-tab component) would recreate the exact "duplicate rendering logic" problem this whole project is meant to eliminate.
7. **Test/consumer surface.** `App.tsx` renders this component twice with different `initialActiveTab` props for two different app tabs ("AI Content Studio" and "Image Studio"). Any change to the component's external prop contract (`ImageStudioProps`) risks breaking both call sites simultaneously.

## 6. Proposed phased refactoring plan (100% backward-compatible at every phase)

Each phase should leave the app fully working and independently shippable/testable — no phase depends on a later one to avoid breaking the app.

**Phase 0 — Safety net (no extraction yet)**
Add a lightweight smoke-test script exercising: load projects, save project, undo/redo one action, export PNG, run AI vision audit, generate AI image — so every later phase has a fast regression check. (No behavior change.)

**Phase 1 — Extract pure-utility pieces with zero shared-state risk**
- `useUndoRedo` hook (§3) — mechanically identical logic, just relocated.
- `useCanvasExport` hook wrapping `drawAndExportCanvas`/`handleDownloadCanvasPNG` — still the *same* single function, now imported by the three call sites instead of defined once and closed over.
- Presentational-only components: `<TemplateGallery>`, `<BackdropPresetGrid>`, `<SocialGuidesPanel>`, `<CameraShootPresets>` (props-in, callbacks-out; no internal state migration).
These have no dependency ordering risk relative to each other or to the Canvas Engine migration — safe to do first and ship independently.

**Phase 2 — Extract Project CRUD**
`useImageStudioProjects(workspaceId)` hook wrapping #15. Independent of the Canvas Engine question; can happen anytime. Good opportunity to add a test confirming the legacy adapter contract (already migrated server-side) round-trips correctly through this hook.

**Phase 3 — Wire the AI-gen and AI-audit paths onto the real provider/credit stack**
Before touching the Canvas Engine, first move `handleGenerateAIImage`/`handleRunAIVisionAudit` onto `src/features/ai` (or confirm+document why the direct-fetch path stays) — resolves Risk §5.3 in isolation, before it's entangled with a Canvas Engine cutover. Verify all 5 `aiGenMode` values are supported by the new path before cutover; keep the old direct-fetch path behind a flag until verified equivalent.

**Phase 4 — The Canvas Engine cutover (the one that must happen atomically)**
Migrate `layers` state, the manual editor (#7), undo/redo integration point, template-loading (#4), backdrop presets (#6), brand-kit apply (#10), export (#14), and asset-apply (#13's "apply to canvas" half) onto `src/features/canvas`'s store **together, in one change**, per the dependency graph in §4 — not incrementally, to avoid a split-brain `layers` state. This is the highest-risk, highest-value phase; do it with the Phase 0 smoke tests green before and after, and a manual pass on undo/redo granularity (Risk §5.2) specifically, since that's the one thing automated smoke tests are unlikely to catch.

**Phase 5 — Real Asset Library**
Swap `savedAssets`/`handleSaveToAssetLibrary` for the real Assets module (upload exported PNG via `AssetUploadService`, list workspace assets from `/api/assets`). Flag to product/design that this changes persistence behavior (Risk §5.4) — get explicit sign-off before shipping, since it's a behavior change disguised as a refactor.

**Phase 6 — Shrink `ImageStudio.tsx` to a thin orchestrator**
Once Phases 1–5 land, `ImageStudio.tsx` should contain only: the outer shell, tab/sub-tab switcher state, `workspaceId`/product-context plumbing, and composition of the now-extracted pieces. The AI Content Studio (#2) can optionally become its own sibling component at this point, or remain — it has no coupling to any of the above and isn't blocking.

No code has been changed in this analysis. Ready to proceed with Phase 1 (or a different starting point) on your go-ahead.
