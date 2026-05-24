# Workflow Stage Restructure Roadmap

## Purpose

This is the source-of-truth planning note for the workflow-stage direction in Painter's Reference Lab. It captures what has now been implemented and what remains deferred, so future work stays incremental and does not drift into a broad rewrite.

## Current Stable State

- The current app is good enough and usable for painter reference preparation.
- The sidebar is organized into Reference Image, Composition, Drawing, Painting, Export, and Info.
- Squint now lives under Painting.
- Drawing is focused on Outline Sketch, Mirror Check, Outline Source, and Simple / Balanced / Detailed outline detail.
- Outline Source selection is stable: Gray, Squint, Original, Notan.
- Extra visible outline-local controls were removed.
- Outline behavior is curated internally by source/detail combination.
- No immediate refactor is planned.

## Implemented Workflow Structure

- **Reference Image**
  - Image load/change
  - Grid controls
- **Composition**
  - Focal Study
  - Crop Size
  - Clear Selection
- **Drawing**
  - Outline Sketch
  - Mirror Check
  - Outline Source
  - Simple / Balanced / Detailed
- **Painting**
  - Squint and Squint Softness
  - Grayscale
  - 3-Value Notan
  - Light / Midtone / Shadow masks
  - Temperature Study
  - Palette Notes
- **Export**
  - Export Current View
  - 3-sheet preview/export workflow
- **Info**
  - Compact status and image/view metadata

## Current Product Direction

- Preserve the simplified visible Outline controls.
- Prefer fewer controls and better internal defaults.
- Keep Squint as a Painting study while allowing Outline Source = Squint.
- Do not separate Drawing and Painting state yet.
- Do not refactor yet.
- Do not redesign exports or sheets as part of this phase.
- Keep changes issue-based, incremental, and easy to review.

## Deferred Phase 2

Only revisit state separation if painter feedback proves it is necessary.

Possible Phase 2 work:

- Drawing-specific source overrides.
- Optional separate Drawing vs Painting source-prep state.
- A clearer model for outline-oriented simplification versus painting-oriented simplification.

This remains deferred because it increases UI clutter, state complexity, export implications, and regression risk.

## Refactor Stance

- Refactor is deferred until the workflow stabilizes further after real use.
- Do not begin with architecture extraction.
- Future changes should remain issue-based and incremental.
- Refactor only after repeated implementation pressure shows clear module boundaries.

## Recommended Implementation Sequence From Here

1. Gather painter feedback from real references.
2. Fix only concrete regressions or repeated friction.
3. Tune hidden outline recipes only when real examples justify it.
4. Keep export/sheet/crop/service-worker behavior stable.
5. Reconsider state separation only if the current model repeatedly gets in the way.
6. Refactor later only if the stabilized workflow makes the need obvious.

## Current Success Criteria

- Sidebar stages match the painter workflow clearly.
- Existing image loading, composition, drawing, painting, and export behavior works.
- Outline Source selection remains available and understandable.
- Simple / Balanced / Detailed remain useful without extra visible outline controls.
- Export Current View and the prepared sheet workflow remain unchanged.
- Changes stay small enough to review and smoke test confidently.

## Deferred Questions

- Do painters actually need separate Drawing and Painting source-prep state?
- If separate state is needed, which settings should split first?
- Should hidden outline recipes be further calibrated for specific subject types?
- When the workflow settles, what module boundaries are worth extracting from `app.js`?
