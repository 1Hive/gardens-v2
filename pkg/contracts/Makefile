# Lets creata commans to foundry
# forge script DeployCV.s.sol --account pk 

# read RPC_URL from .env file
include .env

# create RPC_URL_LOCALHOST variable
RPC_URL_LOCALHOST = http://127.0.0.1:8545
# print RPC_URL
print : 
	@echo $(RPC_URL)

# Localhost

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


# Sepolia

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

# Arbitrum Sepolia

fork-testnet:
	anvil --host=0.0.0.0 -f $(RPC_URL_ARB_TESTNET)

deploy-verify-arbsep: 
	-forge verify-contract \
  --rpc-url $(RPC_URL_ARB_TESTNET) \
  0xd7b72fcb6a4e2857685175f609d1498ff5392e46 \
  /home/corantin/Documents/GitHub/gardens-v2/main/pkg/contracts/src/RegistryFactoryV0_0.sol:RegistryFactoryV0_0 \
  --verifier blockscout \
	--verifier-url https://arb-sepolia.blockscout.com/api/

deploy-testnet-multi-arb: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--account pkGarden \
	--ffi \
	--chain-id 421614 \
	--broadcast \
	--legacy \
	--via-ir \
	-vvvvv

upgrade-testnet-multi-arb: 
	-forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichain \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--sig "run(string)" 'arbsepolia' \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--ffi \
	--chain-id 421614 \
	--broadcast \
	--legacy \
	--via-ir \
	--verify \
	-vvv

verify-testnet-multi-arb: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
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

# Optimism Sepolia

deploy-testnet-multi-op: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--account pkGarden \
	--sig "run(string)" 'opsepolia' \
	--ffi \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast \
	--verify \
	-vvv

# Arbitrum

deploy-multi-arbitrum: 
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

upgrade-multi-arbitrum: 
	-forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichain \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--ffi \
	--chain-id 42161 \
	--broadcast \
	--legacy \
	--via-ir \
	--verify \
	-vvv

verify-arbitrum: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_ARB) \
	--sig "run(string)" 'arbitrum' \
	--account pkGarden \
	--etherscan-api-key $(ARBISCAN_API_KEY) \
	--ffi \
	--chain-id 42161 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

# Optimism

deploy-multi-optimism: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--account pkGarden \
	--ffi \
	--chain-id 10 \
	--broadcast \
	--legacy \
	--via-ir \
	-vvv

upgrade-multi-optimism: 
	-forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichain \
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


verify-optimism: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_OPT) \
	--sig "run(string)" 'optimism' \
	--account pkGarden \
	--etherscan-api-key $(OPTIMISM_API_KEY) \
	--ffi \
	--chain-id 10 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

# Polygon

deploy-multi-polygon: 
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

upgrade-multi-polygon: 
	-forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichain \
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

verify-polygon: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_POLYGON) \
	--sig "run(string)" 'polygon' \
	--account pkGarden \
	--etherscan-api-key $(POLYGONSCAN_API_KEY) \
	--ffi \
	--chain-id 137 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

# Mainnet

deploy-multi-mainnet: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_MAINNET) \
	--sig "run(string)" 'mainnet' \
	--account pkGarden \
	--ffi \
	--chain-id 1 \
	--broadcast \
	--legacy \
	--via-ir \
	-vvv

verify-mainnet: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_MAINNET) \
	--sig "run(string)" 'mainnet' \
	--account pkGarden \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--ffi \
	--chain-id 1 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow

# Gnosis

deploy-multi-gnosis: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--account pkGarden \
	--ffi \
	--chain-id 100 \
	--broadcast \
	--legacy \
	--via-ir \
	-vvv

verify-gnosis: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_GNOSIS) \
	--sig "run(string)" 'gnosis' \
	--account pkGarden \
	--etherscan-api-key $(GNOSISSCAN_API_KEY) \
	--ffi \
	--chain-id 100 \
	--legacy \
	--verify \
	--via-ir \
	-vvv \
	--slow