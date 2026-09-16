// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {GardensMarkeeRouter} from "../src/MarkeeRevenue/GardensMarkeeRouter.sol";
import {SquidBridgeAdapter} from "../src/MarkeeRevenue/SquidBridgeAdapter.sol";
import {IGardensMarkeeRouter} from "../src/MarkeeRevenue/interfaces/IGardensMarkeeRouter.sol";

contract ReplaceGardensSquidBridgeAdapter is Script {
    function run() external {
        address routerProxy = vm.envAddress("GARDENS_MARKEE_ROUTER");
        address squidRouter = vm.envAddress("SQUID_ROUTER");
        require(routerProxy != address(0) && squidRouter != address(0), "zero address");

        vm.startBroadcast();
        address bridgeAdapter = address(new SquidBridgeAdapter(routerProxy, squidRouter));
        GardensMarkeeRouter router = GardensMarkeeRouter(payable(routerProxy));
        router.setBridgeConfiguration(1, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(10, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(137, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(42161, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(42220, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        vm.stopBroadcast();

        console2.log("GardensMarkeeRouter proxy", routerProxy);
        console2.log("SquidBridgeAdapter", bridgeAdapter);
    }
}
