# Lets creata commans to foundry
# forge script DeployCV.s.sol --account pk 

# read RPC_URL from .env file
include .env

# create RPC_URL_LOCALHOST variable
RPC_URL_LOCALHOST = http://localhost:8545
# print RPC_URL
print : 
	@echo $(RPC_URL)
	
deploy : 
	forge script script/DeployCV.s.sol:DeployCV --account pk --rpc-url $(RPC_URL_LOCALHOST) --account pk  --sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 --broadcast --unlocked -vv
	
fork:
	anvil -f $(RPC_URL)

test1:
	forge test --fork-url $(RPC_URL_LOCALHOST) --mc CVStrategyTest --sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 -vv


cast1:
	 cast send --account pk --rpc-url $(RPC_URL_LOCALHOST) "0xfEcFbe13c84595Ba47464CD4d8d3bb359372Fc6f" "nonce()" 