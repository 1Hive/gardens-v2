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
    bytes32 internal constant GNOSIS_LIFI_RECEIVER =
        bytes32(uint256(uint160(0x0dC56076590CdF0efc37114273f02f45A96B5500)));
    address internal constant LIFI_FEE_COLLECTOR = 0xCE40449B773a3E6E5e769ADb4e567179d4828cbd;
    address internal constant STARGATE_NATIVE_POOL = 0xC06ebbefD94032B85424D51906e2A335EFAe264B;
    uint16 internal constant STARGATE_NATIVE_ASSET_ID = 13;

    function run() external {
        address routerProxy = vm.envAddress("GARDENS_MARKEE_ROUTER");
        address liFiDiamond = vm.envAddress("LIFI_DIAMOND");
        require(routerProxy != address(0) && liFiDiamond != address(0), "zero address");

        vm.startBroadcast();
        LiFiBridgeAdapter adapter = new LiFiBridgeAdapter(routerProxy, liFiDiamond);
        adapter.setSourceRoute(LIFI_FEE_COLLECTOR, STARGATE_NATIVE_POOL, STARGATE_NATIVE_ASSET_ID);
        adapter.setDestinationExecutor(GNOSIS_CHAIN_ID, GNOSIS_LIFI_RECEIVER);
        GardensMarkeeRouter(payable(routerProxy))
            .setBridgeConfiguration(GNOSIS_CHAIN_ID, address(adapter), IGardensMarkeeRouter.BridgeProtocol.LiFi);
        vm.stopBroadcast();

        console2.log("LiFiBridgeAdapter", address(adapter));
        console2.log("Gnosis chain ID", GNOSIS_CHAIN_ID);
    }
}
