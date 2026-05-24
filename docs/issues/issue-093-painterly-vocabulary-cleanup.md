# issue-093-painterly-vocabulary-cleanup.md

## Goal
Finish the painterly vocabulary cleanup with a very small layout polish in the Drawing section.

## Context
The vocabulary cleanup is working:
- outline detail labels now read Simple / Balanced / Detailed
- wording is clearer and more painterly

The remaining issue is minor spacing/layout polish in the Drawing panel.

## Scope
Adjust only spacing/layout in the Drawing section so the controls breathe better and labels fit comfortably.

### Specific targets
- improve spacing around the Outline Controls card
- improve spacing/alignment around the Outline Source dropdown
- improve spacing between the helper text and the Simple / Balanced / Detailed buttons
- keep the Drawing section visually balanced within the current sidebar width

## Constraints
- Stability first
- CSS/layout only if possible
- No logic changes
- No export changes
- No preview/sheet changes
- No crop workflow changes
- No refactor
- Do not redesign unrelated sections

## Acceptance criteria
- Drawing section feels less cramped
- spacing around helper text and preset buttons is improved
- labels remain fully readable
- no regressions elsewhere
