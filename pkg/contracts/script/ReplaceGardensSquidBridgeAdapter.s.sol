// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {GardensMarkeeRouter} from "../src/MarkeeRevenue/GardensMarkeeRouter.sol";
import {SquidBridgeAdapterV2} from "../src/MarkeeRevenue/SquidBridgeAdapterV2.sol";
import {IGardensMarkeeRouter} from "../src/MarkeeRevenue/interfaces/IGardensMarkeeRouter.sol";

/// @notice Replaces the Base Squid adapter after every configured destination
/// receiver has been upgraded to expose the V2 payout callbacks.
contract ReplaceGardensSquidBridgeAdapter is Script {
    function run() external {
        address routerProxy = vm.envAddress("GARDENS_MARKEE_ROUTER");
        address squidRouter = vm.envAddress("SQUID_ROUTER");
        require(routerProxy != address(0) && squidRouter != address(0), "zero address");
        GardensMarkeeRouter router = GardensMarkeeRouter(payable(routerProxy));
        address adapterOwner = router.owner();
        require(adapterOwner != address(0), "adapter owner is zero");

        vm.startBroadcast();
        SquidBridgeAdapterV2 adapter = new SquidBridgeAdapterV2(routerProxy, squidRouter);
        address bridgeAdapter = address(adapter);
        router.setBridgeConfiguration(1, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(10, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(137, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(42161, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(42220, bridgeAdapter, IGardensMarkeeRouter.BridgeProtocol.Squid);
        adapter.transferOwnership(adapterOwner);
        vm.stopBroadcast();

        console2.log("GardensMarkeeRouter proxy", routerProxy);
        console2.log("SquidBridgeAdapterV2", bridgeAdapter);
        console2.log("SquidBridgeAdapterV2 owner", adapterOwner);
    }
}
