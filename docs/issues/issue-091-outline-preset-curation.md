# issue-091-outline-preset-curation.md

## Goal
Improve outline usefulness by reducing visible controls and curating better internal preset behavior.

## Product decision
The recent painterly-outline-controls experiment should NOT continue.

Visible Outline controls should be reduced to:
- Outline Source
  - Original
  - Gray
  - Squint
  - Notan
- Detail
  - Low
  - Medium
  - High

Remove extra contextual outline-local controls from visible UI.

## Why
Current visible controls are still confusing, and at some settings the output becomes not useful.
Painters need fewer choices and better defaults, not more knobs.

## Scope

### 1. Reduce visible Outline controls
Keep only:
- Outline Source selector
- Low / Medium / High detail presets

Remove from visible UI:
- Simplify Shapes controls
- Mass Grouping controls
- any outline-local extra preset rows beyond the main detail row

### 2. Curate internal outline behavior
Use internal mapping so each Outline Source + Detail combination has sensible built-in behavior.

Examples:
- Original + Low/Medium/High
- Gray + Low/Medium/High
- Squint + Low/Medium/High
- Notan + Low/Medium/High

Implementation may tune internal thresholds/smoothing/source prep per combination, but this must stay hidden from the user.

### 3. Preserve app stability
Do not redesign exports, previews, or sheets.
Do not change crop workflow.
Do not refactor.

## Constraints
- Stability first
- No refactor
- No export redesign
- No preview/sheet redesign
- No crop workflow changes
- No service worker changes
- Keep changes localized and low-risk
- Prefer fewer controls and better defaults

## Acceptance criteria
- Outline controls are simpler again
- only Outline Source + Low/Medium/High remain visible
- output feels more useful across common subjects
- no regressions in exports, previews, masks, crop workflow, or current-view export
