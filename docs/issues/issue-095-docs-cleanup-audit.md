# issue-095-docs-cleanup-audit.md

## Goal
Do a conservative documentation/file cleanup audit of the repo, without deleting anything yet.

## Product decision
Audit first. Do NOT remove files in this issue.

We want a review of repo files to identify:
- safe-to-remove files
- files that should definitely be kept
- files that are uncertain and need manual review before deletion

## Scope
Inspect the repo and produce a cleanup candidate report.

Create:
- docs/repo-cleanup-audit.md

## What the audit must cover

### 1. Safe-to-remove candidates
Examples may include:
- review_packages/
- temporary Claude/Gemini review handoff material
- one-off inventory docs created only for external review
- abandoned experiment docs that are clearly no longer needed

### 2. Keep
Examples may include:
- README.md
- docs/current-state-audit.md
- docs/milestones.md
- docs/issues-backlog.md
- docs/next-session-brief.md
- docs/roadmaps/
- docs/issues/ that form useful project memory for implemented work

### 3. Uncertain / manual decision
Examples may include:
- docs that may still be useful historically but are not core
- duplicated review notes
- stale exploratory docs whose future value is unclear

## Report format
For each candidate:
- file/path
- bucket:
  - safe to remove
  - keep
  - uncertain
- one-line reason

At the end include:
- a short recommended deletion batch for the next issue
- explicit note that this issue makes no deletions

## Constraints
- Audit only
- No file deletions
- No code changes
- No doc edits except creating the audit report
- Be conservative
- Prefer keeping too much over deleting something useful

## Acceptance criteria
- repo-cleanup-audit.md is created
- files are categorized conservatively
- nothing is deleted
- next cleanup step is easier and safer
