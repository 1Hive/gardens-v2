// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {GardensMarkeeRouter} from "../src/MarkeeRevenue/GardensMarkeeRouter.sol";

/// @notice Upgrades the Base Gardens Markee router so each sweep reimburses
/// the authorized calling keeper for its pre-authorized source-chain gas cost.
contract UpgradeGardensMarkeeRouterGasReimbursement is Script {
    function run() external {
        address routerProxy = vm.envAddress("GARDENS_MARKEE_ROUTER");
        require(routerProxy != address(0), "router proxy is zero");

        vm.startBroadcast();
        address routerImplementation = address(new GardensMarkeeRouter());
        GardensMarkeeRouter(payable(routerProxy)).upgradeTo(routerImplementation);
        vm.stopBroadcast();

        console2.log("GardensMarkeeRouter proxy", routerProxy);
        console2.log("GardensMarkeeRouter implementation", routerImplementation);
    }
}
