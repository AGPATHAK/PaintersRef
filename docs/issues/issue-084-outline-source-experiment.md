# issue-084-outline-source-experiment.md

## Goal
Restore and properly implement outline source selection without breaking the now-restored control responsiveness.

## Scope
Add an **Outline Source** control for outline generation.

Supported options:
- Gray
- Squint
- Original
- Notan

## Requirements
- Gray is the default
- Existing low / medium / high outline detail presets remain
- Outline output changes based on selected source
- Keep the rest of the app behavior unchanged
- No refactor
- No export redesign
- No preview/sheet redesign
- No crop workflow changes
- No service worker changes

## Acceptance criteria
- Outline Source selector is visible in the Drawing / Outline controls
- Gray, Squint, Original, and Notan all work
- Controls remain responsive
- No regressions in export, previews, masks, or crop workflow
