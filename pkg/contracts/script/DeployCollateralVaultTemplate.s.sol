// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {CREATE3} from "allo-v2/lib/hats-protocol/lib/solady/src/utils/CREATE3.sol";
import "forge-std/Script.sol";
import {CollateralVault} from "../src/CollateralVault.sol";

import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";

contract DeployCollateralVaultTemplate is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address newCollateralVaultImpl = address(new CollateralVault());

        // REGISTRY FACTORY
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactoryV0_0 registryFactory = RegistryFactoryV0_0(payable(address(registryFactoryProxy)));
        registryFactory.setCollateralVaultTemplate(newCollateralVaultImpl);

        // REGISTRY COMMUNITIES
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunityV0_0 registryCommunity =
                RegistryCommunityV0_0(payable(address(registryCommunityProxies[i])));
            registryCommunity.setCollateralVaultTemplate(newCollateralVaultImpl);
        }
    }
}
