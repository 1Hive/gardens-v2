// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {GV2ERC20} from "./GV2ERC20.sol";

contract DeployHoneyERC20 is Script {
    error WrongChain(uint256 chainId, uint256 expectedChainId);

    function run() public {
        if (block.chainid != 11155111) {
            revert WrongChain(block.chainid, 11155111);
        }

        vm.startBroadcast();
        GV2ERC20 token = new GV2ERC20("Honey", "HNY", 18);
        vm.stopBroadcast();

    }
}
