// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Script, console2} from "forge-std/Script.sol";

import {GardensMarkeeRouterRevenueRecovery} from
    "../src/MarkeeRevenue/GardensMarkeeRouterRevenueRecovery.sol";
import {CommunityKeyLib} from "../src/MarkeeRevenue/libraries/CommunityKeyLib.sol";
import {ICommunityRevenueVault} from "../src/MarkeeRevenue/interfaces/ICommunityRevenueVault.sol";

interface IUUPSUpgradeableProxy {
    function upgradeToAndCall(address newImplementation, bytes calldata data) external payable;
}

interface ILegacyGardensMarkeeRouter {
    function vaults(bytes32 communityKey) external view returns (address vault);
}

contract RecoverOldGardensMarkeeRevenue is Script {
    bytes32 private constant IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    function run() external {
        address router = vm.envAddress("GARDENS_OLD_MARKEE_ROUTER");
        uint256 communityChainId = vm.envUint("RECOVERY_COMMUNITY_CHAIN_ID");
        address registryCommunity = vm.envAddress("RECOVERY_REGISTRY_COMMUNITY");
        address payable recipient = payable(vm.envAddress("RECOVERY_RECIPIENT"));
        bytes32 communityKey = CommunityKeyLib.communityKey(communityChainId, registryCommunity);
        address oldImplementation = address(uint160(uint256(vm.load(router, IMPLEMENTATION_SLOT))));
        require(oldImplementation.code.length != 0, "old implementation missing");
        address vault = ILegacyGardensMarkeeRouter(router).vaults(communityKey);
        require(vault != address(0), "community vault missing");
        (,,, uint256 expectedAmount) = ICommunityRevenueVault(vault).availableRevenue();
        require(expectedAmount != 0, "no revenue to recover");
        uint256 recipientBalanceBefore = recipient.balance;

        vm.startBroadcast();

        GardensMarkeeRouterRevenueRecovery recoveryImplementation =
            new GardensMarkeeRouterRevenueRecovery();
        IUUPSUpgradeableProxy(router).upgradeToAndCall(
            address(recoveryImplementation),
            abi.encodeCall(
                GardensMarkeeRouterRevenueRecovery.recoverCommunityRevenue,
                (communityKey, recipient)
            )
        );
        IUUPSUpgradeableProxy(router).upgradeToAndCall(oldImplementation, bytes(""));

        vm.stopBroadcast();

        (,,, uint256 remainingAmount) = ICommunityRevenueVault(vault).availableRevenue();
        require(remainingAmount == 0, "vault revenue remains");
        require(recipient.balance == recipientBalanceBefore + expectedAmount, "recipient amount mismatch");

        console2.log("Retired router", router);
        console2.log("Recovery implementation", address(recoveryImplementation));
        console2.log("Restored implementation", oldImplementation);
        console2.log("Recipient", recipient);
        console2.log("Recovered amount", expectedAmount);
        console2.logBytes32(communityKey);
    }
}
