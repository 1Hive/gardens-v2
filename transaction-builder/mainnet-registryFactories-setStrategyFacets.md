# Mainnet RegistryFactory setStrategyFacets Payloads

This file indexes the non-Optimism mainnet `RegistryFactory.setStrategyFacets(...)` payloads generated from `pkg/contracts/config/networks.json`.

Per-chain Safe import files:
- `transaction-builder/ethereum-registryFactory-setStrategyFacets-safe.json`
- `transaction-builder/arbitrum-registryFactory-setStrategyFacets-safe.json`
- `transaction-builder/polygon-registryFactory-setStrategyFacets-safe.json`
- `transaction-builder/gnosis-registryFactory-setStrategyFacets-safe.json`
- `transaction-builder/base-registryFactory-setStrategyFacets-safe.json`
- `transaction-builder/celo-registryFactory-setStrategyFacets-safe.json`

Aggregate workspace bundle:
- `transaction-builder/mainnet-registryFactories-setStrategyFacets.json`

Notes:
- Only `RegistryFactory.setStrategyFacets(...)` is included.
- Optimism is intentionally excluded because it already has a dedicated payload file.
- `strategyInitCalldata` is `0xe1c7392a` on every chain.
- The cut order is: loupe, admin, allocation, dispute, pause, power, proposal, sync, streaming.

## Targets

- Ethereum
  - chainId: `1`
  - registryFactory: `0x7d26c5b083b85b848645fcbd18fe01168989333b`
  - strategyInit: `0x311ece7fc8111897c8e72738159adc0bda6f3a7e`
  - file: `transaction-builder/ethereum-registryFactory-setStrategyFacets-safe.json`
- Arbitrum
  - chainId: `42161`
  - registryFactory: `0xc1c2e092b7dbc8413e1ac02e92c161b0bda783f6`
  - strategyInit: `0x0ddc35193a09ecac8242662e3aa3b944abf5f0b3`
  - file: `transaction-builder/arbitrum-registryFactory-setStrategyFacets-safe.json`
- Polygon
  - chainId: `137`
  - registryFactory: `0x57a9835b204dbcc101dbf981625a3625e8043b9c`
  - strategyInit: `0x2315ee63c0972e93bb3248a77980a69de11bf325`
  - file: `transaction-builder/polygon-registryFactory-setStrategyFacets-safe.json`
- Gnosis
  - chainId: `100`
  - registryFactory: `0x08df82f74d1f56f650e98da2dd4240f1a31711bc`
  - strategyInit: `0x71253ab7eb2b7b83bd43984ebe534ab6adb31e7b`
  - file: `transaction-builder/gnosis-registryFactory-setStrategyFacets-safe.json`
- Base
  - chainId: `8453`
  - registryFactory: `0xc93830dd463516ed5f28f6cd4f837173b87ff389`
  - strategyInit: `0xb9dbc6a79ed8b991732b7fb3fab4eff55397f853`
  - file: `transaction-builder/base-registryFactory-setStrategyFacets-safe.json`
- Celo
  - chainId: `42220`
  - registryFactory: `0xa71023bc64c9711c2037ab491de80fd74504bd55`
  - strategyInit: `0xd6e4b0e094c5ae63cdd3f6e622ed22030a3a908b`
  - file: `transaction-builder/celo-registryFactory-setStrategyFacets-safe.json`
