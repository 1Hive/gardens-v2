# AGENTS.md

Guidance for coding agents working in `apps/web` of the Gardens v2 monorepo.

## Scope

- This file is for the Next.js frontend app in `apps/web`.
- Do not assume monorepo-wide contract or subgraph procedures apply here unless the task explicitly crosses package boundaries.
- The web app depends on code and generated artifacts from `pkg/contracts` via the `#/*` TypeScript alias.

## App Summary

- Stack: Next.js 14 App Router, React 18, TypeScript, wagmi v1, viem, RainbowKit, urql, Tailwind CSS, DaisyUI, Sentry.
- Domain: multi-chain governance UI for Gardens communities and pools, including proposal flows, member actions, Safe interactions, and Superfluid/Passport-related admin flows.
- Styling: app-wide SCSS in `styles/globals.scss`, theme tokens in `tailwind.config.js`, fonts wired in [app/layout.tsx](/home/corantin/Documents/GitHub/gardens-v2/apps/web/app/layout.tsx).

## Important Directories

- [app](/home/corantin/Documents/GitHub/gardens-v2/apps/web/app): App Router pages, layouts, route handlers, Open Graph image routes.
- [components](/home/corantin/Documents/GitHub/gardens-v2/apps/web/components): UI components and forms.
- [providers](/home/corantin/Documents/GitHub/gardens-v2/apps/web/providers): Wagmi, RainbowKit, urql, theme, notifications.
- [contexts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/contexts): shared client state.
- [hooks](/home/corantin/Documents/GitHub/gardens-v2/apps/web/hooks): chain-aware data and wallet interaction hooks.
- [configs](/home/corantin/Documents/GitHub/gardens-v2/apps/web/configs): chain metadata, environment mode, subgraph version config.
- [services](/home/corantin/Documents/GitHub/gardens-v2/apps/web/services): external API clients and campaign helpers.
- [utils](/home/corantin/Documents/GitHub/gardens-v2/apps/web/utils): formatting, web3 helpers, proposal logic, logging.
- [src/generated.ts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/src/generated.ts): generated wagmi contract bindings. Regenerate, do not hand-edit.
- [src/customAbis.ts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/src/customAbis.ts): manual ABI additions when generated bindings are not enough.

## Routing Notes

- Main user-facing pages live under [app/(app)](/home/corantin/Documents/GitHub/gardens-v2/apps/web/app/%28app%29).
- The Gardens experience is centered on [app/(app)/gardens](/home/corantin/Documents/GitHub/gardens-v2/apps/web/app/%28app%29/gardens).
- Server endpoints live under [app/api](/home/corantin/Documents/GitHub/gardens-v2/apps/web/app/api).
- `next.config.js` defines several rewrites for legacy/nested garden URLs. Changes to route params often require checking rewrites too.

## Commands

Run from `apps/web` unless stated otherwise.

```bash
pnpm dev
pnpm build
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm generate
```

Useful details:

- `pnpm dev` runs `pnpm install && next dev`; avoid rerunning it repeatedly if dependencies are already installed.
- `pnpm build` runs `pnpm generate && next build`; build failures may come from generated wagmi code or server routes, not just page code.
- `pnpm generate` refreshes [src/generated.ts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/src/generated.ts) from [wagmi.config.ts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/wagmi.config.ts).

## Architecture Notes

### Providers and Runtime Boundaries

- Global providers are assembled in [providers/Providers.tsx](/home/corantin/Documents/GitHub/gardens-v2/apps/web/providers/Providers.tsx).
- Wagmi config is built dynamically from the current route's chain and can include a simulated wallet via query params.
- urql setup lives in [providers/urql.tsx](/home/corantin/Documents/GitHub/gardens-v2/apps/web/providers/urql.tsx) and is chain-aware at query time.
- Client/server boundaries matter. Keep browser-only code out of route handlers and server-only secrets out of client components.

### Chain and Subgraph Configuration

- Chain metadata is centralized in [configs/chains.tsx](/home/corantin/Documents/GitHub/gardens-v2/apps/web/configs/chains.tsx).
- Production/testnet behavior is gated by [configs/isProd.ts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/configs/isProd.ts) and can depend on localStorage as well as env.
- Subgraph versions come from [configs/subgraph.json](/home/corantin/Documents/GitHub/gardens-v2/apps/web/configs/subgraph.json).
- Many hooks derive chain context from the pathname. If you change URL structure, audit `useChainFromPath`, `useChainIdFromPath`, and dependent hooks.

