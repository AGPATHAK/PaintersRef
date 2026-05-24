# issue-094-docs-cleanup-pass.md

## Goal
Do a documentation cleanup pass so the repo accurately reflects the current stable app state after recent workflow, outline, and vocabulary updates.

## Scope
Documentation only.

Update the project docs so they match the current app behavior and terminology.

## Current stable state to capture
The app now includes:
- image loading
- composition / crop workflow
- grid overlay
- grayscale study
- squint view
- 3-value Notan
- tonal masks
- warm / cool / neutral temperature study
- rough outline sketch
- outline source selection
- curated outline presets
- current-view export
- 3-sheet preview/export workflow

Recent merged changes to reflect:
- workflow-stage sidebar reorganization
- squint moved to Painting
- outline source behavior stabilized
- visible outline controls simplified
- painter-facing vocabulary cleanup
- small UI spacing/layout refinements

## Key terminology to reflect
Use the currently approved painter-facing language, including:
- Squint Softness
- Simple / Balanced / Detailed
- Focus on Color
- Reset to Standard

Keep:
- Notan
- Composition
- Drawing
- Painting
- Temperature Study
- Palette Notes
- Export

## Documents to update
Update whichever of these exist, and create missing ones only if needed:

1. README.md
2. current-state-audit.md
3. milestones.md
4. issues-backlog.md
5. next-session-brief.md
6. docs/roadmaps/workflow-stage-restructure-roadmap.md

## Expectations by document

### README.md
- concise product overview
- current feature list
- current workflow-stage structure
- brief explanation of the 3-sheet export system
- keep it practical and painter-facing

### current-state-audit.md
- clear snapshot of the current working app
- current UI structure
- export behavior
- current known limitations
- current stable direction

### milestones.md
- mark completed phases and recent UI/vocabulary updates
- keep factual and concise

### issues-backlog.md
- remove completed items
- keep only realistic next items
- separate near-term vs later if useful

### next-session-brief.md
- short restart note
- what is working
- what should be tested in continued use
- what should not be casually changed
- likely next priorities after more use

### workflow-stage-restructure-roadmap.md
- make sure it matches the current implemented state
- ensure deferred items are still correctly marked deferred

## Constraints
- docs only
- no code changes
- no speculative roadmap sprawl
- clarity over verbosity
- keep docs aligned with actual current app state

## Acceptance criteria
- docs reflect the current stable app
- terminology is consistent with the UI
- outdated roadmap/backlog items are removed or marked completed
- future resumption will be easy from docs alone
