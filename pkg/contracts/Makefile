# Lets creata commans to foundry
# forge script DeployCV.s.sol --account pk 

# read RPC_URL from .env file
include .env

# create RPC_URL_LOCALHOST variable
RPC_URL_LOCALHOST = http://127.0.0.1:8545
# print RPC_URL
print :
	@echo $(RPC_URL)

# Aggregate diamond ABIs (combines main contract + all facets into single ABI)
aggregate-abi:
	@echo "📦 Aggregating diamond ABIs..."
	@node scripts/aggregate-diamond-abi.js
	@echo "✅ ABI aggregation complete"

# Aggregate ABIs with verbose output
aggregate-abi-verbose:
	@echo "📦 Aggregating diamond ABIs (verbose mode)..."
	@node scripts/aggregate-diamond-abi.js --verbose
	@echo "✅ ABI aggregation complete"

# Verify diamond storage layouts (with build)
verify-storage:
	@echo "🔍 Verifying diamond storage layouts..."
	@./scripts/verify-storage-layout.sh || (echo "❌ Storage verification FAILED! Fix storage alignment before deploying." && exit 1)
	@echo "✅ Storage verification passed"

# Verify diamond storage layouts (skip build - faster, assumes already compiled)
verify-storage-quick:
	@echo "🔍 Verifying diamond storage layouts (quick mode)..."
	@./scripts/verify-storage-layout.sh --skip-build || (echo "❌ Storage verification FAILED! Fix storage alignment before deploying." && exit 1)
	@echo "✅ Storage verification passed"

# Verify diamond storage layouts with verbose output (shows detailed differences)
verify-storage-verbose:
	@echo "🔍 Verifying diamond storage layouts (verbose mode)..."
	@./scripts/verify-storage-layout.sh --verbose || (echo "❌ Storage verification FAILED! Fix storage alignment before deploying." && exit 1)
	@echo "✅ Storage verification passed"

### LOCLAHOST ###

fork:
	anvil --chain-id 1337
fork0:																									 
	anvil --host=0.0.0.0 --chain-id 1337
fork0b5:
	anvil --host=0.0.0.0 --chain-id 1337 -b 5

fund_arb:
	cast send \
	--from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
	--unlocked 0xefeab1ea32a5d7c6b1de6192ee531a2ef51198d9 \
	--value 100ether \
	--rpc-url=$(RPC_URL_LOCALHOST)
	
test1:
	forge test --fork-url $(RPC_URL_LOCALHOST) --mc CVStrategyTest \ 
	--sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 -vv

cast1:
	 cast send --account pk --rpc-url $(RPC_URL_LOCALHOST) \ 
	 "0xfEcFbe13c84595Ba47464CD4d8d3bb359372Fc6f" "nonce()" 

deploy: 
	-forge script script/DeployCV.s.sol:DeployCV \
	--rpc-url $(RPC_URL_LOCALHOST) \
	--sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \
	--unlocked \
	--via-ir \
	--broadcast -vvvvv

add-strategy-local: #make add-strategy S=0x1234 

	-forge script script/AddStrategy.s.sol:AddStrategy \
	--rpc-url $(RPC_URL_LOCALHOST) \
	--sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \
	--unlocked \
	--sig "run(address,address)" $(S) $(C) \
	--broadcast \
	-vvvv


### SEPOLIA ###

deploy-testnet-multi-sep: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_SEP_TESTNET) \
	--account pkGarden \
	--sig "run(string)" 'sepolia' \
	--ffi \
	--broadcast \
	--legacy \
	--via-ir \
	-vvv
	
verify-testnet-multi-sep: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_SEP_TESTNET) \
	--account pkGarden \
	--sig "run(string)" 'sepolia' \
	--ffi \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--legacy \
	--via-ir \
	--verify \
	-vvv

add-strategy-ethsep: #make add-strategy S=0x1234 
	-forge script script/AddStrategy.s.sol:AddStrategy \
	--rpc-url $(RPC_URL_SEP_TESTNET) \
	--account pkGarden \
	--sig "run(address,address)" $(S) $(C) \
	--broadcast \
	--legacy \
	-vvvv
	
