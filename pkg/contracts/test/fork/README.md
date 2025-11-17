# Fork Tests

These tests run against live Arbitrum mainnet state to validate real protocol integrations.

## Running Fork Tests

Fork tests are **opt-in** and skip by default (CI-friendly).

### Superfluid Streaming Tests

```bash
# Enable fork tests
export RUN_SUPERFLUID_FORK=true
export ARBITRUM_RPC=https://arb1.arbitrum.io/rpc

# Run tests
forge test --match-contract SuperfluidStreamingFork --fork-url $ARBITRUM_RPC -vv
```

Tests:
- YDS → Donation shares flow
- Donation share redemption
- Principal preservation over time
- Emergency scenarios

### YDS Strategy Tests

```bash
# Enable fork tests
export RUN_YDS_FORK=true
export ARBITRUM_RPC=https://arb1.arbitrum.io/rpc

# Run tests
forge test --match-contract GardensYDSFork --fork-url $ARBITRUM_RPC -vv
```

Tests:
- Real DAI deposits/withdrawals
- Yield simulation with real tokens
- Donation share mechanics
- Multi-month scenarios

## CI Behavior

Without env vars set, tests automatically skip:
```bash
forge test  # Fork tests skip, unit tests run normally
```

## Mock GDA

Tests use a simple mock GDA for Superfluid integration. For production validation, deploy a real Superfluid GDA and update test addresses.

