// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategyV0_0} from "../src/CVStrategy/CVStrategyV0_0.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";

contract UpgradeCVMultichain is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address registryFactoryImplementation = address(new RegistryFactoryV0_0());
        address registryImplementation = address(new RegistryCommunityV0_0());
        address strategyImplementation = address(new CVStrategyV0_0());
        address passportScorerImplementation = address(new PassportScorer());

        // PASSPORT SCORER UPGRADE
        // address passportScorerProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.PASSPORT_SCORER"));
        // PassportScorer passportScorer = PassportScorer(address(passportScorerProxy));
        // Upgrades.upgradeProxy(address(passportScorer), "PassportScorer.sol:PassportScorer", "");
        // passportScorer.upgradeTo(passportScorerImplementation); // DOESNT VALIDATE SAFE UPGRADING

        // REGISTRY FACTORY UPGRADE
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactoryV0_0 registryFactory = RegistryFactoryV0_0(payable(address(registryFactoryProxy)));

        // Upgrades.upgradeProxy(address(registryFactoryProxy), "RegistryFactoryV0_0.sol:RegistryFactoryV0_0", "");
        // abi.encodeWithSelector(RegistryFactoryV0_1.initializeV2.selector)
        registryFactory.upgradeTo(registryFactoryImplementation); // DOESNT VALIDATE SAFE UPGRADING
        registryFactory.setRegistryCommunityTemplate(registryImplementation);
        registryFactory.setStrategyTemplate(strategyImplementation);

        // REGISTRY COMMUNITIES UPGRADES
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunityV0_0 registryCommunity =
                RegistryCommunityV0_0(payable(address(registryCommunityProxies[i])));
            // Upgrades.upgradeProxy(
            //     address(registryCommunityProxies[i]), "RegistryCommunityV0_0.sol:RegistryCommunityV0_0", ""
            // );
            // abi.encodeWithSelector(RegistryCommunityV0_0.initializeV2.selector)
            registryCommunity.upgradeTo(registryImplementation); // DOESNT VALIDATE SAFE UPGRADING
            registryCommunity.setStrategyTemplate(strategyImplementation);
        }

        // CV STRATEGIES UPGRADES
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            // Upgrades.upgradeProxy(address(cvStrategyProxies[i]), "CVStrategyV0_0.sol:CVStrategyV0_0", "");
            // abi.encodeWithSelector(CVStrategyV0_0initializeV2.selector)
            CVStrategyV0_0(payable(address(cvStrategyProxies[i]))).upgradeTo(strategyImplementation); // DOESNT VALIDATE SAFE UPGRADING
        }
    }
}
