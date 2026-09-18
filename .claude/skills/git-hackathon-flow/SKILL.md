---
name: git-hackathon-flow
description: Use when starting new work, naming a branch, writing a commit message, or merging to main — multiple people are running Claude Code against this repo at once.
---

# Git flow for the hackathon

Several people are running Claude Code against this same repo concurrently.
These rules exist to stop collisions and a broken `main`, not for process's
sake.

## Branching

- One branch per feature: `feat/<area>-<short-desc>`, e.g.
  `feat/extension-target-adapter`, `feat/marketplace-category-index`,
  `feat/catalog-razor-comparisons`.
- Use `fix/<area>-<short-desc>` for bug fixes, `chore/<short-desc>` for
  non-feature work (tooling, docs, deps).
- Keep branches scoped to one area (`apps/extension`, `apps/marketplace`,
  `packages/catalog`, `packages/matcher`, `packages/tokens`) where possible —
  smaller surface means fewer merge conflicts with teammates working
  elsewhere.

## Commit messages

Conventional commits:

- `feat: <what>` — new capability (a new adapter, a new badge state, a new
  catalog record set).
- `fix: <what>` — bug fix.
- `chore: <what>` — tooling, config, docs, dependency changes.

Keep the subject line describing what changed, not a diary of the session.

## Before merging to main

- [ ] Run catalog validation: `pnpm run catalog:validate`.
- [ ] Run fixture/unit tests: `pnpm run test`.
- [ ] Run typecheck: `pnpm run typecheck` (or `pnpm run build`, which chains
      catalog validation, typecheck, and both app builds).
- Don't merge a branch that fails any of these just to "fix it after" — with
  multiple people merging into `main` in parallel, a broken `main` blocks
  everyone immediately.

## Hard rules

- No force-pushing `main`.
- No direct pushes to `main` that skip the build check above — even for a
  "trivial" change, since trivial changes are exactly what collide with
  someone else's in-flight work.
- Never commit `node_modules/`, build output (`dist/`), or `.env`/credential
  files. Check `git status` before staging broadly (`git add -A`) — this repo
  handles no user data or secrets by design (REQUIREMENTS §3), so a stray
  credential file showing up in a diff is a sign something is misconfigured,
  not something to just gitignore silently.
