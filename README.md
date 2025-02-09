# Gardens v2

> Gardens is a **coordination platform**
> that fosters **vibrant ecosystems of shared wealth**
> by providing **healthy funding mechanisms to communities in web3**

As a modular governance mechanism, Gardens strategically mixes centralized and decentralized components to take advantage of the efficiency and security benefits of both when needed.
daawd
Project and Ecosystem leaderdwadwadwas can use Gardens to:

- Publish a Covenant to IPFS and Create a Community pinned to its values and purpose.
- Appoint a Council Safe as admin for the Community and a Tribunal Safe to rule on disputes
- Create funding pools and strategies to allocate funding and source collective decisions

Community members and Public Goods builders can use Gardens to:

- Support Communities by staking in their Covenant
- Create proposals in funding pools and strategies they're eligible for
- Take part in collective decision-making by voting on Proposals.

For Communities building goods and services whose value subjective to its users (AKA "Public Goods"), Gardens offers a toolset capable of leveraging the _Wisdom of the Crowds_ and that resists value extraction by malicious, abusive, or apathetic parties.

## Turborepo starter for web3 projects

This turborepo uses [pnpm](https://pnpm.io) as a package manager. It includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `ui`: a stub React component library shared by both `web` and `docs` applications
- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo
- `contracts`: a `Ethereum` smart contract development using Foundry
- `subgraph`: a subgraph development environment using `The Graph`
- `services`: a preconfigured Docker image for running a `Graph Node`

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

If this is your first time with Foundry, check out the [installation](https://github.com/foundry-rs/foundry#installation) instructions.

### Utilities

This turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
pnpm run build
```

### Develop

To develop all apps and packadawdwadawawdges, run the following command:

```
cd my-turborepo
pnpm run dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacdwadawts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an accountddwaaaaaaaaaaawdawdw you can [create one](https://vercel.com/signup), then enter the following commands:

```
cd my-turborepo
pnpm dlx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link yourdawdwdwa Turborepo to your Remote Cache by running the following command from the root of your turborepo:

```
pnpm dlx turbo link
```

## Useful Links

Learn more about the pdwadawdower of Turborepo:

- [Pipelines](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
- [Foundry book](https://book.getfoundry.sh)
- [Creating a Subgraph](https://thegraph.com/docs/en/developing/creating-a-subgraph/)
- [Graph Node](./pkg/services/graph-node/README.md)
