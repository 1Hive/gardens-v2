# Gardens v2

Gardens v2 is a modular governance framework that enables communities to create and manage multiple governance pools with customizable parameters and voting mechanisms. Built on top of Allo Protocol v2, Gardens v2 provides flexible, intuitive, and multi-network governance solutions.

🌐 **[Launch Gardens v2 App](https://app.gardens.fund/)**

## Features

### Modular Governance Pools
Create multiple governance pools within your community, each serving distinct purposes with customized parameters and terms of use. This modular approach allows for more granular and focused governance decisions.

### Pool Types
- **Funding Pools**: Allocate funds from a shared token pool
- **Signaling Pools**: Source other types of decisions, both onchain and offchain

### Flexible Voting Weight Systems
Choose from multiple voting weight mechanisms to best suit your community's needs:
- **Token-weighted**: Traditional 1 token = 1 vote
- **Fixed**: Equal voting power for all members
- **Quadratic**: Voting weight = square root of tokens staked
- **Capped**: 1 token = 1 vote up to a maximum threshold

### Multi-Network Support
Currently deployed on:
- Gnosis Chain
- Polygon
- Arbitrum
- Optimism

*More networks coming soon!*

### Enhanced User Experience
Significant UI improvements make conviction voting more intuitive and easier to understand compared to v1, enabling broader participation in governance decisions.

## Prerequisites

To deploy your own instance of Gardens v2, you'll need:

- [Allo Protocol v2](https://allo.gitcoin.co/)
- [Turborepo](https://turborepo.org/)
- [The Graph](https://thegraph.com/)
- [Safe](https://safe.global/)

## Getting Started

### Using Gardens v2

1. Visit [https://app.gardens.fund/](https://app.gardens.fund/)
2. Connect your wallet
3. Choose your network
4. Create or join a governance pool

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/gardens-v2.git

# Install dependencies
cd gardens-v2
pnpm install

# Start the development server
pnpm dev
```

## Architecture

Gardens v2 is built with a modular architecture that leverages several key components:

- **Allo Protocol v2**: Core protocol for fund allocation
- **The Graph**: Indexing and querying blockchain data
- **Safe**: Multi-signature wallet integration
- **Turborepo**: Monorepo management

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

[GPL-3.0](https://github.com/1Hive/gardens-v2?tab=GPL-3.0-1-ov-file#readme)

## Support

- 📚 [Documentation](https://docs.gardens.fund)
- 💬 [Discord Community](https://discord.gg/gardens)
- 🐦 [Twitter](https://twitter.com/gardens_fund)
