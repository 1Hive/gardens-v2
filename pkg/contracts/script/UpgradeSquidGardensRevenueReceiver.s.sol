// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {SquidGardensRevenueReceiver} from "../src/MarkeeRevenue/SquidGardensRevenueReceiver.sol";

/// @notice Upgrades a shared Gardens revenue receiver to accept token payouts
/// and enforce Squid V2 destination-side minimum output.
contract UpgradeSquidGardensRevenueReceiver is Script {
    function run() external {
        address receiverProxy = vm.envAddress("GARDENS_SQUID_REVENUE_RECEIVER");
        require(receiverProxy != address(0), "receiver is zero");

        address[] memory liabilityTokens;
        uint256[] memory liabilityAmounts;
        if (vm.envOr("CONFIRMED_NO_UNRESOLVED_TOKEN_PAYOUTS", false)) {
            liabilityTokens = new address[](0);
            liabilityAmounts = new uint256[](0);
        } else {
            liabilityTokens = vm.envAddress("UNRESOLVED_TOKEN_LIABILITY_TOKENS", ",");
            liabilityAmounts = vm.envUint("UNRESOLVED_TOKEN_LIABILITY_AMOUNTS", ",");
        }

        vm.startBroadcast();
        address receiverImplementation = address(new SquidGardensRevenueReceiver());
        SquidGardensRevenueReceiver(payable(receiverProxy))
            .upgradeToAndCall(
                receiverImplementation,
                abi.encodeCall(
                    SquidGardensRevenueReceiver.initializeTokenLiabilityAccounting, (liabilityTokens, liabilityAmounts)
                )
            );
        vm.stopBroadcast();

        console2.log("Gardens revenue receiver proxy", receiverProxy);
        console2.log("Gardens revenue receiver implementation", receiverImplementation);
    }
}