add-strategy-ethsep-pool: #make add-strategy S=0x1234 
	-forge script script/AddStrategy.s.sol:AddStrategy \
	--rpc-url $(RPC_URL_SEP_TESTNET) \
	--account pkGarden \
	--sig "run(uint256,address)" $(P) $(C) \
	--broadcast \
	--legacy \
	-vvvv

### OPTIMISM SEPOLIA ###
deploy-token-opsep: 
	-forge script script/DeployERC20.s.sol:DeployERC20 \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--sig "run(string,string)" 'Honey' 'HNY' \
	--ffi \
	--broadcast \
	--chain-id 11155420 \
	--verify

fork-testnet-opsep:
	anvil --host=0.0.0.0 -f $(RPC_URL_OP_TESTNET)

deploy-verify-opsep: 
	-forge verify-contract \
  --rpc-url $(RPC_URL_OP_TESTNET) \
  0xd7b72fcb6a4e2857685175f609d1498ff5392e46 \
  /home/corantin/Documents/GitHub/gardens-v2/main/pkg/contracts/src/RegistryFactory.sol:RegistryFactory \
	--etherscan-api-key $(OPTIMISM_API_KEY)

deploy-opsep: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--chain-id 11155420 \
	--ffi \
	--broadcast \
	--via-ir \
	--verify \
	-vv

upgrade-opsep:
	-forge script script/UpgradeCVMultichainTest.s.sol:UpgradeCVMultichainTest \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--chain-id 11155420 \
	--ffi \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

upgrade-diamond-opsep: verify-storage
	-forge script script/UpgradeCVDiamond.s.sol:UpgradeCVDiamond \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--chain-id 11155420 \
	--ffi \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

upgrade-community-diamond-opsep: verify-storage
	-forge script script/UpgradeRegistryCommunityDiamond.s.sol:UpgradeRegistryCommunityDiamond \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--chain-id 11155420 \
	--ffi \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

verify-diamond-blockscout-opsep:
	-forge script script/UpgradeCVDiamond.s.sol:UpgradeCVDiamond \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://optimism.blockscout.com/api/ \
	--chain-id 11155420 \
	--ffi \
	--verify \
	--via-ir \
	--slow

verify-community-diamond-blockscout-opsep:
	-forge script script/UpgradeRegistryCommunityDiamond.s.sol:UpgradeRegistryCommunityDiamond \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://optimism.blockscout.com/api/ \
	--chain-id 11155420 \
	--ffi \
	--verify \
	--via-ir \
	--slow

upgrade-and-verify-diamond-opsep: upgrade-diamond-opsep verify-diamond-blockscout-opsep

upgrade-and-verify-community-diamond-opsep: upgrade-community-diamond-opsep verify-community-diamond-blockscout-opsep

verify-blockscout-opsep: 
	-forge script script/UpgradeCVMultichainTest.s.sol:UpgradeCVMultichainTest \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://optimism.blockscout.com/api/ \
	--verify \
	--via-ir \
	--slow
	

deploy-new-collateral-vault-template-opsep: 
	-forge script script/DeployCollateralVaultTemplate.s.sol:DeployCollateralVaultTemplate \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--ffi \
	--chain-id 11155420 \
	--legacy \
	--broadcast \
	--via-ir \
	--with-gas-price 1301660000 \
	--verify \
	-vvv

upgrade-and-verify-opsep: upgrade-opsep verify-blockscout-opsep

transfer-ownership-opsep:
	-forge script script/TransferOwnershipAllContracts.s.sol:TransferOwnershipAllContracts \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--account pkGarden \
	--sig "run(string)" 'opsepolia' \
	--chain-id 11155420 \
	--broadcast \
	--via-ir \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--verify \
	-vvvv

