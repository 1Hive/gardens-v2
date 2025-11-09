# Gardens Octant Integration: Deployment Guide

## Overview

This guide covers deploying all three phases of the Gardens + Octant integration to Arbitrum Sepolia testnet.

**Prerequisites**:
- Foundry installed
- Arbitrum Sepolia RPC endpoint
- Testnet ETH for gas
- Deployer wallet with private key

---

## Phase 1: Deploy YDS Strategy

### Environment Setup

```bash
# Copy example env
cp pkg/contracts/example.env pkg/contracts/.env

# Configure
export PRIVATE_KEY=0x...
export ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
export ASSET_ADDRESS=0x...          # Test DAI on Arb Sepolia
export YIELD_VAULT_ADDRESS=0x0      # Use 0x0 for no external vault (idle mode)
export DONATION_RECIPIENT=0x...     # Set after GDA deployment
export COUNCIL_SAFE=0x...
export KEEPER_ADDRESS=0x...
```

### Deploy YDS

```bash
cd pkg/contracts

# Deploy GardensYDSStrategy
forge script script/DeployGardensYDS.s.sol \
    --rpc-url $ARB_SEPOLIA_RPC \
    --broadcast \
    --verify \
    --etherscan-api-key $ARBISCAN_API_KEY

# Note the deployed address
export YDS_STRATEGY=<deployed_address>
```

### Verify Deployment

```bash
# Check deployment
cast call $YDS_STRATEGY "totalAssets()" --rpc-url $ARB_SEPOLIA_RPC
cast call $YDS_STRATEGY "management()" --rpc-url $ARB_SEPOLIA_RPC
cast call $YDS_STRATEGY "donationRecipient()" --rpc-url $ARB_SEPOLIA_RPC
```

---

## Phase 2: Deploy Streaming Facets

### 2.1 Deploy Facets

```bash
# Deploy new streaming facets
forge script script/DeployStreamingFacets.s.sol \
    --rpc-url $ARB_SEPOLIA_RPC \
    --broadcast \
    --verify

# Script deploys:
# - CVSuperfluidCoreFacet
# - CVStreamingYieldFacet
# - CVStreamingFundingFacet

# Note addresses for diamond cut
export SF_CORE_FACET=<address>
export SF_YIELD_FACET=<address>
export SF_FUNDING_FACET=<address>
```

### 2.2 Add Facets to CVStrategy Diamond

```bash
# Perform diamond cut (adds new facets)
forge script script/AddStreamingFacets.s.sol \
    --rpc-url $ARB_SEPOLIA_RPC \
    --broadcast

# This script:
# 1. Creates FacetCut array
# 2. Calls cvStrategy.diamondCut()
# 3. Adds streaming functionality
```

### 2.3 Deploy & Configure Superfluid GDA

```bash
# Option A: Use existing Superfluid GDA on testnet
export SUPER_TOKEN=0x...  # fDAIx on Arb Sepolia
export GDA_ADDRESS=<existing_gda>

# Option B: Deploy new GDA (if needed)
# Use Superfluid dashboard: app.superfluid.finance
# Or deploy via script:
forge script script/DeploySuperfluidGDA.s.sol --broadcast

export GDA_ADDRESS=<deployed_gda>
```

### 2.4 Connect YDS → GDA → CVStrategy

```bash
# Configure complete flow
forge script script/ConfigureYDSForStreaming.s.sol \
    --rpc-url $ARB_SEPOLIA_RPC \
    --broadcast

# This script:
# 1. Sets GDA as YDS donation recipient
# 2. Initializes GDA in CVStrategy
# 3. Enables streaming
```

### 2.5 Register YDS in CVStrategy

```bash
# Council safe calls setYDSStrategy
cast send $CV_STRATEGY \
    "setYDSStrategy(address)" \
    $YDS_STRATEGY \
    --rpc-url $ARB_SEPOLIA_RPC \
    --private-key $COUNCIL_SAFE_KEY
```

---

## Phase 3: Deploy TAM Factory

### 3.1 Deploy Shared Implementation

```bash
# Deploy ConvictionVotingTAM (shared implementation)
forge create src/tam/ConvictionVotingTAM.sol:ConvictionVotingTAM \
    --rpc-url $ARB_SEPOLIA_RPC \
    --private-key $PRIVATE_KEY \
    --verify

export TAM_IMPLEMENTATION=<deployed_address>
```

### 3.2 Deploy Factory

```bash
# Deploy ConvictionVotingTAMFactory
forge create src/tam/ConvictionVotingTAMFactory.sol:ConvictionVotingTAMFactory \
    --rpc-url $ARB_SEPOLIA_RPC \
    --private-key $PRIVATE_KEY \
    --verify

export TAM_FACTORY=<deployed_address>
```

### 3.3 Create Test TAM Instance

