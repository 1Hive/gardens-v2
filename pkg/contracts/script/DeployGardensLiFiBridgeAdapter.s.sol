// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {GardensMarkeeRouter} from "../src/MarkeeRevenue/GardensMarkeeRouter.sol";
import {LiFiBridgeAdapter} from "../src/MarkeeRevenue/LiFiBridgeAdapter.sol";
import {IGardensMarkeeRouter} from "../src/MarkeeRevenue/interfaces/IGardensMarkeeRouter.sol";

/// @notice Deploys a Base LI.FI adapter and selects it for Gnosis claims.
/// The broadcaster must own the Gardens Markee router.
contract DeployGardensLiFiBridgeAdapter is Script {
    uint256 internal constant GNOSIS_CHAIN_ID = 100;

    function run() external {
        address routerProxy = vm.envAddress("GARDENS_MARKEE_ROUTER");
        address liFiDiamond = vm.envAddress("LIFI_DIAMOND");
        require(routerProxy != address(0) && liFiDiamond != address(0), "zero address");

        vm.startBroadcast();
        LiFiBridgeAdapter adapter = new LiFiBridgeAdapter(routerProxy, liFiDiamond);
        GardensMarkeeRouter(payable(routerProxy))
            .setBridgeConfiguration(GNOSIS_CHAIN_ID, address(adapter), IGardensMarkeeRouter.BridgeProtocol.LiFi);
        vm.stopBroadcast();

        console2.log("LiFiBridgeAdapter", address(adapter));
        console2.log("Gnosis chain ID", GNOSIS_CHAIN_ID);
    }
}
