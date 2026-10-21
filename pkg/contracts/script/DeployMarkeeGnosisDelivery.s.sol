// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;
import {Script, console2} from "forge-std/Script.sol";
import {CommunityDeliveryVault} from "../src/MarkeeRevenue/CommunityDeliveryVault.sol";
import {LiFiRelayBridgeAdapter} from "../src/MarkeeRevenue/LiFiRelayBridgeAdapter.sol";

/// @notice Preparation/dry-run by default. This does NOT change router configuration.
contract DeployMarkeeGnosisDelivery is Script {
    function run() external {
        address community = vm.envAddress("MARKEE_PILOT_COMMUNITY");
        address weth = 0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1;
        require(community != address(0), "community required");
        if (block.chainid == 100) {
            vm.startBroadcast();
            CommunityDeliveryVault vault = new CommunityDeliveryVault(community, weth);
            vm.stopBroadcast();
            console2.log("Gnosis community vault", address(vault));
        } else {
            require(block.chainid == 8453, "Base or Gnosis only");
            address owner = vm.envAddress("MARKEE_REVENUE_OWNER");
            address router = vm.envAddress("MARKEE_EXISTING_ROUTER_BASE");
            address receiver = vm.envAddress("MARKEE_EXISTING_RECEIVER_GNOSIS");
            address collector = vm.envAddress("MARKEE_RELAY_FEE_COLLECTOR");
            address recipient = vm.envAddress("MARKEE_RELAY_FEE_RECIPIENT");
            address vault = vm.envAddress("MARKEE_PILOT_VAULT_GNOSIS");
            require(owner != address(0) && router.code.length > 0, "invalid owner/router");
            vm.startBroadcast();
            LiFiRelayBridgeAdapter adapter = new LiFiRelayBridgeAdapter(
                router, 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE, receiver, weth, collector, recipient
            );
            adapter.setCommunityVault(community, vault);
            adapter.transferOwnership(owner);
            vm.stopBroadcast();
            console2.log("Base Relay adapter", address(adapter));
        }
    }
}
