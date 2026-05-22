# Issues Backlog

Focused backlog from the current stable V5.2 checkpoint after issue-081 and issue-082.

Completed composition cleanup, painting layout cleanup, outline calibration, and warm/cool/neutral calibration items have been removed from this list. Keep this backlog practical and grounded in real usage.

## Near Term

| Priority | Type | Title | Size | Depends On | Acceptance Criteria |
|---|---|---|---|---|---|
| P1 high | test | Continue real painting-use validation | M | Current stable app | Composition, drawing, painting, preview, and export workflows hold up during normal reference-prep sessions. |
| P1 high | bug | Fix regressions found during real use | S/M | As discovered | Stable workflow remains intact after narrow bug fixes. |
| P1 high | docs | Keep README and docs aligned with V5.2 workflow | S | Any wording or behavior changes | Public-facing docs accurately describe current view export, previews, and the 3-sheet workflow. |
| P2 medium | ux | Small UI aesthetics and spacing polish pass | M | Stable usage feedback | Interface looks cleaner and more intentional without changing the current workflow model. |
| P2 medium | ux | Review small-screen and iPad layout behavior | M | Stable usage feedback | The current control hierarchy remains usable on narrower screens and tablets. |
| P2 medium | test | Refresh manual smoke-test notes if workflow changes | S | Any future UI or export adjustment | Smoke checklist reflects current composition, drawing, painting, preview, and export behavior. |

## Later / Nice To Have

| Priority | Type | Title | Size | Depends On | Acceptance Criteria |
|---|---|---|---|---|---|
| P2 medium | refactor | Re-enter refactor planning only after workflow stabilizes | S | More real usage | Refactor work is scoped from observed needs, not from code size alone. |
| P2 medium | refactor | Isolate export/sheet builder logic when safe | M | Refactor re-entry conditions met | Sheet building can be maintained more easily without changing output behavior. |
| P2 medium | refactor | Separate deterministic processors from UI/runtime code | L | Stronger regression safety | Behavior remains unchanged while processing helpers gain clearer boundaries. |
| P3 low | feature | Consider compare mode only if current preview workflow proves insufficient | M | More real usage | Compare mode is justified by actual workflow friction, not by speculation. |
| P3 low | feature | Consider saved presets after more usage data | M | Stable workflow | Presets reduce real repetition without cluttering the UI. |
| P3 low | feature | AI layer planning checkpoint | S | Deterministic workflow stabilized | Any future AI work is clearly bounded and separate from Core Lab. |

## Recently Completed

- issue-081: composition guidance visibility, crop slider responsiveness, painting layout cleanup, drawing button layout cleanup, and Temperature Study / Palette Notes separation
- issue-082: outline preset calibration and warm/cool/neutral temperature grouping calibration
