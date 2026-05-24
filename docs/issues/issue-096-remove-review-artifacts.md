# issue-096-remove-review-artifacts.md

## Goal
Remove only clearly disposable review/handoff artifacts identified in the repo cleanup audit.

## Scope
Delete only:
- review_packages/
- stray .DS_Store files if present

## Explicitly do not remove in this issue
- modules/
- historical docs under docs/
- roadmap docs
- issue docs
- implementation notes
- any app source or app assets

## Reason
This is a conservative cleanup pass. Remove only files that are clearly temporary and no longer needed.

## Acceptance criteria
- review_packages/ is removed
- stray .DS_Store files are removed if present
- no app code or current project docs are removed
