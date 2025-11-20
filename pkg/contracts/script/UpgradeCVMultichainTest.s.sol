// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";

// EIP-1967 slot for proxy implementation:

contract UpgradeCVMultichainTest is BaseMultiChain {
    using stdJson for string;

    bytes32 constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    function runCurrentNetwork(string memory networkJson) public override {
        address registryImplementation = address(new RegistryCommunity());
        address strategyImplementation = address(new CVStrategy());
        // address passportScorer = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        // address safeArbitrator = networkJson.readAddress(getKeyNetwork(".ENVS.ARBITRATOR"));

        // PASSPORT SCORER UPGRADE
        // address passportScorerProxy = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        // PassportScorer passportScorer = PassportScorer(address(passportScorerProxy));
        // Upgrades.upgradeProxy(address(passportScorer), "PassportScorer.sol:PassportScorer", "");
        // passportScorer.upgradeTo(passportScorerImplementation); // DOESNT VALIDATE SAFE UPGRADING

        // 1. REGISTRY FACTORY UPGRADE
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactory registryFactory = RegistryFactory(payable(address(registryFactoryProxy)));

        // 1.a -- Upgrade the Registry Factory --
        // address registryFactoryImplementation = address(new RegistryFactory());
        // Upgrades.upgradeProxy(address(registryFactoryProxy), "RegistryFactory.sol:RegistryFactory", "");
        // abi.encodeWithSelector(RegistryFactoryV0_1.initializeV2.selector)
        // registryFactory.upgradeTo(registryFactoryImplementation); // DOESNT VALIDATE SAFE UPGRADING

        // 1.b -- Set the Registry Community Template --
        // registryFactory.setRegistryCommunityTemplate(registryImplementation);

        // 1.c -- Set the Strategy Template --
        registryFactory.setStrategyTemplate(strategyImplementation);

        // 2. REGISTRY COMMUNITIES UPGRADES
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity registryCommunity = RegistryCommunity(payable(address(registryCommunityProxies[i])));

            // WIP: Upgrade with safety
            // Upgrades.upgradeProxy(
            //     address(registryCommunityProxies[i]), "RegistryCommunity.sol:RegistryCommunity", ""
            // );
            // abi.encodeWithSelector(RegistryCommunity.initializeV2.selector)

            // 2.a -- Upgrade the Registry Community --
            // registryCommunity.upgradeTo(registryImplementation); // DOESNT VALIDATE SAFE UPGRADING

            // 2.b -- Set the Strategy Template --
            registryCommunity.setStrategyTemplate(strategyImplementation);
        }

        // 3. CV STRATEGIES UPGRADES
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            // WIP: Upgrade with safety
            // Upgrades.upgradeProxy(
            //     address(cvStrategyProxies[i]),
            //     "CVStrategy.sol:CVStrategy",
            //     abi.encodeWithSelector(CVStrategy.init2.selector, safeArbitrator));
            // abi.encodeWithSelector(CVStrategyinitializeV2.selector)

            // 3.a -- Upgrade the CV Strategy --
            CVStrategy cvStrategy = CVStrategy(payable(address(cvStrategyProxies[i])));
            cvStrategy.upgradeTo(strategyImplementation); // DOESNT VALIDATE SAFE UPGRADING

            // 3.b -- Init the Strategy --
            // cvStrategy.init2();

            // 3.c -- Set the Pool Params --
            // (
            //     ,
            //     address tribunalSafe,
            //     uint256 submitterCollateralAmount,
            //     uint256 challengerCollateralAmount,
            //     uint256 defaultRuling,
            //     uint256 defaultRulingTimeout
            // ) = cvStrategy.arbitrableConfigs(cvStrategy.currentArbitrableConfigVersion());
            // (uint256 maxRatio, uint256 weight, uint256 decay, uint256 minThresholdPoints) = cvStrategy.cvParams();
            // cvStrategy.setPoolParams(
            //     ArbitrableConfig(
            //         IArbitrator(safeArbitrator),
            //         tribunalSafe,
            //         submitterCollateralAmount,
            //         challengerCollateralAmount,
            //         defaultRuling,
            //         defaultRulingTimeout
            //     ),
            //     CVParams(maxRatio, weight, decay, minThresholdPoints)
            // );
        }
    }

    // WIP: Upgrade with safety
    // function ensureSameStorageLayout(address proxy) internal view {
    //     bytes32 slot = IMPLEMENTATION_SLOT;
    //     address currentImpl;
    //     // Low-level storage read at implementation slot
    //     assembly {
    //         let ptr := mload(0x40)
    //         mstore(ptr, slot)
    //         currentImpl := sload(add(ptr, 0))
    //     }
    // }
}
