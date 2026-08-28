# M2 Kickoff Checklist

## First M2 Feature

- Choose one low-risk workflow improvement only.
- Keep deterministic behavior primary.
- Avoid simultaneous UX and architecture changes in the same issue.

## Branch Naming

- Use one branch per issue.
- Suggested pattern: `codex/m2-<short-feature-name>`

## Acceptance Criteria

- User-facing value is clear.
- Existing stages still work.
- No regression in image load, composition selection, or exports.
- Scope is small enough to revert cleanly if needed.

## Smoke Checks

- Run the checklist in [docs/m1-smoke-test.md](m1-smoke-test.md) after implementation.
- Compare against reference screenshots when layout is affected.

## Rollback Rule

- If regressions repeat twice on the same issue, revert and split the issue into a smaller unit before retrying.
