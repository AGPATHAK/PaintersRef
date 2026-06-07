# V2 Refactor Plan

## Summary

V2 is a behavior-preserving refactor of the stable deterministic Painter's Reference Lab PWA.

The current stable prototype remains protected on `main`, with `prl-stable-v1` available as the stable checkpoint tag. Refactor work happens on `codex/v2`.

AI work is out of scope for this plan because a separate AI app is being developed. V2 should make the existing deterministic app easier to maintain before any new modules or product features are added.

## Goals

- Preserve all current user-facing behavior.
- Make `app.js` easier to maintain before adding new modules.
- Keep the app static, local-first, deterministic, and PWA-compatible.
- Improve code boundaries without changing the painter workflow.
- Keep refactor steps small enough to review, test, and revert cleanly.

## No-Go Zones

- No AI integration.
- No framework or build-system migration.
- No export redesign.
- No composition workflow rewrite.
- No new product features during the first refactor pass.
- No speculative visual redesign.
- No palette, outline, or mask algorithm changes unless required to preserve existing behavior during extraction.

## Refactor Sequence

### 1. Document Current Runtime Dependencies

Before moving code, map the current dependencies inside `app.js`:

- image file load path
- reference canvas creation
- composition crop selection
- derived canvas rebuild lifecycle
- render routing
- export and sheet-preview flow
- service worker cache update expectations

Outcome:

- The current state and render dependencies are understood before extraction begins.
- High-risk flows are named before they are touched.
- Dependency map lives in [V2 Runtime Dependency Map](v2-runtime-dependency-map.md).

### 2. Extract Lowest-Risk Pure Helpers First

Start with helpers that are closest to pure deterministic processing:

- canvas utilities
- grayscale helpers
- Notan helpers

Rules:

- Preserve function behavior and output.
- Keep call sites simple.
- Run smoke checks after each extraction.

### 3. Extract Painting Processors

After the first extraction pattern is proven, extract:

- tonal mask helpers
- temperature mask helpers
- palette analysis and palette study helpers
- outline and squint helpers

Rules:

- Do not change visible controls.
- Do not recalibrate recipes during extraction.
- Do not add new user-facing options.

### 4. Extract Export And Sheet Builders Later

Move export and study-sheet builder logic only after the lower-risk processors have been extracted and smoke checks are reliable.

Rules:

- Preserve current export filenames, formats, layouts, and sheet content.
- Preserve Sheet 1, Sheet 2, and Sheet 3 preview/export behavior.
- Keep current-view export separate from sheet export.

### 5. Leave App Runtime Wiring Until Later

Do not start by extracting or redesigning:

- app state shape
- event listeners
- composition selection
- derived canvas lifecycle
- `renderScene()`
- stage/view routing

These areas are behavior-sensitive and should be revisited only after helper extraction is stable.

## Rollback Discipline

- Use one small refactor step per branch or commit.
- Run smoke checks after each extraction.
- Keep each change small enough to revert cleanly.
- If image loading, composition, export, or PWA behavior regresses twice on the same refactor step, revert and split the step smaller.
- Do not stack feature work on top of a refactor that has not passed smoke checks.

## Test Plan

Use the existing smoke test as the baseline and update it for the current stage names.

Required checks after every refactor step:

- JPG and PNG load.
- Canvas preserves image aspect ratio.
- Grid toggles and row/column changes work.
- Focal point, crop size, selected crop, and clear selection work.
- Drawing views render:
  - Outline Sketch
  - Mirror Check
- Painting views render:
  - Squint
  - Grayscale
  - 3-Value Notan
  - Light Mask
  - Midtone Mask
  - Shadow Mask
  - Temperature Study
  - Palette Notes
- Export views work:
  - Export Current View
  - Sheet 1 preview and export
  - Sheet 2 preview and export
  - Sheet 3 preview and export
- Light/dark theme toggle works.
- Service worker cache version is updated when app shell files change.

Optional later safety:

- Add lightweight browser smoke automation only after the first manual refactor pass is understood.
- Add export sheet verification after sheet-builder boundaries are clearer.

## Assumptions

- V2 starts as maintainability work, not feature work.
- Current stable behavior is trusted from user testing.
- `codex/v2` is the active branch for this plan and future refactor work.
- The stable prototype remains available from `main` and `prl-stable-v1`.
- AI work remains separate from this PWA refactor.
