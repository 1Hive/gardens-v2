// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {RegistryFactoryV0_1} from "../src/RegistryFactory/RegistryFactoryV0_1.sol";

contract UpgradeCVMultichain is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        // REGISTRY FACTORY UPGRADES
        // address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".ENVS.PROXIES.REGISTRY_FACTORY"));
        // Upgrades.upgradeProxy(
        //     address(registryFactoryProxy),
        //     "RegistryFactoryV0_1.sol",
        //     abi.encodeWithSelector(RegistryFactoryV0_1.initializeV2.selector)
        // );

        // REGISTRY COMMUNITIES UPGRADES
        // address[] memory registryCommunityProxies =
        //     networkJson.readAddressArray(getKeyNetwork(".ENVS.PROXIES.REGISTRY_COMMUNITIES"));
        // for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
        //     Upgrades.upgradeProxy(
        //         address(registryCommunityProxies[i]),
        //         "RegistryCommunityV0_1.sol",
        //         abi.encodeWithSelector(RegistryCommunityV0_1.initializeV2.selector)
        //     );
        // }

        // CV STRATEGIES UPGRADES
        // address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".ENVS.PROXIES.CV_STRATEGIES"));
        // for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
        //     Upgrades.upgradeProxy(
        //         address(cvStrategyProxies[i]),
        //         "CVStrategyV0_1.sol",
        //         abi.encodeWithSelector(CVStrategyV0_1.initializeV2.selector, SENDER)
        //     );
        // }
    }
}