deploy-passport-scorer-opsep:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--chain-id 11155420 \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-safe-arbitrator-opsep:
	-forge script script/DeploySafeArbitrator.s.sol:DeploySafeArbitrator \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--chain-id 11155420 \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv
	
deploy-or-upgrade-good-dollar-sybil-opsep:
	-forge script script/DeployGoodDollarSybil.s.sol:DeployGoodDollarSybil \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--sig "run(string)" 'opsepolia' \
	--chain-id 11155420 \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

### ARBITRUM SEPOLIA ###

fork-testnet-arbsep:
	anvil --host=0.0.0.0 -f $(RPC_URL_ARB_TESTNET)

deploy-verify-arbsep: 
	-forge verify-contract \
  --rpc-url $(RPC_URL_ARB_TESTNET) \
  0xd7b72fcb6a4e2857685175f609d1498ff5392e46 \
  /home/corantin/Documents/GitHub/gardens-v2/main/pkg/contracts/src/RegistryFactory.sol:RegistryFactory \
	--etherscan-api-key $(ETHERSCAN_API_KEY)

deploy-arbsep: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--chain-id 421614 \
	--ffi \
	--broadcast \
	--via-ir \
	--verify \
	-vv

upgrade-arbsep: 
	-forge script script/UpgradeCVMultichainTest.s.sol:UpgradeCVMultichainTest \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--chain-id 421614 \
	--ffi \
	--broadcast \
	--via-ir \
	--verify \
	-vvv 

verify-blockscout-arbsep: 
	-forge script script/UpgradeCVMultichainTest.s.sol:UpgradeCVMultichainTest \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://arbitrum.blockscout.com/api/ \
	--verify \
	--via-ir \
	--slow
	
deploy-verify: 
	-forge script script/DeployCVArbSepolia.s.sol:DeployCVArbSepolia \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	-vv

deploy-pool-testnet: 
	-forge script script/DeployCVArbSepoliaPool.s.sol:DeployCVArbSepoliaPool \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast -vv

	
deploy-commfee-testnet: 
	-forge script script/DeployCVArbSepoliaCommFee.s.sol:DeployCVArbSepoliaCommFee \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast -vv
	
deploy-testnet: 
	-forge script script/DeployCVArbSepolia.s.sol:DeployCVArbSepolia \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast \
	-vv

	
create_safe_arbsep:
	-forge script script/CreateSafe.s.sol \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--sig "run()" \
	--broadcast \
	--verify \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--chain-id 421614 \
	-vvvv

	
deploy-testnet-dry: 
	-forge script script/DeployCVArbSepolia.s.sol:DeployCVArbSepolia \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	-vvvv

add-owner: #make add-owner owner=0x1234 safe=0x1234
	-forge script script/AddOwner.s.sol:AddOwner \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--sig "run(address,address)" $(owner) $(safe) \
	--broadcast \
	-vvvv

add-strategy: #make add-strategy S=0x1234 
	-forge script script/AddStrategy.s.sol:AddStrategy \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--sig "run(address,address)" $(S) $(C) \
	--broadcast \
	-vvvv

deploy-test-arb: 
	-forge script script/VerifyTest.s.sol:VerifyTest \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--account pkGarden \
	--ffi \
	--chain-id 421614 \
	--broadcast \
	--legacy \
	--force \
	--verify \
	-vvv

deploy-new-collateral-vault-template-arbitrum-sepolia: 
	-forge script script/DeployCollateralVaultTemplate.s.sol:DeployCollateralVaultTemplate \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--ffi \
	--chain-id 421614 \
	--legacy \
	--broadcast \
	--via-ir \
	--with-gas-price 1301660000 \
	--verify \
	-vvv

upgrade-and-verify-arbsep: upgrade-arbsep verify-blockscout-arbsep

transfer-ownership-arbsep:
	-forge script script/TransferOwnershipAllContracts.s.sol:TransferOwnershipAllContracts \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--sig "run(string)" 'arbsepolia' \
	--chain-id 421614 \
	--broadcast \
	--via-ir \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--verify \
	-vvvv

