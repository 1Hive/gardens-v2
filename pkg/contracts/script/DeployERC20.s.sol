// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {console} from "forge-std/console.sol";
import {GV2ERC20} from "./GV2ERC20.sol";

contract DeployERC20 is Native, Script {
    using stdJson for string;

    function run(string memory name, string memory symbol) public {
        vm.startBroadcast();
        GV2ERC20 token = new GV2ERC20(name, symbol, 18);
        vm.stopBroadcast();
        console.log("Token address: ", address(token));
    }
}
