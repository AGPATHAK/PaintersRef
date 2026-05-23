# issue-088-workflow-stage-sidebar-restructure.md

## Goal
Reorganize the sidebar into painter workflow stages without changing core behavior, exports, preview/sheet structure, or source-state ownership.

## Product decision
Implement Phase 1 only.

Reorganize the sidebar into:
- Reference Image
- Composition
- Drawing
- Painting
- Export
- Info

Do NOT separate Drawing and Painting state in this issue.
Do NOT refactor in this issue.
Do NOT redesign exports/sheets in this issue.

## Scope

### 1. Sidebar workflow-stage reorganization
Restructure the current sidebar so controls are grouped by painter workflow stage.

Target grouping:
- **Reference Image**
  - image load
- **Composition**
  - crop/composition controls and guidance
- **Drawing**
  - outline controls
  - outline source selector
  - outline detail presets
  - mirror check
  - squint controls may be placed here as a practical UI choice for this phase
- **Painting**
  - grayscale / Notan / masks / temperature study / palette-notes style painting-study controls
- **Export**
  - export current view
  - previews / sheet export controls
- **Info**
  - compact status / image info block

### 2. Clarify current shared-state behavior
Add light UI clarification that:
- Outline Source = Squint uses the current Squint settings
- Outline Source = Notan uses the current Notan settings

This should be done via:
- tooltip, helper text, small status line, or similarly low-clutter method

Do NOT add duplicate controls.

### 3. Preserve behavior
Keep current behavior intact:
- no separate Drawing/Painting source state
- no export changes
- no preview/sheet changes
- no crop workflow changes
- no outline logic changes unless absolutely required by the UI move

## Constraints
- Stability first
- No refactor
- No export redesign
- No preview/sheet redesign
- No crop workflow changes
- No service worker changes
- No new duplicate controls
- Keep changes localized and low-risk

## Acceptance criteria
- sidebar is clearly organized into workflow stages
- controls remain functional
- exports/previews remain unchanged
- outline-source coupling is clearer to the user
- no regressions in crop workflow, masks, outline, exports, or current-view export
