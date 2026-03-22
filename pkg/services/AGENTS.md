# AGENTS.md

Guidance for coding agents working in `pkg/services`.

## Scope

- This package currently contains local service helpers for infrastructure, mainly Graph Node Docker setup.
- Main material lives in `graph-node/`.

## Important Files

- `package.json`: wrapper scripts for local graph-node lifecycle
- `graph-node/docker-compose.yml`: Docker Compose stack
- `graph-node/README.md`: usage notes

## Commands

Run from `pkg/services`:

```bash
pnpm run-graph-node
pnpm remove-graph-node
pnpm clean-graph-node
```

## Working Rules

- Treat this package as operational infrastructure, not application runtime code.
- Be careful with destructive cleanup such as `clean-graph-node`, which removes persisted local data.
- Prefer updating `graph-node/README.md` together with compose changes.

## Verification

- Config changes: inspect `docker-compose.yml` carefully.
- Runtime verification usually means bringing the stack up intentionally; do not do that unless the task requires it.

## Pitfalls

- Docker networking differs across hosts; the compose file relies on `host.docker.internal`.
- This package is small, so changes here should stay tightly scoped.
