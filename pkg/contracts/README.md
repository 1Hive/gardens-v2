# Contracts Tasks

This package uses Taskfile.dev for common Foundry workflows.

## Prerequisites

- Install Taskfile.dev (`task`) from https://taskfile.dev or through `npm install -g @go-task/cli`
- Ensure `.env` is present (see `example.env`)

## Common Tasks

- List tasks: `task -l`
- Aggregate ABIs: `task aggregate-abi`
- Verify storage (quick): `task verify-storage-quick` (uses cached layouts in `cache/storage-layout` when available)
- Run local fork: `task fork`
- Deploy locally: `task deploy`
- Add strategy (local): `S=0x... C=0x... task add-strategy-local`

## Notes

- Taskfile loads `.env` automatically.
- Variables can be overridden per call, e.g. `RPC_URL_LOCALHOST=http://... task test1`.
