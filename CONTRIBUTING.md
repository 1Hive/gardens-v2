# Contributing to Gardens v2

Thank you for your interest in contributing to Gardens v2! We're excited to have you help build the future of modular governance and community-driven decision making.

Gardens v2 is a modular governance framework that enables communities to create and manage multiple governance pools with customizable parameters and voting mechanisms. As an open-source project, we welcome contributions from developers, designers, writers, and community members of all skill levels.

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

### Making Your First Contribution

1. **Create a new branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards (see below)

3. **Test your changes**:
   ```bash
   # For frontend changes
   cd apps/web
   pnpm lint
   pnpm build
   
   # For contract changes (requires Foundry)
   cd pkg/contracts
   forge test
   forge fmt
   
   # Build all packages (note: requires Foundry for contracts)
   cd ../../
   pnpm build
   ```

4. **Commit your changes** with a descriptive message:
   ```bash
   git add .
   git commit -m "feat: add new governance pool type"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Detailed description of what was changed and why
   - Screenshots for UI changes
   - Link to related issues

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

### Commit Convention

We use conventional commits:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding or modifying tests
- `chore:` for maintenance tasks

## 🧪 Testing

### Running Tests

```bash
# Frontend tests (when available)
cd apps/web
pnpm test

# Frontend linting and building
cd apps/web
pnpm lint
pnpm build

# Contract tests (requires Foundry)
cd pkg/contracts
forge test

# Lint all packages
cd ../../
pnpm lint

# Build all packages (note: contracts require Foundry)
pnpm build
```

> **Note**: The full `pnpm build` command will fail without Foundry installed, but this doesn't affect frontend development. Frontend contributors can work with individual package builds.

### Writing Tests

- Write unit tests for new functionality
- Include integration tests for complex features
- Test edge cases and error conditions
- Update tests when modifying existing functionality

## 📚 Documentation

### Updating Documentation

- Update relevant documentation when making changes
- Follow the established documentation style
- Include code examples where helpful
- Update API documentation for contract changes

### Documentation Structure

- **User Documentation**: Located in our [main docs](https://docs.gardens.fund)
- **Developer Documentation**: Code comments and README files
- **API Documentation**: Generated from code comments

## 🚀 Deployment and Release

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for new features
- Feature branches: `feature/description`
- Hotfix branches: `hotfix/description`

### Release Process

1. Features are merged into `develop`
2. Release candidates are created from `develop`
3. After testing, releases are merged into `main`
4. Tags are created for releases

## 🌍 Community

### Getting Help

- **Discord**: Join our [Discord Community](https://discord.gg/tJWPg69ZWG)
- **Documentation**: Check our [docs](https://docs.gardens.fund)
- **GitHub Issues**: Search existing issues or create a new one
- **New Contributor Guide**: See our [Notion guide](https://1hive-gardens.notion.site/Gardens-New-Contributor-Onboarding-8ab2e08a585c46e3bcb36482d006c9e9?pvs=4)

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful in all interactions and follow our community guidelines.

### Recognition

Contributors are recognized in our:
- GitHub contributor list
- Discord community roles
- Project documentation
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