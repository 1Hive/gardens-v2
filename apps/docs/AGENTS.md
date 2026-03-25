# AGENTS.md

Guidance for coding agents working in `apps/docs`.

## Scope

- This is the documentation site for Gardens.
- Stack: Next.js 14, Nextra, MDX.
- Most content lives in `pages/**/*.mdx`.

## Important Files

- `package.json`: local scripts
- `next.config.mjs`: Nextra integration
- `theme.config.tsx`: Nextra theme config
- `pages/_app.tsx`: global docs app wrapper
- `pages/_meta.tsx` and section-level `_meta.ts`: sidebar/navigation metadata
- `scripts/import_gitbook.py.txt`: import helper source kept as a `.txt` file

## Commands

Run from `apps/docs`:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm import
```

## Working Rules

- Prefer editing MDX pages and `_meta` files over changing theme/runtime code.
- Keep docs structure consistent with existing section layout under `pages/`.
- Do not edit `.next/` output.
- `next.config.mjs` already ignores ESLint during builds, so run `pnpm lint` explicitly when needed.
- If the task touches product behavior rather than docs wording, inspect the relevant package too instead of documenting guesses.

## Verification

- Content-only changes: `pnpm build`
- Theme or config changes: `pnpm build` and `pnpm lint`

## Pitfalls

- Navigation often depends on `_meta.ts` or `_meta.tsx`, not just file names.
- The import helper is not a normal Python module layout; treat it as a one-off script unless the task is specifically about imports.
