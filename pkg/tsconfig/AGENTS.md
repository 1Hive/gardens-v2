# AGENTS.md

Guidance for coding agents working in `pkg/tsconfig`.

## Scope

- Shared TypeScript config package for the monorepo.
- Main files:
  - `base.json`
  - `nextjs.json`
  - `react-library.json`

## Working Rules

- Keep changes conservative. A config tweak here can break multiple packages at once.
- Prefer the smallest possible change to support the specific consumer need.
- Preserve compatibility with current toolchain versions used across the workspace.

## Verification

- There are no package-local scripts.
- Validate in the consuming package that motivated the change.
- For broad changes, validate at least:
  - `cd apps/web && pnpm typecheck`
  - `cd apps/docs && pnpm build`

## Pitfalls

- Path, module resolution, and JSX setting changes can have cascading effects.
- This package is pure configuration; avoid treating it like a code package with standalone runtime behavior.
