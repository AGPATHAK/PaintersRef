# issue-089-outline-local-source-controls.md

## Goal
Improve outline usability by exposing relevant source-adjustment controls directly inside Outline, with controls that are local to outline generation and independent from painting-study settings.

## Product decision
Implement outline-local contextual controls.

Meaning:
- if Outline Source = Gray, show the relevant outline-local gray/squint simplification control
- if Outline Source = Squint, show the relevant outline-local squint control
- if Outline Source = Notan, show the relevant outline-local notan control(s)
- if Outline Source = Original, show no extra source adjustment control

These controls must affect outline generation only.
They must not overwrite or interfere with painting-study settings.

## Scope

### 1. Add contextual outline-local source controls
Inside the Drawing / Outline section, show only the source adjustment controls relevant to the currently selected Outline Source.

Supported behavior:
- **Original**
  - no outline-local source adjustment controls
- **Gray**
  - show the relevant outline-local simplification control if applicable
- **Squint**
  - show outline-local squint adjustment
- **Notan**
  - show outline-local notan adjustment(s)

### 2. Separate outline-local state from painting-study state
Add separate internal state for outline-local source preparation where needed.

Requirements:
- changing outline-local Squint adjustment affects only the outline result
- changing outline-local Notan adjustment affects only the outline result
- painting-study Squint / Notan settings remain unchanged
- existing painting-study outputs remain unchanged

### 3. Preserve current outline controls
Keep:
- Outline Source selector
- Low / Medium / High detail presets

### 4. Preserve exports and previews
Do not redesign exports or sheets in this issue.
Existing export and preview behavior should remain stable.

## Constraints
- Stability first
- No refactor
- No export redesign
- No preview/sheet redesign
- No crop workflow changes
- No service worker changes
- Keep changes localized and low-risk
- Prefer contextual controls over always-visible duplicate controls

## Acceptance criteria
- outline-local source controls appear contextually under Outline
- Gray / Squint / Notan outline sources have usable local controls where relevant
- Original has no extra local control
- outline-local source controls affect outline only
- painting-study settings remain independent
- existing outline detail presets continue to work
- no regressions in exports, previews, masks, crop workflow, or current-view export
