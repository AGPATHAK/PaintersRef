# Workflow Stage Restructure Roadmap

## Purpose
This is the source-of-truth planning note for the next major workflow-stage pass in Painter's Reference Lab. It captures the agreed product and implementation direction after review, so future work stays incremental and does not drift into a broad rewrite.

## Current Stable State
- The current app is good enough and usable for painter reference preparation.
- Recent work added Outline Source selection.
- Recent work also made Outline inherit the current adjusted Squint or Notan source output.
- The stable app should be preserved.
- No immediate refactor is planned.

## Core Product Tension
- The natural painter workflow is:
  1. Choose image
  2. Composition
  3. Drawing / outline
  4. Painting studies
- Some source-prep controls affect both outline and painting outputs.
- The best source settings for outline may differ from the best source settings for painting.
- This creates a real ownership question, but solving it with duplicated controls too early risks clutter and instability.

## Agreed Product Direction
- Reorganize the sidebar into clearer workflow stages:
  - Reference Image
  - Composition
  - Drawing
  - Painting
  - Export
  - Info
- Do not separate Drawing and Painting state yet.
- Do not refactor yet.
- Do not redesign exports or sheets as part of this phase.
- Preserve the existing Outline Source selector pattern.
- Keep changes issue-based, incremental, and easy to review.

## Phase 1 Decision
- Proceed with sidebar/workflow-stage reorganization only.
- Clarify control ownership through grouping, labels, and tooltips.
- Add explicit UI clarification that `Outline Source = Squint` and `Outline Source = Notan` use the current corresponding source settings.
- Keep implementation low-risk and localized.
- Avoid new duplicate controls inside Outline.

## Phase 1 Caution
- Squint has a dual role:
  - It is useful as a value-mass observation/painting aid.
  - It can also be useful as an outline source for drawing.
- If Squint is placed under Drawing for practical clarity, document that as a UI choice, not a permanent conceptual claim.
- Avoid implying that Drawing owns all Squint behavior until real painter feedback supports that split.

## Phase 1b Optional Small Additions
- Add tooltip clarification for Outline Source behavior.
- Add a small status line or indicator for current outline-source coupling if it proves helpful.
- Keep any clarification lightweight and near the relevant control.
- Do not add duplicate Squint or Notan controls under Outline.

## Deferred Phase 2
Only revisit state separation if painter feedback proves it is necessary.

Possible Phase 2 work:
- Drawing-specific source overrides.
- Optional separate Drawing vs Painting source-prep state.
- A clearer model for outline-oriented simplification versus painting-oriented simplification.

This is deferred because it increases UI clutter, state complexity, export implications, and regression risk.

## Refactor Stance
- Refactor is deferred until the workflow stabilizes further after real use.
- Do not begin with architecture extraction.
- Future changes should remain issue-based and incremental.
- Refactor only after repeated implementation pressure shows clear module boundaries.

## Recommended Implementation Sequence
1. Reorganize the sidebar into the agreed workflow stages.
2. Add tooltip or coupling clarification for Outline Source behavior.
3. Gather painter feedback on whether shared source settings are confusing in practice.
4. Only then reconsider Drawing vs Painting state separation.
5. Refactor later only if the stabilized workflow makes the need obvious.

## Phase 1 Success Criteria
- Sidebar stages match the painter workflow more clearly.
- Existing image loading, composition, drawing, painting, and export behavior still works.
- Outline Source selection remains available and understandable.
- Users can tell that Squint/Notan outline sources use current Squint/Notan settings.
- No duplicate Outline-local Squint or Notan sliders are introduced.
- Export Current View and the prepared sheet workflow remain unchanged.
- Changes are small enough to review and smoke test confidently.

## Deferred Questions
- Does Squint belong under Drawing, Painting, or a separate shared source-prep area long term?
- Do painters actually need separate Drawing and Painting source-prep state?
- If separate state is needed, which settings should split first?
- Should outline source coupling be shown as a persistent status, tooltip-only clarification, or both?
- When the workflow settles, what module boundaries are worth extracting from `app.js`?
