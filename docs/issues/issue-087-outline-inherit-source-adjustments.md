# issue-087-outline-inherit-source-adjustments.md

## Goal
Improve outline usefulness by making outline generation inherit the current adjusted state of its selected source image, instead of introducing separate duplicate controls inside Outline.

## Product decision
Do **not** add new always-visible sliders under Outline.

Instead:
- if Outline Source = Gray, use the current grayscale output
- if Outline Source = Original, use the current original output
- if Outline Source = Squint, use the current adjusted squint output
- if Outline Source = Notan, use the current adjusted Notan output

This keeps the UI minimal while making outline generation more responsive to the painter’s current source-image tuning.

## Scope

### 1. Outline source should use current source-state
Outline generation must derive from the currently active processed source state, not a stale or separately hardcoded version.

Required sources:
- Gray
- Original
- Squint
- Notan

### 2. No duplicate outline-local source controls
Do not expose separate squint/notan sliders inside Outline mode.
The existing source controls remain the single place where those source images are tuned.

### 3. Outline regeneration behavior
When the user changes a source adjustment that affects:
- Squint
- Notan

and the current Outline Source depends on that source, the outline should regenerate accordingly.

### 4. Preserve existing outline controls
Keep:
- Outline Source selector
- Low / Medium / High detail presets

## Constraints
- Stability first
- No refactor
- No export redesign
- No preview/sheet redesign
- No crop workflow changes
- No service worker changes
- No new duplicate controls in Outline
- Keep all changes localized and low-risk

## Acceptance criteria
- Outline Source = Squint uses the currently adjusted squint result
- Outline Source = Notan uses the currently adjusted Notan result
- Gray and Original continue to work
- Low / Medium / High outline detail presets continue to work
- No duplicate sliders are added under Outline
- No regressions in exports, previews, masks, crop workflow, or current view export