```bash
# Create a TAM via factory
cast send $TAM_FACTORY \
    "createTAM(address,address,uint256,uint256,uint256,uint256,uint8,(uint256),address,bytes32)" \
    $ASSET_ADDRESS \
    $REGISTRY_COMMUNITY \
    9965853 \    # decay
    500000 \     # weight
    2000000 \    # maxRatio
    100000 \     # minThreshold
    2 \          # PointSystem.Unlimited
    "(0)" \      # pointConfig
    $SUPER_TOKEN \
    "0x..." \    # metadata hash
    --rpc-url $ARB_SEPOLIA_RPC \
    --private-key $PRIVATE_KEY

# Get created TAM address from logs
export TAM_INSTANCE=<tam_address>
```

---

## Deploy Chainlink Automation Keeper

### Deploy Keeper Contract

```bash
export CV_STRATEGY=0x...
export YDS_STRATEGY=0x...

# NEW: Calculate optimal intervals based on conviction parameters
# For 7-day half-life (decay = 9965853):
# - reportInterval: 86400 (24 hours)
# - baseRebalanceInterval: 43200 (12 hours - aligned with conviction)
# - minRebalanceInterval: 3600 (1 hour - rate limit)

forge script script/DeployStreamingKeeper.s.sol \
    --rpc-url $ARB_SEPOLIA_RPC \
    --broadcast \
    --verify

export KEEPER_ADDRESS=<deployed_address>
```

### Register with Chainlink

1. Go to https://automation.chain.link
2. Connect wallet
3. Click "Register New Upkeep"
4. Select "Custom logic"
5. Enter keeper address: `$KEEPER_ADDRESS`
6. Set upkeep name: "Gardens CV Streaming Keeper"
7. Set gas limit: 1,000,000
8. Fund with LINK (testnet LINK from faucet)
9. Confirm registration

### Verify Keeper Working

```bash
# Check keeper status
cast call $KEEPER_ADDRESS "getKeeperStatus()" --rpc-url $ARB_SEPOLIA_RPC

# Check last execution
cast call $KEEPER_ADDRESS "lastReport()" --rpc-url $ARB_SEPOLIA_RPC
cast call $KEEPER_ADDRESS "lastRebalance()" --rpc-url $ARB_SEPOLIA_RPC

# Check if upkeep needed
cast call $KEEPER_ADDRESS "checkUpkeep(bytes)" "0x" --rpc-url $ARB_SEPOLIA_RPC
```

---

## Complete Deployment Script

```bash
#!/bin/bash
# deploy-all.sh - Complete deployment automation

set -e

echo "=== Phase 1: YDS Strategy ==="
forge script script/DeployGardensYDS.s.sol --broadcast --verify
# Extract YDS_STRATEGY from logs

echo "=== Phase 2: Streaming Facets ==="
forge script script/DeployStreamingFacets.s.sol --broadcast --verify
# Extract facet addresses

echo "=== Phase 2: Diamond Upgrade ==="
forge script script/AddStreamingFacets.s.sol --broadcast
# Adds facets to existing CVStrategy

echo "=== Phase 2: Configure Streaming ==="
forge script script/ConfigureYDSForStreaming.s.sol --broadcast
# Connects YDS → GDA → CVStrategy

echo "=== Phase 2: Deploy Keeper ==="
forge script script/DeployStreamingKeeper.s.sol --broadcast --verify

echo "=== Phase 3: Deploy TAM ==="
forge create src/tam/ConvictionVotingTAMFactory.sol:ConvictionVotingTAMFactory \
    --broadcast --verify

echo "=== DEPLOYMENT COMPLETE ==="
echo "Next steps:"
echo "1. Register keeper with Chainlink Automation"
echo "2. Create test proposals and allocate support"
echo "3. Deposit into YDS strategy"
echo "4. Wait for keeper to report and rebalance"
echo "5. Verify streams active"
```

---

## Post-Deployment Testing

### Test YDS Deposits

```bash
# Get test DAI from faucet
# Deposit into YDS
cast send $YDS_STRATEGY \
    "deposit(uint256,address)" \
    "1000000000000000000000" \  # 1000 DAI
    $YOUR_ADDRESS \
    --rpc-url $ARB_SEPOLIA_RPC \
    --private-key $PRIVATE_KEY
```

### Test YDS Report

```bash
# Simulate yield (admin only in test)
cast send $ASSET_ADDRESS "mint(address,uint256)" $YDS_STRATEGY "100000000000000000000" ...

# Call report
cast send $YDS_STRATEGY "report()" --rpc-url $ARB_SEPOLIA_RPC --private-key $KEEPER_KEY

# Check donation shares
cast call $YDS_STRATEGY "balanceOf(address)" $GDA_ADDRESS --rpc-url $ARB_SEPOLIA_RPC
```