deploy-passport-scorer-arbsep:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--chain-id 421614 \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-if-exists-safe-arbitrator-arbsep:
	-forge script script/DeploySafeArbitrator.s.sol:DeploySafeArbitrator \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--chain-id 421614 \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-good-dollar-sybil-arbsep:
	-forge script script/DeployGoodDollarSybil.s.sol:DeployGoodDollarSybil \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--chain-id 421614 \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

########################  PROD ##################################



### ARBITRUM ###

transfer-ownership-arbitrum:
	-forge script script/TransferOwnershipAllContracts.s.sol:TransferOwnershipAllContracts \
	--rpc-url $(RPC_URL_ARB) \
	--account pkGarden \
	--sig "run(string)" 'arbitrum' \
	--chain-id 42161 \
	--broadcast \
	--via-ir \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--verify \
	-vvv

deploy-new-collateral-vault-template-arbitrum: 
	-forge script script/DeployCollateralVaultTemplate.s.sol:DeployCollateralVaultTemplate \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--ffi \
	--chain-id 42161 \
	--legacy \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-arbitrum: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--account pkGarden \
	--ffi \
	--chain-id 42161 \
	--broadcast \
	--legacy \
	--via-ir \
	-vvv

upgrade-arbitrum: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--ffi \
	--chain-id 42161 \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

verify-blockscout-arbitrum: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://arbitrum.blockscout.com/api/ \
	--ffi \
	--chain-id 42161 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

upgrade-and-verify-arbitrum: upgrade-arbitrum verify-blockscout-arbitrum

change-passport-manager-arbitrum: 
	-forge script script/PassportScorerWriter.s.sol:PassportScorerWriter \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--chain-id 42161 \
	--account pkGarden \
	--ffi \
	--broadcast \
	--legacy \
	-vvv

deploy-passport-scorer-arbitrum:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--chain-id 42161 \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-if-exists-safe-arbitrator-arbitrum:
	-forge script script/DeploySafeArbitrator.s.sol:DeploySafeArbitrator \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--chain-id 42161 \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-good-dollar-sybil-arbitrum:
	-forge script script/DeployGoodDollarSybil.s.sol:DeployGoodDollarSybil \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--chain-id 42161 \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

### OPTIMISM ###

transfer-ownership-optimism:
	-forge script script/TransferOwnershipAllContracts.s.sol:TransferOwnershipAllContracts \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--chain-id 10 \
	--account pkGarden \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-new-collateral-vault-template-optimism: 
	-forge script script/DeployCollateralVaultTemplate.s.sol:DeployCollateralVaultTemplate \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--chain-id 10 \
	--account pkGarden \
	--ffi \
	--legacy \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-optimism: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--ffi \
	--chain-id 10 \
	--broadcast \
	--legacy \
	--via-ir \
	--verify \
	-vvv

upgrade-optimism: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--ffi \
	--chain-id 10 \
	--broadcast \
	--legacy \
	--via-ir \
	--verify \
	-vvv

verify-blockscout-optimism: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://optimism.blockscout.com/api/ \
	--ffi \
	--chain-id 10 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

upgrade-and-verify-optimism: upgrade-optimism verify-blockscout-optimism

change-passport-manager-optimism: 
	-forge script script/PassportScorerWriter.s.sol:PassportScorerWriter \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--chain-id 10 \
	--account pkGarden \
	--ffi \
	--broadcast \
	--legacy \
	-vvv

deploy-passport-scorer-optimism:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--chain-id 10 \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-if-exists-safe-arbitrator-optimism:
	-forge script script/DeploySafeArbitrator.s.sol:DeploySafeArbitrator \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--chain-id 10 \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-good-dollar-sybil-optimism:
	-forge script script/DeployGoodDollarSybil.s.sol:DeployGoodDollarSybil \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--chain-id 10 \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

### POLYGON ###

