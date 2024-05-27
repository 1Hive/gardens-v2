# Lets creata commans to foundry
# forge script DeployCV.s.sol --account pk 

# read RPC_URL from .env file
include .env

# create RPC_URL_LOCALHOST variable
RPC_URL_LOCALHOST = http://127.0.0.1:8545
# print RPC_URL
print : 
	@echo $(RPC_URL)
	
add-strategy: #make add-strategy S=0x1234 
	-forge script script/AddStrategy.s.sol:AddStrategy \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pk1 \
	--sig "run(address,address)" $(S) $(C) \
	--broadcast \
	-vvvv

add-strategy-ethsep: #make add-strategy S=0x1234 
	-forge script script/AddStrategy.s.sol:AddStrategy \
	--rpc-url $(RPC_URL_SEP_TESTNET) \
	--account pk1 \
	--sig "run(address,address)" $(S) $(C) \
	--broadcast \
	--legacy \
	-vvvv
	
add-strategy-ethsep-pool: #make add-strategy S=0x1234 
	-forge script script/AddStrategy.s.sol:AddStrategy \
	--rpc-url $(RPC_URL_SEP_TESTNET) \
	--account pk1 \
	--sig "run(uint256,address)" $(P) $(C) \
	--broadcast \
	--legacy \
	-vvvv
	
add-strategy-local: #make add-strategy S=0x1234 
	-forge script script/AddStrategy.s.sol:AddStrategy \
	--rpc-url $(RPC_URL_LOCALHOST) \
	--sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \
	--unlocked \
	--sig "run(address,address)" $(S) $(C) \
	--broadcast \
	-vvvv

add-owner: #make add-owner owner=0x1234 safe=0x1234
	-forge script script/AddOwner.s.sol:AddOwner \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pk1 \
	--sig "run(address,address)" $(owner) $(safe) \
	--broadcast \
	-vvvv


deploy: 
	-forge script script/DeployCV.s.sol:DeployCV \
	--rpc-url $(RPC_URL_LOCALHOST) \
	--sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \
	--unlocked \
	--broadcast -vv
	

deploy-pool-testnet: 
	-forge script script/DeployCVArbSepoliaPool.s.sol:DeployCVArbSepoliaPool \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pk1 \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast -vv

deploy-commfee-testnet: 
	-forge script script/DeployCVArbSepoliaCommFee.s.sol:DeployCVArbSepoliaCommFee \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pk1 \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast -vv
	
deploy-testnet: 
	-forge script script/DeployCVArbSepolia.s.sol:DeployCVArbSepolia \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pk1 \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast \
	-vv

deploy-testnet-dry: 
	-forge script script/DeployCVArbSepolia.s.sol:DeployCVArbSepolia \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pk1 \
	-vvvv


deploy-testnet-multi-sep: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_SEP_TESTNET) \
	--account pk1 \
	--sig "run(string)" 'sepolia' \
	--ffi \
	--etherscan-api-key $(ETHERSCAN_API_KEY_ETH_SEP) \
	--broadcast \
	--legacy \
	-vvv

deploy-verify-multi-sep: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_SEP_TESTNET) \
	--account pk1 \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY_ETH_SEP) \
	-vv
	
deploy-testnet-multi-op: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_OP_TESTNET) \
	--account pk1 \
	--sig "run(string)" 'opsepolia' \
	--ffi \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast \
	-vvv

deploy-testnet-multi-arb: 
	-forge script script/DeployCVMultiChain.s.sol:DeployCVMultiChain \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pk1 \
	--sig "run(string)" 'arbsepolia' \
	--ffi \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	--broadcast \
	-vvv

deploy-verify: 
	-forge script script/DeployCVArbSepolia.s.sol:DeployCVArbSepolia \
	--rpc-url $(RPC_URL_ARB_TESTNET) \
	--account pk1 \
	--verify \
	--etherscan-api-key $(ETHERSCAN_API_KEY) \
	-vv
fork:
	anvil --chain-id 1337
fork0:
	anvil --host=0.0.0.0 --chain-id 1337
fork0b5:
	anvil --host=0.0.0.0 --chain-id 1337 -b 5
fork-testnet:
	anvil --host=0.0.0.0 -f $(RPC_URL_ARB_TESTNET)
test1:
	forge test --fork-url $(RPC_URL_LOCALHOST) --mc CVStrategyTest \ 
	--sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 -vv


cast1:
	 cast send --account pk --rpc-url $(RPC_URL_LOCALHOST) \ 
	 "0xfEcFbe13c84595Ba47464CD4d8d3bb359372Fc6f" "nonce()" 

fund_arb:
	cast send \
	--from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
	--unlocked 0xefeab1ea32a5d7c6b1de6192ee531a2ef51198d9 \
	--value 100ether \
	--rpc-url=$(RPC_URL_LOCALHOST)