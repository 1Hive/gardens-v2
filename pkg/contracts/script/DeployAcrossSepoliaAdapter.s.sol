// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {AcrossBridgeAdapter} from "../src/MarkeeRevenue/AcrossBridgeAdapter.sol";
import {GardensMarkeeRouter} from "../src/MarkeeRevenue/GardensMarkeeRouter.sol";

/// @notice Deploys and wires the Ethereum Sepolia Across adapter into the
/// existing Gardens Markee test router. The broadcaster must own the router.
contract DeployAcrossSepoliaAdapter is Script {
    address constant GARDENS_MARKEE_ROUTER = 0x60cAE534399B0617E96253E7a96629f9564cc0f7;
    address constant SEPOLIA_ACROSS_SPOKE_POOL = 0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662;
    address constant SEPOLIA_WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    address constant ARB_SEPOLIA_WETH = 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73;
    address constant OP_SEPOLIA_WETH = 0x4200000000000000000000000000000000000006;

    uint256 constant ARB_SEPOLIA_CHAIN_ID = 421614;
    uint256 constant OP_SEPOLIA_CHAIN_ID = 11155420;

    function run() external {
        address arbReceiver = vm.envAddress("ARB_SEPOLIA_REVENUE_RECEIVER");
        address opReceiver = vm.envAddress("OP_SEPOLIA_REVENUE_RECEIVER");
        require(arbReceiver != address(0) && opReceiver != address(0), "receiver is zero");

        vm.startBroadcast();

        AcrossBridgeAdapter adapter =
            new AcrossBridgeAdapter(GARDENS_MARKEE_ROUTER, SEPOLIA_ACROSS_SPOKE_POOL, SEPOLIA_WETH);
        adapter.setDestinationToken(ARB_SEPOLIA_CHAIN_ID, ARB_SEPOLIA_WETH);
        adapter.setDestinationToken(OP_SEPOLIA_CHAIN_ID, OP_SEPOLIA_WETH);

        GardensMarkeeRouter router = GardensMarkeeRouter(payable(GARDENS_MARKEE_ROUTER));
        router.setBridgeAdapter(address(adapter));
        router.setRemoteReceiver(ARB_SEPOLIA_CHAIN_ID, arbReceiver);
        router.setRemoteReceiver(OP_SEPOLIA_CHAIN_ID, opReceiver);

        vm.stopBroadcast();

        console2.log("AcrossBridgeAdapter", address(adapter));
        console2.log("Arbitrum Sepolia receiver", arbReceiver);
        console2.log("Optimism Sepolia receiver", opReceiver);
    }
}
