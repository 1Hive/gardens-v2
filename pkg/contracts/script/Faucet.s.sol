// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {ERC20} from "solady/src/tokens/ERC20.sol";

contract ERC20Faucet is Script {
    function run(address token, uint256 amount, address wallet) external {
        ERC20(token).transfer(wallet, amount);
    }
}