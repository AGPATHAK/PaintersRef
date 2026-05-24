# Repo Cleanup Audit

This is a conservative audit only. No files were deleted or modified as part of this report.

## Safe To Remove

These look like temporary, generated, or handoff artifacts that are not needed for the working app.

| Path | Bucket | Reason |
|---|---|---|
| `.DS_Store` | safe to remove | macOS metadata file; already ignored by `.gitignore`; not needed by app or docs. |
| `review_packages/.DS_Store` | safe to remove | macOS metadata file inside an ignored review package directory. |
| `review_packages/` | safe to remove | Ignored directory containing one-off Claude review handoff material; useful work has already been incorporated into roadmap/docs. |
| `review_packages/claude_workflow_review_001/` | safe to remove | Temporary external-review package; current docs now capture implemented workflow direction. |
| `review_packages/claude_workflow_review_001/screenshots_manifest.md` | safe to remove | Placeholder manifest for screenshots that were never required for the app. |
| `review_packages/claude_workflow_review_001/README.md` | safe to remove | Handoff brief superseded by current roadmap and state docs. |
| `review_packages/claude_workflow_review_001/current_state_summary.md` | safe to remove | Superseded by `docs/current-state-audit.md`. |
| `review_packages/claude_workflow_review_001/current_ui_structure.md` | safe to remove | Superseded by current README/state audit workflow descriptions. |
| `review_packages/claude_workflow_review_001/proposed_next_change.md` | safe to remove | Superseded by `docs/roadmaps/workflow-stage-restructure-roadmap.md`. |
| `review_packages/claude_workflow_review_001/repo_file_map.md` | safe to remove | One-off review navigation aid; not needed by app or current docs. |
| `review_packages/claude_workflow_review_001/painters_ref_review.md` | safe to remove | External review output; decisions have been distilled into roadmap/current-state docs. |
| `review_packages/claude_workflow_review_001/painters_ref_terminology_review.md` | safe to remove | External terminology review output; implemented vocabulary decisions are reflected in current UI/docs. |

## Keep

These are app source, app assets, current product docs, or useful project memory.

| Path | Bucket | Reason |
|---|---|---|
| `.gitignore` | keep | Defines ignored local/system artifacts including `.DS_Store` and `review_packages/`. |
| `README.md` | keep | Current public/project overview. |
| `index.html` | keep | Main app markup and controls. |
| `styles.css` | keep | Main app styling. |
| `app.js` | keep | Main app runtime and deterministic image processing. |
| `manifest.webmanifest` | keep | PWA manifest. |
| `service-worker.js` | keep | Offline/app-shell caching. |
| `icons/icon.svg` | keep | App icon. |
| `docs/current-state-audit.md` | keep | Current stable-state snapshot. |
| `docs/milestones.md` | keep | Current milestone record. |
| `docs/issues-backlog.md` | keep | Current practical backlog. |
| `docs/next-session-brief.md` | keep | Best restart/resume document. |
| `docs/roadmaps/workflow-stage-restructure-roadmap.md` | keep | Source-of-truth workflow-stage direction and deferred decisions. |
| `docs/issues/` | keep | Useful issue history for implemented decisions and project memory. |
| `docs/issues/issue-081-composition-painting-ui-cleanup.md` | keep | Historical issue record for completed UI cleanup. |
| `docs/issues/issue-082-calibrate-outline-and-masks.md` | keep | Historical issue record for calibration decisions. |
| `docs/issues/issue-083-docs-checkpoint-after-081-082.md` | keep | Historical documentation checkpoint. |
| `docs/issues/issue-084-outline-source-experiment.md` | keep | Historical outline-source context. |
| `docs/issues/issue-085-outline-control-spacing-polish.md` | keep | Historical outline-spacing context. |
| `docs/issues/issue-087-outline-inherit-source-adjustments.md` | keep | Historical source-state decision context. |
| `docs/issues/issue-088-workflow-stage-sidebar-restructure.md` | keep | Historical workflow-stage implementation context. |
| `docs/issues/issue-089-outline-local-source-controls.md` | keep | Historical record of a later-reversed experiment; useful for avoiding repeated drift. |
| `docs/issues/issue-091-outline-preset-curation.md` | keep | Current outline control simplification decision. |
| `docs/issues/issue-092-move-squint-to-painting.md` | keep | Current Squint grouping decision. |
| `docs/issues/issue-093-painterly-vocabulary-cleanup.md` | keep | Current UI vocabulary decision. |
| `docs/issues/issue-094-docs-cleanup-pass.md` | keep | Current docs cleanup issue record. |
| `docs/issues/issue-095-docs-cleanup-audit.md` | keep | Source issue for this audit. |
| `docs/reference-screenshots/README.md` | keep | Placeholder/process note for visual regression references. |

