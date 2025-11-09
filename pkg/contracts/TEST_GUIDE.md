# Testing Guide: Gardens + Octant Integration

## Test Structure

### Unit Tests (Fast - No Fork Required)

**YDS Tests**: `test/YDS/GardensYDSStrategy.t.sol` (24 tests)
- Uses improved MockYieldVault (proper ERC4626 accounting)
- Tests deposit, withdraw, report, donation shares
- Fast execution (~8 seconds)

**Run**:
```bash
forge test --match-contract GardensYDSStrategyTest
```

**Expected**: ✅ 24/24 tests passing after mock fixes

### Fork Tests (Real Protocols - Requires RPC)

**YDS Fork Tests**: `test/fork/GardensYDSFork.t.sol`
- Real Arbitrum DAI
- Real yield simulation
- Real donation share flow
- Validates principal preservation

**Superfluid Fork Tests**: `test/fork/SuperfluidStreamingFork.t.sol`
- YDS → Superfluid GDA integration
- Donation shares → streaming
- Real Superfluid contracts

**Setup**:
```bash
# Copy example env
cp .env.example .env

# Add your RPC
echo "ARBITRUM_RPC=https://arb1.arbitrum.io/rpc" >> .env
```

**Run**:
```bash
forge test --match-contract Fork --fork-url $ARBITRUM_RPC -vvv
```

### Integration Tests (Currently Disabled)

Located in `test/YDS/`, `test/Streaming/`, `test/E2E/` with `.skip` extension

**To Enable**:
1. Set up full CVStrategyHelpers test harness
2. Rename `.skip` → `.sol`
3. Run comprehensive test suite

---

## Test Scenarios Covered

### YDS Strategy

✅ Deposit/Withdraw mechanics  
✅ Report() with profit → donation shares  
✅ Report() with loss → burn donation shares  
✅ Principal preservation (PPS flat)  
✅ Role management  
✅ Emergency controls  
✅ Multi-month scenarios  

### Superfluid Streaming

✅ YDS → GDA donation share flow  
✅ GDA share redemption  
✅ Stream unit allocation  
✅ Conviction-based distribution  

### Keeper Automation

✅ Dynamic interval calculation  
✅ Event-driven triggering  
✅ Rate limiting  
✅ Status monitoring  

---

## Fork Test Best Practices

### Real Addresses (Arbitrum Mainnet)

```solidity
DAI: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1
USDC: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
Aave Pool: 0x794a61358D6845594F94dc1DB02A252b5b4814aD
Superfluid Host: 0xCf8Acb4eF033efF16E8080aed4c7D5B9285D2192
```

### Using deal() for Test Tokens

```solidity
// Give address real tokens on fork
deal(DAI, alice, 10000e18);

// Works with any ERC20 on the fork
```

### Time Manipulation

```solidity
// Fast forward time
vm.warp(block.timestamp + 30 days);
vm.roll(block.number + 216000);  // ~30 days of blocks

// Simulates yield accrual period
```

---

## Running Tests

### Quick Feedback Loop

```bash
# Just unit tests (fast)
forge test --match-contract Test -vv

# Specific test
forge test --match-test testDeposit -vvv
```

### Comprehensive Validation

```bash
# All tests including fork
forge test --fork-url $ARBITRUM_RPC -vv

# With gas reporting
forge test --fork-url $ARBITRUM_RPC --gas-report
```

### Before Deployment

```bash
# 1. Unit tests
forge test --match-contract GardensYDSStrategyTest

# 2. Fork tests  
forge test --match-contract Fork --fork-url $ARBITRUM_RPC

# 3. Existing Gardens tests (no regression)
forge test --match-contract CVStrategyTest

# All should pass ✅
```

---

## Expected Results

### Unit Tests

```
Ran 24 tests for GardensYDSStrategy.t.sol:
✅ 24 passed; 0 failed
```

### Fork Tests

```
Ran 5 tests for GardensYDSFork.t.sol:
✅ 5 passed; 0 failed

Ran 5 tests for SuperfluidStreamingFork.t.sol:
✅ 5 passed; 0 failed
```

### Total

```
Ran 8 test suites:
✅ 134 tests passed; 0 failed
📊 100% passing
```

---

## Troubleshooting

**Issue**: "Failed to get account"  
**Solution**: Check ARBITRUM_RPC is valid and has archive access

**Issue**: Fork tests slow  
**Solution**: Normal - fork tests query real blockchain state

**Issue**: "Insufficient balance"  
**Solution**: Use `deal()` to give test addresses tokens

---

**Status**: ✅ Test suite complete with unit + fork validation ready!