### Contracts and ABIs

- This app imports contract ABIs from `pkg/contracts` through the `#/*` alias in [tsconfig.json](/home/corantin/Documents/GitHub/gardens-v2/apps/web/tsconfig.json).
- `wagmi.config.ts` uses aggregated diamond ABIs for `CVStrategy` and `RegistryCommunity`.
- If contract interfaces change, update the relevant ABI source in `pkg/contracts`, then run `pnpm generate` here.
- Do not hand-edit [src/generated.ts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/src/generated.ts).

### API Routes and Background Jobs

- Several routes under [app/api](/home/corantin/Documents/GitHub/gardens-v2/apps/web/app/api) are operational jobs, not simple public endpoints.
- Superfluid, Passport Oracle, rebalance keeper, IPFS, and Ably routes rely on secrets such as `CRON_SECRET`, `PINATA_*`, `NEXT_ABLY_API_KEY`, wallet private keys, and Notion/Farcaster credentials.
- Treat route changes as production-sensitive. Preserve auth checks and avoid logging secrets.

## Environment and Secrets

- Public env vars generally use `NEXT_PUBLIC_*`.
- Server-only env vars are used in route handlers and services. Do not move them into client bundles.
- Commonly referenced public vars include:
  - `NEXT_PUBLIC_ALCHEMY_KEY`
  - `NEXT_PUBLIC_WALLET_CONNECT_ID`
  - `NEXT_PUBLIC_ENV_GARDENS`
  - `NEXT_PUBLIC_SUBGRAPH_KEY`
  - feature flags under `NEXT_PUBLIC_FLAG_*`
- The app also reads some behavior flags from localStorage, including environment selection and multi-chain query toggles.

## Coding Rules For This App

- Prefer existing utilities and hooks over reimplementing chain, address, proposal, or formatting logic.
- Follow the existing import aliases:
  - `@/*` for app-local files
  - `#/*` for package-level imports from `pkg/*`
- Respect client component markers. If a file uses hooks, browser APIs, or wallet state, it likely needs `"use client"`.
- Keep route handlers compatible with their runtime assumptions. Sentry instrumentation splits node and edge setup under [src/instrumentation.ts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/src/instrumentation.ts) and [src/instrumentation-client.ts](/home/corantin/Documents/GitHub/gardens-v2/apps/web/src/instrumentation-client.ts).
- Preserve existing rewrites, wallet flows, and chain-specific behavior unless the task explicitly changes them.

## Verification Expectations

Choose the smallest meaningful verification for the change:

- UI or component changes: `pnpm lint` and `pnpm typecheck`
- Contract binding or ABI changes: `pnpm generate`, then `pnpm typecheck`
- Routing, metadata, or build-sensitive changes: `pnpm build`
- API route changes: `pnpm typecheck`, then `pnpm build` if the route touches server-only modules or runtime-specific code

If you cannot run a full build because required env vars are missing, say so clearly and still run the narrower checks that are possible.

## Known Pitfalls

- `pnpm build` can fail because `pnpm generate` runs first.
- `pnpm dev` installs dependencies before starting Next.js, which can be slow and noisy.
- `configs/isProd.ts` reads `localStorage`; do not import it into places that require pure server evaluation without understanding the implications.
- `providers/Providers.tsx` dynamically rebuilds wagmi config based on route context and simulated wallet query params; avoid unnecessary refactors there.
- `next.config.js` has custom webpack fallbacks, Sentry wrapping, permissive remote image patterns, and route rewrites. Treat edits there as high-risk.
- Many API routes are long-running integration code with external services. Small changes can have operational side effects.

## When To Look Outside `apps/web`

- ABI or contract function mismatch: inspect `pkg/contracts`.
- Broken `#/*` imports: inspect the corresponding package under `pkg/`.
- Subgraph schema/query mismatch: inspect `pkg/subgraph`.

## Preferred Workflow

1. Read the relevant route, hook, provider, or component first.
2. Check whether chain config, feature flags, or generated bindings are involved.
3. Make the smallest coherent change.
4. Run targeted verification.
5. Mention any required env vars or unverified production-sensitive paths in the final handoff.
