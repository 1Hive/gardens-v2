Updated **Security Policy** aligned with your Gardens bug bounty pool mechanics and requirements:

---

# Security Policy

## About Gardens v2 Security

Gardens v2 is a modular governance framework that enables communities to create and manage multiple governance pools with customizable parameters and voting mechanisms. We take security seriously and are committed to protecting our users and their communities.

## Supported Networks

Gardens v2 is currently deployed on the following networks:

| Network      | Status   | Support      |
| ------------ | -------- | ------------ |
| Gnosis Chain | ✅ Active | Full support |
| Polygon      | ✅ Active | Full support |
| Arbitrum     | ✅ Active | Full support |
| Optimism     | ✅ Active | Full support |
| Base         | ✅ Active | Full support |
| Celo         | ✅ Active | Full support |
| Ethereum     | ✅ Active | Full support |

We provide security support for all currently deployed networks.

---

## Bug Bounty Program (Gardens Pool)

Gardens v2 operates an on-chain bug bounty program through a dedicated funding pool:

* **Bounty Pool**: [https://app.gardens.fund/gardens/10/0x59c47c30da2a0ca7359590f023da0284fef83e73/0x114964e7d57288eb8e117b98dd8972c514027025](https://app.gardens.fund/gardens/10/0x59c47c30da2a0ca7359590f023da0284fef83e73/0x114964e7d57288eb8e117b98dd8972c514027025)

This pool rewards responsible disclosure of vulnerabilities affecting Gardens v2 smart contracts currently deployed and actively used on:

* [https://app.gardens.fund](https://app.gardens.fund)

### Scope

Eligible vulnerabilities include:

* Smart contracts developed by Gardens Core Contributors
* Contracts integrated into Gardens that may impact user funds or governance outcomes (evaluated case-by-case)

Out-of-scope:

* Front-end or UI-only bugs
* Previously reported vulnerabilities
* Issues in unused or deprecated contracts

---

## Known Vulnerabilities

Before reporting a new issue, review existing advisories:

* **GitHub Security Advisories**: [https://github.com/1Hive/gardens-v2/security/advisories](https://github.com/1Hive/gardens-v2/security/advisories)

Duplicate reports are not eligible for rewards.

---

## Reporting a Vulnerability

### 1. Mandatory Private Disclosure

All vulnerabilities **must first be reported via GitHub Security Advisories**:

* [https://github.com/1Hive/gardens-v2/security/advisories/new](https://github.com/1Hive/gardens-v2/security/advisories/new)

Do **not** create public issues.

### 2. Disclosure Rules

To remain eligible for rewards:

* Do **not** disclose the vulnerability to any third party before reporting
* Do **not** exploit the vulnerability
* Do **not** publish or share proof publicly before coordinated disclosure

Any violation will result in disqualification from the bounty.

### 3. Include Detailed Information

Reports should include:

* Description of the vulnerability
* Impact and potential exploit scenarios
* Steps to reproduce
* Affected contracts and networks
* Proof of concept (if applicable)

---

## Bounty Process

After submission:

1. Core Contributors will review and validate the report
2. Severity will be assessed using the **CVSS Risk Rating scale**
3. The team will coordinate remediation with the reporter
4. If eligible, the reporter will be invited to submit a **funding proposal** in the bounty pool

---

## Reward Structure

Rewards are determined as a percentage of the total pool funds:

| Severity | CVSS Score | Reward            |
| -------- | ---------- | ----------------- |
| Critical | 9.0 – 10.0 | 50% of pool funds |
| High     | 7.0 – 8.9  | 10% of pool funds |
| Medium   | 4.0 – 6.9  | 1% of pool funds  |

Notes:

* Final severity assessment is determined by Core Contributors
* Evaluation may include contextual and systemic impact beyond raw CVSS score
* Rewards scale dynamically with pool size

---

## Security Best Practices for Users

### For Community Creators

* Start with small amounts to test functionality
* Carefully review governance parameters before deployment
* Ensure trusted participants in privileged roles
* Monitor activity and proposals regularly

### For Community Members

* Use trusted wallets only
* Verify the official app: [https://app.gardens.fund](https://app.gardens.fund)
* Start with small stakes
* Keep wallet software updated

### For Developers

* Test on testnets before mainnet deployment
* Follow smart contract security best practices
* Stay updated with releases and advisories

---

## Dependencies and Third-Party Security

Gardens v2 integrates external protocols:

* **Allo Protocol v2**
* **The Graph**
* **Safe**

Security assumptions extend to these dependencies.

---

## Security Updates

Security updates are communicated via:

* Twitter: [https://twitter.com/gardens_fund](https://twitter.com/gardens_fund)
* Discord: [https://discord.gg/tJWPg69ZWG](https://discord.gg/tJWPg69ZWG)

---

## Contributing to Security

* Participate in audits and code reviews
* Report vulnerabilities responsibly
* Improve documentation and tooling

See: `./CONTRIBUTING.md`

---

## License and Legal

Licensed under GPL-3.0.

Use of Gardens v2 involves risks inherent to experimental blockchain systems. Users assume responsibility for their usage.

---
