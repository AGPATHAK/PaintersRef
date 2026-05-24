# issue-092-move-squint-to-painting.md

## Goal
Do a small Painting-section layout cleanup only.

## Context
Squint has already been moved into Painting.
That part is done.

The remaining issue is layout:
- Painting buttons do not fit cleanly
- the Squint label is truncated
- the button grid feels cramped and unbalanced

## Scope
Adjust only the Painting button layout so the section works cleanly within the current sidebar width.

### Requirements
- all Painting buttons remain present
- labels must be fully readable
- no truncation like the current Squint button
- layout should feel balanced and painter-friendly
- keep existing Painting grouping and behavior intact

### Preferred approach
- CSS/layout adjustment only if possible
- allow a cleaner grid/wrapping arrangement for Painting buttons
- keep the current section structure
- do not redesign unrelated sections

## Constraints
- Stability first
- No refactor
- No export redesign
- No preview/sheet redesign
- No crop workflow changes
- No service worker changes
- No logic changes unless absolutely required for layout

## Acceptance criteria
- Painting buttons fit cleanly in the current sidebar width
- labels are readable
- no regressions elsewhere
