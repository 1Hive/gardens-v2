# Dependency security backports

## GraphQL Tools utils 10.11.0 and 11.0.0

The shared utils patch applies to both versions and backports these upstream security changes,
for both the CJS and ESM distributions:

- [mergeDeep prototype-chain hardening](https://github.com/ardatan/graphql-tools/commit/0b9529f1988fd36186a7c106a6efe0356f1b7f2e)
- [mergeIncrementalResult path validation](https://github.com/ardatan/graphql-tools/commit/20d36a5c6eb8fd5524420988e01a48618c450d70)
- [Property-access `__proto__` guard](https://github.com/ardatan/graphql-tools/commit/19f5b3373fd7ace0688d19950fc529ce8347952a)

Only the security guards are backported. The existing GraphQL 16 variable API,
null/undefined merge behavior, and other package APIs remain unchanged. A blanket
upgrade to utils 12.0.2+ breaks `@include` and `@skip` variables in the installed
older executor, delegate, stitch, and wrap packages. A full upgrade must coordinate
those callers; do not replace these backports with an unchecked global override.

`pnpm --dir apps/web audit:check` first inspects all installed workspace dependency
paths for utils and runs security and ordinary-query regressions against both
module formats. It fails closed if dependency inspection fails, an affected
installed copy is missing, or a security check fails. Only then does the existing
npm audit gate run. Its single path-specific, expiring decision for advisory
1242879 accounts for npm's inability to model pnpm patches; it does not waive the
installed-package checks. No other advisory is newly ignored.

Remove the patches, regression compatibility requirement, and audit decision only
after upgrading the entire affected GraphQL Tools caller chain compatibly. Keep
security regression coverage after that migration. The older utils 8/9 lines are
outside advisory GHSA-c4qx-w738-7hr3 and are intentionally unchanged.