## Uncertain / Manual Review

These may still be useful historically or for future planning, but they are less central than the current README/state/roadmap/backlog set.

| Path | Bucket | Reason |
|---|---|---|
| `modules/` | uncertain | Empty directory; likely from planned module extraction. Safe to remove if no near-term extraction convention depends on it, but confirm first. |
| `docs/codex-implementation-notes.md` | uncertain | Implementation-planning notes may be stale, but could still help future Codex sessions. |
| `docs/feature-roadmap.md` | uncertain | Higher-level roadmap may duplicate current backlog/roadmap; review before deletion. |
| `docs/product-roadmap-2026.md` | uncertain | Broader roadmap may still be useful but may overlap with current focused docs. |
| `docs/master-project-document.md` | uncertain | Broad planning document; potentially useful as product memory, but likely overlaps current docs. |
| `docs/source-doc-revisions.md` | uncertain | Historical source-document revision notes; keep if they explain product rationale not captured elsewhere. |
| `docs/ux-rules.md` | uncertain | May be stale after workflow-stage changes; review for current relevance before keeping or updating. |
| `docs/mvp-ai-scope.md` | uncertain | AI scope is deferred; keep if future AI boundary planning matters. |
| `docs/m1-baseline-tag.md` | uncertain | Historical process doc; useful if reproducing M1 baseline discipline. |
| `docs/m1-breakdown.md` | uncertain | Historical implementation planning; may be redundant after current-state docs. |
| `docs/m1-build-order.md` | uncertain | Historical build sequence; likely stale but may explain project evolution. |
| `docs/m1-closeout.md` | uncertain | Historical closeout; useful archive, not core current-state doc. |
| `docs/m1-issues.md` | uncertain | Historical issue table; may be redundant with `docs/issues/`. |
| `docs/m1-m106-notes.md` | uncertain | Historical notes; review for unique context before deletion. |
| `docs/m1-no-go-zones.md` | uncertain | Some constraints remain relevant, but sidebar/no-go content may be stale. |
| `docs/m1-reference-screenshots.md` | uncertain | Screenshot plan may remain useful if visual regression work resumes. |
| `docs/m1-smoke-test.md` | uncertain | Should likely be updated rather than deleted, but current wording may be stale. |
| `docs/m2-01-study-sheet-preview.md` | uncertain | Historical feature spec for sheet previews; useful archive, not core current-state doc. |
| `docs/m2-kickoff-checklist.md` | uncertain | Historical checklist; likely stale but may retain process value. |

## Recommended Deletion Batch For A Future Issue

Start with only ignored/local artifacts:

1. `.DS_Store`
2. `review_packages/.DS_Store`
3. `review_packages/`

Optional after manual confirmation:

4. `modules/` if it is intentionally unused and no near-term module extraction work expects the directory.

## Notes

- This audit intentionally makes no deletions.
- Prefer keeping historical docs unless they are clearly duplicated by current docs or are external-review handoff artifacts.
- If a cleanup issue follows this audit, remove the recommended safe batch first and leave uncertain docs for a separate manual-review pass.
