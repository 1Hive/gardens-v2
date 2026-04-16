# AGENTS.md

Guidance for coding agents working in `pkg/ui`.

## Current State

- This directory is effectively empty in the current repo state.
- There is no committed `package.json`, source tree, or published component library implementation here right now.
- Present contents are local install/cache artifacts such as `node_modules/` and `.turbo/`.

## Working Rules

- Do not assume a reusable UI package already exists here.
- Do not edit `node_modules/` or `.turbo/`.
- If the task asks for shared UI work, first determine whether the change actually belongs in `apps/web/components` or whether the user wants this package bootstrapped.

## Validation

- There are no package-local scripts or tests to run from the current repo state.
- If you create real package contents here, also add basic package metadata and update this guide accordingly.
