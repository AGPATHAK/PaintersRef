# Issues Backlog

Focused backlog from the current stable V5.2 checkpoint after the workflow/sidebar, outline, vocabulary, and layout cleanup passes.

Completed workflow-stage reorganization, Squint-to-Painting regrouping, curated outline presets, painter-facing vocabulary cleanup, and recent spacing/layout polish have been removed from the active backlog.

## Near Term

| Priority | Type | Title | Size | Depends On | Acceptance Criteria |
|---|---|---|---|---|---|
| P1 high | test | Continue real painting-use validation | M | Current stable app | Composition, Drawing, Painting, Export, and Info workflows hold up during normal reference-prep sessions. |
| P1 high | bug | Fix regressions found during real use | S/M | As discovered | Stable workflow remains intact after narrow bug fixes. |
| P1 high | docs | Keep docs aligned with current UI vocabulary | S | Any wording or behavior changes | Public-facing docs accurately describe current stage structure, exports, and terminology. |
| P2 medium | ux | Review small-screen and iPad layout behavior | M | Stable usage feedback | The current control hierarchy remains usable on narrower screens and tablets. |
| P2 medium | test | Refresh manual smoke-test notes | S | Current workflow settled | Smoke checklist reflects Reference Image, Composition, Drawing, Painting, Export, and Info. |

## Later / Nice To Have

| Priority | Type | Title | Size | Depends On | Acceptance Criteria |
|---|---|---|---|---|---|
| P2 medium | calibration | Tune outline recipes only from real reference feedback | S/M | More real usage | Simple / Balanced / Detailed remain useful across common painting subjects without adding visible controls. |
| P2 medium | refactor | Re-enter refactor planning only after workflow stabilizes | S | More real usage | Refactor work is scoped from observed needs, not from code size alone. |
| P2 medium | refactor | Isolate export/sheet builder logic when safe | M | Refactor re-entry conditions met | Sheet building can be maintained more easily without changing output behavior. |
| P2 medium | refactor | Separate deterministic processors from UI/runtime code | L | Stronger regression safety | Behavior remains unchanged while processing helpers gain clearer boundaries. |
| P3 low | feature | Consider compare mode only if current preview workflow proves insufficient | M | More real usage | Compare mode is justified by actual workflow friction, not by speculation. |
| P3 low | feature | Consider saved presets after more usage data | M | Stable workflow | Presets reduce real repetition without cluttering the UI. |
| P3 low | feature | AI layer planning checkpoint | S | Deterministic workflow stabilized | Any future AI work is clearly bounded and separate from Core Lab. |

## Recently Completed

- issue-088: workflow-stage sidebar reorganization
- issue-091: curated outline presets and simplified visible Outline controls
- issue-092: Squint moved to Painting and Painting button layout cleaned up
- issue-093: painter-facing vocabulary cleanup and Drawing outline spacing polish
- issue-094: current documentation cleanup pass
