# Lets creata commans to foundry
# forge script DeployCV.s.sol --account pk 

# read RPC_URL from .env file
include .env

# create RPC_URL_LOCALHOST variable
RPC_URL_LOCALHOST = http://0.0.0.0:8545
# print RPC_URL
print : 
	@echo $(RPC_URL)
	
deploy : 
	-forge script script/DeployCV.s.sol:DeployCV \
	--rpc-url $(RPC_URL_LOCALHOST) \
	--sender 0x34d82D1ED8B4fB6e6A569d6D086A39f9f734107E \
	0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \
	--unlocked \
	--broadcast -vv
	
fork:
	anvil --host=0.0.0.0 -f $(RPC_URL)

test1:
	forge test --fork-url $(RPC_URL_LOCALHOST) --mc CVStrategyTest \ 
	--sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 -vv


cast1:
	 cast send --account pk --rpc-url $(RPC_URL_LOCALHOST) \ 
	 "0xfEcFbe13c84595Ba47464CD4d8d3bb359372Fc6f" "nonce()" 