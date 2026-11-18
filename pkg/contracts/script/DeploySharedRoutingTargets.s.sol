// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/console2.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CVStrategyRouter, RegistryCommunityRouter} from "../src/routing/SharedImplementationRouter.sol";

/// @notice Deploys code targets only. Governance transactions are prepared separately.
contract DeploySharedRoutingTargets is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address factory = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        require(factory.code.length != 0, "factory proxy has no code");
        string memory mode = vm.envOr("SHARED_TARGET_MODE", string("release"));
        if (keccak256(bytes(mode)) == keccak256("migration")) {
            console2.log("RegistryFactory implementation", address(new RegistryFactory()));
            console2.log("CVStrategyRouter", address(new CVStrategyRouter(factory)));
            console2.log("RegistryCommunityRouter", address(new RegistryCommunityRouter(factory)));
            console2.log("CVStrategy core", address(new CVStrategy()));
            console2.log("RegistryCommunity core", address(new RegistryCommunity()));
            console2.log("CommunityPoolFacet", address(new CommunityPoolFacet()));
            return;
        }
        require(keccak256(bytes(mode)) == keccak256("release"), "SHARED_TARGET_MODE must be migration or release");
        require(
            RegistryFactory(payable(factory)).strategyImplementation() != address(0)
                && RegistryFactory(payable(factory)).communityImplementation() != address(0),
            "shared routing is not active"
        );
        string memory family = vm.envOr("SHARED_TARGET_FAMILY", string(""));
        if (keccak256(bytes(family)) == keccak256("strategy")) {
            console2.log("CVStrategy core", address(new CVStrategy()));
        } else if (keccak256(bytes(family)) == keccak256("community")) {
            console2.log("RegistryCommunity core", address(new RegistryCommunity()));
        } else {
            revert("SHARED_TARGET_FAMILY must be strategy or community");
        }
    }
}
