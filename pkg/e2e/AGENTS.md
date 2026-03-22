# AGENTS.md

Guidance for coding agents working in `pkg/e2e`.

## Current State

- This directory is currently a placeholder.
- Present contents are mostly local state: `.env`, `.cache-synpress/`, and `node_modules/`.
- There is no committed `package.json`, test harness source, or stable project structure here at the moment.

## Working Rules

- Do not assume an active e2e framework is already set up.
- Do not edit `.cache-synpress/` or `node_modules/`.
- If a task asks for e2e work here, first establish whether the user wants a new package structure created or an existing local setup repaired.

## Validation

- There are no package-local validation commands to rely on from the current repo state.
- If you add real e2e code here, document the chosen runner and scripts in this directory.