### Test Stream Rebalancing

```bash
# Create proposal (via CVStrategy)
cast send $CV_STRATEGY "registerRecipient(bytes,address)" <encoded_data> $YOUR_ADDRESS ...

# Allocate support
cast send $CV_STRATEGY "allocate(bytes,address)" <encoded_support> $MEMBER_ADDRESS ...

# Trigger rebalance
cast send $CV_STRATEGY "rebalanceYieldStreams()" --rpc-url $ARB_SEPOLIA_RPC

# Check stream started
cast call $CV_STRATEGY "getStreamState(uint256)" 1 --rpc-url $ARB_SEPOLIA_RPC
```

---

## Monitoring Deployed System

### Essential Checks

```bash
# YDS health
cast call $YDS_STRATEGY "totalAssets()" --rpc-url $ARB_SEPOLIA_RPC
cast call $YDS_STRATEGY "balanceOf(address)" $GDA_ADDRESS --rpc-url $ARB_SEPOLIA_RPC

# Streaming status
cast call $CV_STRATEGY "streamingEnabled()" --rpc-url $ARB_SEPOLIA_RPC
cast call $CV_STRATEGY "getActiveStreamCount()" --rpc-url $ARB_SEPOLIA_RPC

# Keeper status
cast call $KEEPER_ADDRESS "getKeeperStatus()" --rpc-url $ARB_SEPOLIA_RPC
```

### Event Monitoring

```bash
# Watch YDS reports
cast logs --address $YDS_STRATEGY --from-block latest --rpc-url $ARB_SEPOLIA_RPC

# Watch stream events
cast logs --address $CV_STRATEGY --from-block latest --rpc-url $ARB_SEPOLIA_RPC

# Watch keeper events
cast logs --address $KEEPER_ADDRESS --from-block latest --rpc-url $ARB_SEPOLIA_RPC
```

---

## Troubleshooting Deployments

### Issue: Verification fails

```bash
# Manually verify
forge verify-contract \
    $CONTRACT_ADDRESS \
    src/path/Contract.sol:ContractName \
    --chain-id 421614 \
    --etherscan-api-key $ARBISCAN_API_KEY \
    --constructor-args $(cast abi-encode "constructor(address)" $ARG)
```

### Issue: Diamond cut fails

```bash
# Check facet compatibility
forge inspect src/CVStrategy/facets/NewFacet.sol:NewFacet storageLayout

# Verify selectors don't conflict
forge inspect CVStrategy methods
```

### Issue: Superfluid connection fails

```bash
# Verify super token
cast call $SUPER_TOKEN "getHost()" --rpc-url $ARB_SEPOLIA_RPC

# Verify GDA exists
cast code $GDA_ADDRESS --rpc-url $ARB_SEPOLIA_RPC

# Check approval
cast call $SUPER_TOKEN "allowance(address,address)" $CV_STRATEGY $GDA_ADDRESS ...
```

---

## Rollback Procedures

### Revert Diamond Upgrade

```bash
# Remove facets if issues found
forge script script/RemoveStreamingFacets.s.sol --broadcast

# Diamond will revert to previous state
```

### Pause System

```bash
# Disable streaming
cast send $CV_STRATEGY "setStreamingEnabled(bool)" false ...

# Pause keeper
cast send $KEEPER_ADDRESS "setKeeperActive(bool)" false ...

# Emergency shutdown YDS
cast send $YDS_STRATEGY "setEmergencyShutdown(bool)" true ...
```

---

## Production Deployment Checklist

Before mainnet:

- [ ] All tests passing locally
- [ ] Testnet deployment successful
- [ ] Testnet validation complete (7+ days)
- [ ] Security audit completed
- [ ] Storage layout verified
- [ ] Gas optimization review
- [ ] Multi-sig setup for council operations
- [ ] Keeper funded with sufficient LINK
- [ ] Monitoring/alerting configured
- [ ] Documentation complete
- [ ] Community informed

---

## Network-Specific Addresses

### Arbitrum Sepolia

```bash
# Core Contracts (to be filled after deployment)
YDS_STRATEGY=0x...
CV_STRATEGY=0x...
KEEPER=0x...
GDA=0x...
TAM_FACTORY=0x...

# External Dependencies
SUPER_TOKEN_DAI=0x...     # fDAIx
CHAINLINK_REGISTRY=0x...  # Automation registry
LINK_TOKEN=0x...          # For funding upkeeps
```

### Arbitrum One (Future)

```bash
# Production addresses (TBD)
YDS_STRATEGY_MAINNET=0x...
# ...
```

---

## Cost Estimates

### Deployment Costs (Arbitrum Sepolia @ 0.1 gwei)

