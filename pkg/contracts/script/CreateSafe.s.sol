// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {SimpleSafe} from "../src/SimpleSafe.sol";

contract CreateSafe is Script {
    function run() public {
        vm.startBroadcast();
        SimpleSafe newSafe = new SimpleSafe();
        console.log("NewSafe: %s", address(newSafe));
    }
}