transfer-ownership-polygon:
	-forge script script/TransferOwnershipAllContracts.s.sol:TransferOwnershipAllContracts \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--etherscan-api-key $(POLYGONSCAN_API_KEY) \
	--chain-id 137 \
	--account pkGarden \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-new-collateral-vault-template-polygon: 
	-forge script script/DeployCollateralVaultTemplate.s.sol:DeployCollateralVaultTemplate \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--etherscan-api-key $(POLYGONSCAN_API_KEY) \
	--chain-id 137 \
	--account pkGarden \
	--ffi \
	--legacy \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-polygon: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--account pkGarden \
	--ffi \
	--chain-id 137 \
	--broadcast \
	--legacy \
	--via-ir \
	-vvv

upgrade-polygon: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--account pkGarden \
	--etherscan-api-key $(POLYGONSCAN_API_KEY) \
	--ffi \
	--chain-id 137 \
	--broadcast \
	--legacy \
	--via-ir \
	--verify \
	-vvv

verify-blockscout-polygon: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://polygon.blockscout.com/api/ \
	--ffi \
	--chain-id 137 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

upgrade-and-verify-polygon: upgrade-polygon verify-blockscout-polygon

change-passport-manager-polygon: 
	-forge script script/PassportScorerWriter.s.sol:PassportScorerWriter \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--chain-id 137 \
	--account pkGarden \
	--ffi \
	--broadcast \
	--legacy \
	-vvv

