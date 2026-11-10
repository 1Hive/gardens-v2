# Gardens advisory board

Private Kanban for `1Hive/gardens-v2` security advisories. This is a separate
Next.js app; do not deploy the older localhost-only board server. Cards show
the advisory's GitHub severity/state, team replies, recipient address, linked
bounty proposal, and fixed-and-deployed status from the public history ledger.
Manual stages and recipient/proposal references are shared in Redis. GitHub
remains the source of truth for advisory state and comments.
Comment summaries are cached for 15 minutes to limit GitHub API usage; the
Refresh button bypasses that cache.

## Deployment plan

1. Create a GitHub App owned by 1Hive. Install it **only** on `gardens-v2`.
   Grant `Repository security advisories: Read & write` and the implicit
   `Metadata: Read`. Enable user authorization, and set its callback URL to
   `https://<board-domain>/api/auth/callback/github`. Do not use a broad
   OAuth App `repo` scope or an installation token for user requests.
2. Create a separate Vercel project from this repository with Root Directory
   `apps/advisory-board`, framework Next.js, and production branch `main`
   after this branch is reviewed and merged. Configure a stable HTTPS domain
   before enabling GitHub sign-in. GitHub requires an exact callback URL.
3. Provision an Upstash Redis database for shared workflow state. Set these
   **server-side Vercel environment variables** for production:

   | Variable | Purpose |
   | --- | --- |
   | `GITHUB_APP_CLIENT_ID` | GitHub App client ID |
   | `GITHUB_APP_CLIENT_SECRET` | GitHub App client secret |
   | `NEXTAUTH_SECRET` | Random 32+ byte session encryption secret |
   | `NEXTAUTH_URL` | Exact public HTTPS board origin |
   | `UPSTASH_REDIS_REST_URL` | Shared workflow database endpoint |
   | `UPSTASH_REDIS_REST_TOKEN` | Shared workflow database token |

   Do not use `NEXT_PUBLIC_` for these values, and do not put them in GitHub,
   `.env` files committed to the repository, or Vercel build logs. Restrict
   the variables to the production environment. Use a separate GitHub App,
   callback URL, Redis database, and secrets for a preview environment.
4. Test with two Gardens security managers and an account without advisory
   access. Confirm the first two see private cards and shared stage changes,
   the third cannot sign in or call the APIs, and advisory state transitions
   still require each user's GitHub write permission. Verify a revoked user
   loses API access after GitHub revocation.
5. Enable the production domain after the above checks. Keep the Vercel
   deployment protected until access testing is complete.

GitHub's advisory API is checked with each signed-in user's GitHub App token.
Only users with access to unpublished advisories can open the board. A security
manager/admin sees all advisories; an advisory-specific collaborator sees only
the advisories GitHub returns to that account. The app does not use a shared
GitHub PAT. Session cookies are encrypted and HttpOnly; the access token is
never returned to the browser session endpoint. API responses are uncached.

## Local development

Use a separate local GitHub App callback
`http://localhost:4318/api/auth/callback/github` and the same server-side env
variables. Without Redis configured, local development uses an in-memory
workflow store; hosted environments fail closed when Redis is missing.

```bash
pnpm --filter advisory-board test
pnpm --filter advisory-board dev
```

Drag cards or use the Move selector. Moving to a GitHub state updates GitHub
using the signed-in account. Manual workflow moves do **not** post advisory
comments or create bounty proposals. Publishing requires typing the advisory
ID. Confirm affected versions and fixed rollout on GitHub before publishing.
