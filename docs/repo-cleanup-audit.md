# Repo Cleanup Audit

This is a conservative cleanup audit for the current V2 build 30 repository state.

## Current Finding

No tracked app files are obvious deletion candidates.

The repo does not currently contain tracked temp files, logs, backup files, `.DS_Store` files, or external review packages. The prior cleanup audit mentioned `review_packages/` and an empty `modules/` directory, but those findings are no longer current:

- `review_packages/` is not present in the tracked file list.
- `modules/` is now active runtime code and must be kept.

## Keep: Runtime App Files

| Path | Reason |
|---|---|
| `index.html` | Main app shell, controls, and script load order. |
| `styles.css` | App layout and visual styling. |
| `app.js` | Runtime/controller layer for state, events, composition, rendering, and export. |
| `modules/canvas-utils.js` | Shared canvas helpers. |
| `modules/value-processors.js` | Grayscale and Notan processors. |
| `modules/mask-processors.js` | Tonal and temperature mask processors. |
| `modules/palette-processors.js` | Palette extraction and palette-note helpers. |
| `modules/observation-processors.js` | Outline, Squint, Mirror, and Value Contours helpers. |
| `modules/color-study-processors.js` | Color Study palette-variant processor. |
| `manifest.webmanifest` | PWA manifest. |
| `service-worker.js` | App-shell cache and offline behavior. |
| `icons/icon.svg` | PWA/app icon. |

## Keep: Active Docs

| Path | Reason |
|---|---|
| `README.md` | Public/project overview. |
| `docs/current-state-audit.md` | Current stable app state. |
| `docs/next-session-brief.md` | Best restart/resume document. |
| `docs/issues-backlog.md` | Practical active backlog. |
| `docs/m1-smoke-test.md` | Manual smoke checklist, still useful despite the M1 name. |
| `docs/v2-refactor-plan.md` | V2 refactor guardrails and rollback discipline. |
| `docs/v2-runtime-dependency-map.md` | Current V2 architecture boundary map. |
| `docs/v2-color-and-contour-study-plan.md` | Implemented Color Study and Value Contours plan plus future calibration notes. |

## Keep As Archive / Project Memory

The `docs/issues/` files and older `docs/m1-*`, `docs/m2-*`, roadmap, AI-scope, and source-revision docs are not needed at runtime, but they explain decisions and prevent repeated churn. Keep them unless the project intentionally moves to a smaller documentation archive.

Good future cleanup candidates would be documentation consolidation, not runtime deletion:

- consolidate historical `m1-*` and `m2-*` files into an `docs/archive/` folder
- keep only `README.md`, `current-state-audit.md`, `next-session-brief.md`, `issues-backlog.md`, smoke test, and V2 docs as the active doc set
- leave AI planning docs in place unless the separate AI app fully supersedes them

## Recommended Action

Do not delete files in this pass.

The useful cleanup is documentation alignment, which has been handled by updating the active docs to reflect V2 build 30, Color Study, Value Contours, and the current module boundary.
