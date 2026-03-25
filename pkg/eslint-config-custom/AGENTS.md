# AGENTS.md

Guidance for coding agents working in `pkg/eslint-config-custom`.

## Scope

- Shared ESLint config package for the monorepo.
- Main file: `index.js`

## Working Rules

- Keep changes minimal and broadly compatible across all consuming packages.
- Prefer additive rule changes over sweeping style changes unless the task explicitly wants a repo-wide policy shift.
- Remember that a config change here can affect `apps/web`, `apps/docs`, and any other package that consumes it.

## Verification

- There are no package-local tests.
- Validate by running lint in at least one affected consumer package.
- For risky config changes, validate the main consumers:
  - `cd apps/web && pnpm lint`
  - `cd apps/docs && pnpm lint`

## Pitfalls

- A change that seems local here can create monorepo-wide lint churn.
- Keep parser/plugin assumptions aligned with the versions already declared in this package.
