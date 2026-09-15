// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {SquidGardensRevenueReceiver} from "../src/MarkeeRevenue/SquidGardensRevenueReceiver.sol";

/// @notice Upgrades a shared Gardens revenue receiver to accept token payouts
/// from destination-call bridges such as LI.FI Composer.
contract UpgradeSquidGardensRevenueReceiver is Script {
    function run() external {
        address receiverProxy = vm.envAddress("GARDENS_SQUID_REVENUE_RECEIVER");
        require(receiverProxy != address(0), "receiver is zero");

        vm.startBroadcast();
        address receiverImplementation = address(new SquidGardensRevenueReceiver());
        SquidGardensRevenueReceiver(payable(receiverProxy)).upgradeTo(receiverImplementation);
        vm.stopBroadcast();

        console2.log("Gardens revenue receiver proxy", receiverProxy);
        console2.log("Gardens revenue receiver implementation", receiverImplementation);
    }
}