| Contract | Gas | Cost (ETH) | Cost (USD @ $3000) |
|----------|-----|------------|-------------------|
| GardensYDSStrategy | ~2.5M | 0.00025 | $0.75 |
| CVSuperfluidCoreFacet | ~800K | 0.00008 | $0.24 |
| CVStreamingYieldFacet | ~1.2M | 0.00012 | $0.36 |
| CVStreamingFundingFacet | ~900K | 0.00009 | $0.27 |
| CVStreamingKeeper | ~600K | 0.00006 | $0.18 |
| ConvictionVotingTAM | ~2M | 0.0002 | $0.60 |
| TAM Factory | ~500K | 0.00005 | $0.15 |
| Diamond Cut | ~300K | 0.00003 | $0.09 |
| **Total** | **~8.8M** | **~0.00088** | **~$2.64** |

### Operational Costs (Arbitrum One @ 0.1 gwei)

| Operation | Gas | Frequency | Daily Cost | Monthly Cost |
|-----------|-----|-----------|------------|--------------|
| YDS Report | 150K | 24h | $0.00045 | $0.014 |
| Rebalance (10 props) | 400K | 1h | $0.0029 | $0.087 |
| **Total** | | | **$0.0033** | **$0.10** |

**Annual Cost**: ~$1.20 USD (incredibly affordable!)

---

## Upgrade Path for Existing Pools

### For Current Gardens Deployments

```solidity
// 1. Deploy new facets (doesn't affect existing pools)
forge script script/DeployStreamingFacets.s.sol --broadcast

// 2. For each pool wanting streaming:
CVStrategy existingPool = CVStrategy(existingPoolAddress);

// 3. Council performs diamond cut
IDiamondCut.FacetCut[] memory cuts = getStreamingFacetCuts();
existingPool.diamondCut(cuts, address(0), "");

// 4. Configure YDS and GDA
existingPool.setYDSStrategy(ydsAddress);
existingPool.initializeGDA(gdaAddress);
existingPool.setStreamingEnabled(true);

// 5. Done - streaming now available
```

**Non-Breaking**: Existing batch harvest (`harvestYDS`) still works!

---

## Validation Checklist

After deployment, verify:

### YDS Validation
- [ ] Can deposit into YDS
- [ ] Can withdraw from YDS
- [ ] report() generates donation shares
- [ ] Donation shares go to correct recipient
- [ ] User PPS stays flat after report with profit
- [ ] Losses burn donation shares first

### Streaming Validation
- [ ] CVStrategy has streaming facets
- [ ] Can initialize GDA
- [ ] Can enable streaming
- [ ] rebalanceYieldStreams() executes
- [ ] Streams start for supported proposals
- [ ] Streams update when support changes
- [ ] Streams stop for inactive proposals

### Keeper Validation
- [ ] Keeper deployed
- [ ] Registered with Chainlink
- [ ] checkUpkeep() returns true when needed
- [ ] performUpkeep() executes successfully
- [ ] Reports happen on schedule
- [ ] Rebalances happen on schedule

### TAM Validation (Optional)
- [ ] Factory deployed
- [ ] Can create TAM instances
- [ ] TAMs share implementation
- [ ] Lifecycle phases work
- [ ] onlySelf hooks protected
- [ ] Conviction threshold works

---

## Next Steps After Deployment

1. **Create Test Proposals**
   - Use Gardens UI or registerRecipient()
   - Various requested amounts

2. **Allocate Member Support**
   - Members activate and allocate voting power
   - Let conviction accumulate (wait days)

3. **Fund YDS Strategy**
   - Community or test users deposit
   - Generates yield for distribution

4. **Monitor Keeper**
   - Watch Chainlink dashboard
   - Verify upkeeps executing

5. **Observe Streaming**
   - Check beneficiary balances growing
   - Verify proportional distribution
   - Test support reallocation

6. **Gather Metrics**
   - Gas costs
   - User experience
   - System stability

7. **Iterate**
   - Adjust keeper intervals if needed
   - Fine-tune conviction parameters
   - Optimize gas usage

---

## Support

**Deployment Issues**: Create issue on GitHub  
**Configuration Help**: Discord gardens.fund/discord  
**Emergency**: Contact core team immediately

---

## Appendix: Example .env

```bash
# Arbitrum Sepolia
ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
ARBISCAN_API_KEY=YOUR_KEY

# Deployer
PRIVATE_KEY=0x...

# Contract Addresses (fill after deployment)
YDS_STRATEGY=0x...
CV_STRATEGY=0x...
SUPER_TOKEN=0x...
GDA_ADDRESS=0x...
KEEPER_ADDRESS=0x...
TAM_FACTORY=0x...

# Configuration
COUNCIL_SAFE=0x...
ASSET_ADDRESS=0x...  # Test DAI
REPORT_INTERVAL=86400
REBALANCE_INTERVAL=3600
```





