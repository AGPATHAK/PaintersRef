# issue-081-composition-painting-ui-cleanup.md

## Goal
Make a small, disciplined usability pass based on real usage feedback, without changing core workflow or processing architecture.

## Scope

### 1. Composition guidance visibility
Current composition instruction text in the left panel is too easy to miss.

Implement a stronger interaction cue, preferably:
- a visible on-canvas hint when Composition mode is active

Suggested wording:
- "Click a crop to use it. Clear Selection returns to original."

Alternative if needed:
- stronger highlighted instruction block in left panel

### 2. Crop size slider bug
When crop size slider is moved, only 2 of 4 composition panels visibly update.

Investigate and fix so all relevant crop preview panels respond consistently to crop size changes.

This is a behavior fix, not a redesign.

### 3. Drawing mode line thickness
Reduce drawing/outline line thickness slightly so sketch references feel lighter and less heavy.

Keep the existing drawing logic and presets intact unless a tiny change is necessary.

### 4. Painting mode layout cleanup
Improve arrangement of painting-mode buttons, especially the 3 masks.

Requirements:
- make mask button layout cleaner and more balanced
- keep Light / Midtone / Shadow as separate selectable options
- preserve Temperature Study as its own option
- fix the missing line/border below Temperature Study
- do not redesign the whole app

## Constraints
- Stability first
- No refactor
- No changes to export logic
- No changes to preview/sheet logic
- No changes to compositional workflow beyond improving visibility and fixing the crop slider behavior
- No naming changes in this issue
- Keep all changes localized and low-risk

## Acceptance criteria
- composition guidance is harder to miss
- crop size slider updates all intended composition preview panels consistently
- drawing lines appear slightly lighter
- painting mode layout looks cleaner and the missing boundary under Temperature Study is fixed
- no regressions in exports, previews, masks, outline presets, or current-view export
