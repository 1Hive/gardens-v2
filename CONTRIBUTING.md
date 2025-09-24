# Contributing to Gardens v2

Thank you for your interest in contributing to Gardens v2! We're excited to have you help build the future of modular governance and community-driven decision making.

Gardens v2 is a modular governance framework that enables communities to create and manage multiple governance pools with customizable parameters and voting mechanisms. As an open-source project, we welcome contributions from developers, designers, writers, and community members of all skill levels.

👉 **Need help or want to chat before you start?** Join our [Discord community](https://discord.gg/tJWPg69ZWG) to meet maintainers, ask questions, and sync with other contributors.

## 🌱 Getting Started

### Prerequisites

Before you begin, ensure you have:

- [Node.js](https://nodejs.org/en/download/) (v18 or higher)
- [pnpm](https://pnpm.io/installation) (v8.14 or higher)
- [Git](https://git-scm.com/downloads)
- A GitHub account

### First Time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/your-username/gardens-v2.git
   cd gardens-v2
   ```

3. **Add the upstream remote**:

   ```bash
   git remote add upstream https://github.com/1Hive/gardens-v2.git
   ```

4. **Install dependencies**:

   ```bash
   pnpm install
   ```

5. **Open the workspace** in VSCode (recommended):
   ```bash
   code gardens-v2.code-workspace
   ```

## 🏗️ Development Environment

Gardens v2 is a monorepo with several packages:

### Frontend Development (`apps/web`)

For frontend contributions:

1. **Navigate to the web app**:

   ```bash
   cd apps/web
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env
   ```

   Fill in the required environment variables (contact us in Discord for help with API keys)

3. **Start the development server**:

   ```bash
   pnpm dev
   ```

4. **Open your browser** to http://localhost:3000

### Smart Contracts Development (`pkg/contracts`)

For smart contract contributions:

1. **Install Foundry** (required for contract development):

   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Navigate to contracts package**:

   ```bash
   cd pkg/contracts
   ```

3. **Build contracts**:

   ```bash
   forge build
   ```

4. **Run tests**:
   ```bash
   forge test
   ```

> **Note**: Foundry is only required for smart contract development. Frontend contributors can skip this setup.

### Subgraph Development (`pkg/subgraph`)

For subgraph contributions:

1. **Navigate to subgraph package**:

   ```bash
   cd pkg/subgraph
   ```

2. **Build the subgraph**:
   ```bash
   pnpm build
   ```

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug fixes**: Help us squash bugs in the codebase
- **✨ New features**: Implement new governance features or improvements
- **📖 Documentation**: Improve guides, API docs, or code comments
- **🎨 UI/UX improvements**: Enhance the user experience
- **🧪 Testing**: Add or improve test coverage
- **🌐 Translations**: Help make Gardens accessible globally
- **🔍 Code review**: Review pull requests from other contributors

### Before You Start

1. **Check existing issues** on GitHub to see if your idea is already being worked on
2. **Join our Discord** to discuss your contribution idea with the community
3. **Review our [New Contributor Onboarding](https://1hive-gardens.notion.site/Gardens-New-Contributor-Onboarding-8ab2e08a585c46e3bcb36482d006c9e9?pvs=4)** guide

## 📋 Coding Standards

### General Guidelines

- Write clear, self-documenting code
- Follow existing patterns and conventions in the codebase
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable and function names

### TypeScript/React (Frontend)

- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Use functional components with hooks
- Implement proper error handling
- Write responsive designs using Tailwind CSS
- Follow the established folder structure

### Solidity (Smart Contracts)

- Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use NatSpec documentation for all public functions
- Write comprehensive test coverage
- Use proper access modifiers
- Follow established patterns for upgradeable contracts

## 🧪 Testing

### Running Lint/Tests

#### Frontend linting and building

```bash
cd apps/web
pnpm lint
pnpm build
```

#### Contract tests (requires Foundry)

```bash
cd pkg/contracts
forge test
```

#### Lint all packages

```bash
cd ../../
pnpm lint
```

#### Build all packages from root (note: contracts require Foundry)

```bash
cd ../../
pnpm build
```

> **Note**: The full `pnpm build` command will fail without Foundry installed, but this doesn't affect frontend development. Frontend contributors can work with individual package builds.

### Writing Tests

- Write unit tests for new functionality
- Test edge cases and error conditions
- Update tests when modifying existing functionality

## 🚀 Deployment and Release

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for new features
- Name your branches based on the feature or fix (e.g., `feature/new-governance-pool`, `fix/vote-weight-bug`)

### Release Process

1. Features are merged into `develop`
2. Release candidates are created from `develop`
3. After testing, releases are merged into `main`

## 🌍 Community

### Getting Help

- **Discord**: Join our [Discord Community](https://discord.gg/tJWPg69ZWG)
- **Documentation**: Check our [docs](https://docs.gardens.fund)
- **GitHub Issues**: Search existing issues or create a new one
- **New Contributor Guide**: See our [Notion guide](https://1hive-gardens.notion.site/Gardens-New-Contributor-Onboarding-8ab2e08a585c46e3bcb36482d006c9e9?pvs=4)

### Code of Conduct

Gardens v2 is built on the principles of community-driven governance and inclusive participation. We are committed to fostering a welcoming environment where all contributors can collaborate effectively, regardless of their background, experience level, or identity.

#### Our Community Covenant

Just as Gardens enables communities to create their own covenants for governance, our development community operates under shared values:

- **Respectful Communication**: We engage in constructive dialogue, listen actively, and assume good intentions from fellow contributors
- **Inclusive Collaboration**: We welcome diverse perspectives and encourage participation from contributors of all backgrounds and skill levels
- **Constructive Feedback**: We provide thoughtful, specific feedback aimed at improving the project and supporting fellow contributors
- **Shared Responsibility**: We take collective ownership of the project's success and help maintain a positive community environment

#### Expected Behavior

Contributors are expected to:

- Use welcoming and inclusive language in all communications
- Respect differing viewpoints and experiences
- Give and receive constructive feedback gracefully
- Focus on what's best for the overall community and project
- Show empathy and kindness toward other community members
- Help newcomers feel welcome and supported

#### Unacceptable Behavior

The following behaviors are not tolerated:

- Harassment, discrimination, or exclusionary conduct of any kind
- Trolling, insulting comments, or personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Any conduct that would be inappropriate in a professional setting

#### Enforcement and Resolution

Community conflicts should first be addressed through direct, respectful communication. For serious issues or persistent problems:

1. Contact the maintainers through our [Discord Community](https://discord.gg/tJWPg69ZWG)
2. Report issues privately via GitHub or Discord direct messages
3. For urgent matters, reach out to project maintainers directly

We believe in restorative rather than punitive approaches, focusing on education and community healing when possible.

#### Building Together

Gardens v2 empowers communities to govern themselves through transparent, participatory processes. Our development community embraces these same principles, encouraging open discussion, collaborative decision-making, and shared stewardship of this public good.

For questions about community guidelines or to learn more about Gardens' approach to community governance, visit our [Covenant creation tools](https://www.notion.so/1hive-gardens/Covenant-the-community-constitution-103d6929d014801da379c5952d66d1a0) and join the conversation in our [Discord Community](https://discord.gg/tJWPg69ZWG).

### Recognition

Contributors are recognized in our:

- Discord community roles
- Community calls and updates

## 🔒 Security

If you discover a security vulnerability, please follow our [Security Policy](./SECURITY.md) and report it responsibly through our private channels.

## 📄 License

By contributing to Gardens v2, you agree that your contributions will be licensed under the [GPL-3.0 License](./LICENSE).

## 💡 Questions?

If you have questions about contributing, don't hesitate to:

- Ask in our [Discord Community](https://discord.gg/tJWPg69ZWG)
- Open a GitHub issue with the "question" label
- Check our [documentation](https://docs.gardens.fund)

Thank you for helping make Gardens v2 better for everyone! 🌱
