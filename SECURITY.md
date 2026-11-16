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

For concrete examples of intended-design, non-production, and duplicate report categories, see [Known Non-Eligible Findings](./security/known-non-eligible-findings.md).

---

## Known Vulnerabilities

Before reporting a new issue, review existing advisories and acknowledged decisions:

* **GitHub Security Advisories**: [https://github.com/1Hive/gardens-v2/security/advisories](https://github.com/1Hive/gardens-v2/security/advisories)
* **Advisory History**: [./security/advisory-history.md](./security/advisory-history.md)

Duplicate reports are not eligible for rewards.

Researchers should also review [Known Non-Eligible Findings](./security/known-non-eligible-findings.md) before submitting a report.

Before submitting or automatically drafting a report, search both linked files for the affected component and underlying root cause, not just the report title or reproduction steps. A matching closed decision is a duplicate or non-eligible precedent unless the new report demonstrates a distinct production-reachable root cause or impact. The public history omits unresolved private exploit details, so the absence of an entry does not establish eligibility.

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

The severity tier sets the starting reward as a percentage of the total pool funds:

| Severity | CVSS Score | Reward            |
| -------- | ---------- | ----------------- |
| Critical | 9.0 – 10.0 | 50% of pool funds |
| High     | 7.0 – 8.9  | 10% of pool funds |
| Medium   | 4.0 – 6.9  | 1% of pool funds  |

Notes:

* Final severity assessment is determined by Core Contributors
* Evaluation may include contextual and systemic impact beyond raw CVSS score
* Rewards scale dynamically with pool size

### Prospective Fund-Loss Cap

For an advisory whose demonstrated impact is direct theft, diversion, or unrecoverable loss of user or pool funds, the bounty is the **lesser of the severity-tier reward and the maximum reasonably demonstrable funds at risk**. We assess the funds exposed in currently deployed and actively used Gardens flows, the amount an attacker can extract per attempt, realistic repeatability, and the time available before detection or mitigation. Hypothetical future deposits, adoption, or transaction volume do not increase the cap. The team will document the exposure estimate and its assumptions when setting the bounty amount; non-USD assets are valued in USD at the time of assessment for comparison with the pool's payout token.

Findings whose accepted impact is governance integrity, availability, or another non-theft outcome remain eligible for the severity-tier reward; a zero stolen-funds amount does not make those findings ineligible.

**Effective date:** This cap applies only to reports first submitted after this policy update is published on the repository's `main` branch, beginning with the next triage of new advisories. Reports submitted earlier, including those already in triage or accepted, retain the reward terms in effect when they were submitted, even if their review or bounty proposal occurs later. Reopening or resubmitting the same root cause does not change its original submission date.

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