deploy-passport-scorer-polygon:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--chain-id 137 \
	--etherscan-api-key $(POLYGONSCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-if-exists-safe-arbitrator-polygon:
	-forge script script/DeploySafeArbitrator.s.sol:DeploySafeArbitrator \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--chain-id 137 \
	--etherscan-api-key $(POLYGONSCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-good-dollar-sybil-polygon:
	-forge script script/DeployGoodDollarSybil.s.sol:DeployGoodDollarSybil \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--chain-id 137 \
	--etherscan-api-key $(POLYGONSCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

### GNOSIS ###

transfer-ownership-gnosis:
	-forge script script/TransferOwnershipAllContracts.s.sol:TransferOwnershipAllContracts \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--etherscan-api-key $(GNOSISSCAN_API_KEY) \
	--chain-id 100 \
	--account pkGarden \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-new-collateral-vault-template-gnosis: 
	-forge script script/DeployCollateralVaultTemplate.s.sol:DeployCollateralVaultTemplate \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--etherscan-api-key $(GNOSISSCAN_API_KEY) \
	--chain-id 100 \
	--account pkGarden \
	--ffi \
	--legacy \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-gnosis: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--account pkGarden \
	--etherscan-api-key $(GNOSISSCAN_API_KEY) \
	--ffi \
	--chain-id 100 \
	--broadcast \
	--legacy \
	--verify \
	--via-ir \
	-vvv

upgrade-gnosis: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--account pkGarden \
	--etherscan-api-key $(GNOSISSCAN_API_KEY) \
	--ffi \
	--chain-id 100 \
	--broadcast \
	--legacy \
	--verify \
	--via-ir \
	-vvv

verify-blockscout-gnosis: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--chain-id 100 \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://gnosis.blockscout.com/api/ \
	--ffi \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

deploy-passport-scorer-gnosis:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--chain-id 100 \
	--etherscan-api-key $(GNOSISSCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-if-exists-safe-arbitrator-gnosis:
	-forge script script/DeploySafeArbitrator.s.sol:DeploySafeArbitrator \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--chain-id 100 \
	--etherscan-api-key $(GNOSISSCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

# verify-tenderly-gnosis: 
# 	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
# 	--rpc-url $(RPC_URL_GNOSIS) \
# 	--sig "run(string)" 'gnosis' \
# 	--account pkGarden \
# 	--verifier-url $(TENDERLY_VERIFIER_URL)/100/public \
# 	--etherscan-api-key $(TENDERLY_ACCESS_TOKEN) \
# 	--ffi \
# 	--chain-id 100 \
# 	--legacy \
# 	--verify \
# 	--via-ir \
# 	-vvv \
# 	--slow

verify-tenderly-gnosis: 
	-forge verify-contract \
  0x853c80cce43c2f37d60c3679abc9966a346787f4 \
  CVStrategy \
  --etherscan-api-key ZVbLp2Jg48fSiv9gNsqjjg2iEAmYwHO1 \
  --verifier-url https://api.tenderly.co/api/v1/account/Gossman/project/project/etherscan/verify/network/100/public \
  --watch \
 	--via-ir 

upgrade-and-verify-gnosis: upgrade-gnosis verify-blockscout-gnosis

change-passport-manager-gnosis: 
	-forge script script/PassportScorerWriter.s.sol:PassportScorerWriter \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--account pkGarden \
	--ffi \
	--chain-id 100 \
	--broadcast \
	--legacy \
	-vvv

deploy-or-upgrade-good-dollar-sybil-gnosis:
	-forge script script/DeployGoodDollarSybil.s.sol:DeployGoodDollarSybil \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--chain-id 100 \
	--etherscan-api-key $(GNOSISSCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

### BASE ###

transfer-ownership-base:
	-forge script script/TransferOwnershipAllContracts.s.sol:TransferOwnershipAllContracts \
	--rpc-url $(RPC_URL_BASE) \
	--account pkGarden \
	--sig "run(string)" 'base' \
	--chain-id 8453 \
	--broadcast \
	--via-ir \
	--etherscan-api-key $(BASESCAN_API_KEY) \
	--verify \
	-vvv

deploy-new-collateral-vault-template-base: 
	-forge script script/DeployCollateralVaultTemplate.s.sol:DeployCollateralVaultTemplate \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--account pkGarden \
	--etherscan-api-key $(BASESCAN_API_KEY) \
	--ffi \
	--chain-id 8453 \
	--legacy \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-base: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--chain-id 8453 \
	--account pkGarden \
	--etherscan-api-key $(BASESCAN_API_KEY) \
	--ffi \
	--broadcast \
	--legacy \
	--via-ir \
	--verify \
	-vvv

upgrade-base: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--account pkGarden \
	--etherscan-api-key $(BASESCAN_API_KEY) \
	--ffi \
	--chain-id 8453 \
	--broadcast \
	--legacy \
	--verify \
	--via-ir \
	-vvv


verify-blockscout-base: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--chain-id 8453 \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://base.blockscout.com/api/ \
	--ffi \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

verify-deploy-blockscout-base: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://base.blockscout.com/api/ \
	--ffi \
	--chain-id 8453 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

deploy-and-verify-base: deploy-base verify-deploy-blockscout-base
upgrade-and-verify-base: upgrade-base verify-blockscout-base

change-passport-manager-base: 
	-forge script script/PassportScorerWriter.s.sol:PassportScorerWriter \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--chain-id 8453 \
	--account pkGarden \
	--ffi \
	--broadcast \
	--legacy \
	-vvv

deploy-passport-scorer-base:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--chain-id 8453 \
	--etherscan-api-key $(BASESCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-if-exists-safe-arbitrator-base:
	-forge script script/DeploySafeArbitrator.s.sol:DeploySafeArbitrator \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--chain-id 8453 \
	--etherscan-api-key $(BASESCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-proxy-owner-base:
	-forge script script/DeployProxyOwner.s.sol:DeployProxyOwner \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--chain-id 8453 \
	--etherscan-api-key $(BASESCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

deploy-or-upgrade-good-dollar-sybil-base:
	-forge script script/DeployGoodDollarSybil.s.sol:DeployGoodDollarSybil \
	--rpc-url $(RPC_URL_BASE) \
	--sig "run(string)" 'base' \
	--chain-id 8453 \
	--etherscan-api-key $(BASESCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

### CELO ###

transfer-ownership-celo:
	-forge script script/TransferOwnershipAllContracts.s.sol:TransferOwnershipAllContracts \
	--rpc-url $(RPC_URL_CELO) \
	--account pkGarden \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--broadcast \
	--via-ir \
	--etherscan-api-key $(CELOSCAN_API_KEY) \
	--verify \
	-vvv

deploy-new-collateral-vault-template-celo: 
	-forge script script/DeployCollateralVaultTemplate.s.sol:DeployCollateralVaultTemplate \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--account pkGarden \
	--etherscan-api-key $(CELOSCAN_API_KEY) \
	--ffi \
	--chain-id 42220 \
	--legacy \
	--broadcast \
	--via-ir \
	--verify \
	-vvv

deploy-celo: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--account pkGarden \
	--etherscan-api-key $(CELOSCAN_API_KEY) \
	--ffi \
	--broadcast \
	--legacy \
	--via-ir \
	--verify \
	-vvv

upgrade-celo: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--account pkGarden \
	--etherscan-api-key $(CELOSCAN_API_KEY) \
	--ffi \
	--chain-id 42220 \
	--broadcast \
	--legacy \
	--verify \
	--via-ir \
	-vvv


verify-blockscout-celo: 
	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://celo.blockscout.com/api/ \
	--ffi \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

verify-deploy-blockscout-celo: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'base' \
	--account pkGarden \
	--verifier blockscout \
	--verifier-url https://celo.blockscout.com/api/ \
	--ffi \
	--chain-id 42220 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

deploy-and-verify-celo: deploy-celo verify-deploy-blockscout-celo
upgrade-and-verify-celo: upgrade-celo verify-blockscout-celo

change-passport-manager-celo: 
	-forge script script/PassportScorerWriter.s.sol:PassportScorerWriter \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--account pkGarden \
	--ffi \
	--broadcast \
	--legacy \
	-vvv

deploy-passport-scorer-celo:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--etherscan-api-key $(CELOSCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

verify-blockscout-passport-scorer-celo:
	-forge script script/DeployPassportScorer.s.sol:DeployPassportScorer \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--verifier blockscout \
	--verifier-url https://celo.blockscout.com/api/ \
	--account pkGarden \
	--via-ir \
	--verify \
	-vv

deploy-or-upgrade-if-exists-safe-arbitrator-celo:
	-forge script script/DeploySafeArbitrator.s.sol:DeploySafeArbitrator \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--verifier blockscout \
	--verifier-url https://celo.blockscout.com/api/ \
	--account pkGarden \
	--via-ir \
	--verify \
	-vv \ 
	

verify-blockscout-proxy-owner-celo:
	-forge script script/DeployProxyOwner.s.sol:DeployProxyOwner \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--verifier blockscout \
	--verifier-url https://celo.blockscout.com/api/ \
	--account pkGarden \
	--via-ir \
	--verify \
	-vv

deploy-or-upgrade-good-dollar-sybil-celo:
	-forge script script/DeployGoodDollarSybil.s.sol:DeployGoodDollarSybil \
	--rpc-url $(RPC_URL_CELO) \
	--sig "run(string)" 'celo' \
	--chain-id 42220 \
	--etherscan-api-key $(CELOSCAN_API_KEY) \
	--account pkGarden \
	--via-ir \
	--verify \
	--broadcast \
	-vv

# Mainnet

# deploy-mainnet: 
# 	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
# 	--rpc-url $(RPC_URL_MAINNET) \
# 	--sig "run(string)" 'mainnet' \
# 	--account pkGarden \
# 	--ffi \
# 	--chain-id 1 \
# 	--broadcast \
# 	--legacy \
# 	--via-ir \
# 	-vvv

# verify-mainnet: 
# 	-forge script script/UpgradeCVMultichainProd.s.sol:UpgradeCVMultichainProd \
# 	--rpc-url $(RPC_URL_MAINNET) \
# 	--sig "run(string)" 'mainnet' \
# 	--account pkGarden \
# 	--etherscan-api-key $(ETHERSCAN_API_KEY) \
# 	--ffi \
# 	--chain-id 1 \
# 	--legacy \
# 	--verify \
# 	--via-ir \
# 	-vvv \
# 	--slow