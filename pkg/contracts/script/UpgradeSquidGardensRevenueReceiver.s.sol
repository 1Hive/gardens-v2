// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {SquidGardensRevenueReceiver} from "../src/MarkeeRevenue/SquidGardensRevenueReceiver.sol";

/// @notice Deploys the current implementation and upgrades an existing UUPS
/// Squid destination receiver. The broadcaster must be its effective owner.
contract UpgradeSquidGardensRevenueReceiver is Script {
    function run() external {
        address receiverProxy = vm.envAddress("GARDENS_SQUID_REVENUE_RECEIVER");
        require(receiverProxy != address(0), "receiver is zero");

        vm.startBroadcast();
        address receiverImplementation = address(new SquidGardensRevenueReceiver());
        SquidGardensRevenueReceiver(payable(receiverProxy)).upgradeTo(receiverImplementation);
        vm.stopBroadcast();

        console2.log("SquidGardensRevenueReceiver proxy", receiverProxy);
        console2.log("SquidGardensRevenueReceiver implementation", receiverImplementation);
    }
}
