# issue-083-docs-checkpoint-after-081-082.md

## Goal
Bring project documentation up to date after the recent merged work, so development can pause and later resume cleanly.

## Context
The app has moved forward since the last documentation checkpoint.

Merged work now includes:
- issue-081-composition-painting-ui-cleanup
- issue-082-calibrate-outline-and-masks

Current stable state includes:
- image loading
- composition workflow with crop selection
- grid overlay
- grayscale study
- 3-value Notan
- tonal masks
- warm/cool/neutral temperature study
- rough outline sketch with low / medium / high detail presets
- current-view export
- preview workflow with 3 sheets
- composite sheet export

## Key current product state to document

### 1. Three-sheet workflow
Document clearly what each preview/export sheet represents in painter workflow terms.

- Sheet 1 — Value & Drawing
  - Original
  - Grayscale
  - 3-Value Notan
  - Outline with grid

- Sheet 2 — Tonal Masks
  - Original
  - Light Mask
  - Midtone Mask
  - Shadow Mask

- Sheet 3 — Temperature Map
  - Original
  - Warm Mask
  - Cool Mask
  - Neutral Mask

### 2. Current-view export
Document that Export Current View is now a visible top-level action.

### 3. Recent usability updates from issue-081
Document:
- composition guidance visibility improvement
- crop-size behavior cleanup
- painting-mode layout cleanup
- lighter drawing feel / outline calibration adjustment

### 4. Recent calibration updates from issue-082
Document:
- outline preset calibration pass
- warm/cool/neutral calibration pass
- any minor mask cleanup/calibration that was merged

### 5. Current known limitations / deferred items
Document only realistic current items, such as:
- further UI aesthetics polish may be done later
- eventual refactor is deferred until workflow stabilizes more
- future changes should remain stability-first and incremental

## Documents to update
Update whichever of these already exist, and add the missing one if needed:

1. current-state-audit.md
2. milestones.md
3. issues-backlog.md
4. next-session-brief.md

## Expectations per document

### current-state-audit.md
- clear snapshot of what the app currently does
- clear explanation of the 3-sheet workflow
- current export behavior
- note current stable state after issue-081 and issue-082

### milestones.md
- mark completed phases and recent merged improvements
- keep it concise and factual

### issues-backlog.md
- remove items that are now completed
- keep only realistic next items
- separate near-term vs later if useful

### next-session-brief.md
- short restart note for future resumption
- include:
  - current stable state
  - what is working
  - what to test during continued use
  - what not to casually change
  - likely next priorities after more usage

## Constraints
- Documentation only
- No code changes
- No speculative roadmap expansion
- Be precise, concise, and consistent with current app state
