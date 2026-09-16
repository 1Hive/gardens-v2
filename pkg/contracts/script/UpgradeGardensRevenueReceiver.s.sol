// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {GardensRevenueReceiver} from "../src/MarkeeRevenue/GardensRevenueReceiver.sol";

/// @notice Deploys the current receiver implementation and upgrades one
/// existing UUPS receiver proxy. The broadcaster must be its effective owner.
contract UpgradeGardensRevenueReceiver is Script {
    function run() external {
        address receiverProxy = vm.envAddress("GARDENS_REVENUE_RECEIVER");
        require(receiverProxy != address(0), "receiver is zero");

        vm.startBroadcast();
        address receiverImplementation = address(new GardensRevenueReceiver());
        GardensRevenueReceiver(payable(receiverProxy)).upgradeTo(receiverImplementation);
        vm.stopBroadcast();

        console2.log("GardensRevenueReceiver proxy", receiverProxy);
        console2.log("GardensRevenueReceiver implementation", receiverImplementation);
    }
}
