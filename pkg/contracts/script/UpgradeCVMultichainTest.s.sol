// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {CVStrategyV0_0} from "../src/CVStrategy/CVStrategyV0_0.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";

// EIP-1967 slot for proxy implementation:

contract UpgradeCVMultichainTest is BaseMultiChain {
    using stdJson for string;

    bytes32 constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    function runCurrentNetwork(string memory networkJson) public override {
        address registryImplementation = address(new RegistryCommunityV0_0());
        address strategyImplementation = address(new CVStrategyV0_0());
        // address passportScorer = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        // address safeArbitrator = networkJson.readAddress(getKeyNetwork(".ENVS.ARBITRATOR"));

        // PASSPORT SCORER UPGRADE
        // address passportScorerProxy = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        // PassportScorer passportScorer = PassportScorer(address(passportScorerProxy));
        // Upgrades.upgradeProxy(address(passportScorer), "PassportScorer.sol:PassportScorer", "");
        // passportScorer.upgradeTo(passportScorerImplementation); // DOESNT VALIDATE SAFE UPGRADING

        // 1. REGISTRY FACTORY UPGRADE
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactoryV0_0 registryFactory = RegistryFactoryV0_0(payable(address(registryFactoryProxy)));

        // 1.a -- Upgrade the Registry Factory --
        // address registryFactoryImplementation = address(new RegistryFactoryV0_0());
        // Upgrades.upgradeProxy(address(registryFactoryProxy), "RegistryFactoryV0_0.sol:RegistryFactoryV0_0", "");
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
            RegistryCommunityV0_0 registryCommunity =
                RegistryCommunityV0_0(payable(address(registryCommunityProxies[i])));

            // WIP: Upgrade with safety
            // Upgrades.upgradeProxy(
            //     address(registryCommunityProxies[i]), "RegistryCommunityV0_0.sol:RegistryCommunityV0_0", ""
            // );
            // abi.encodeWithSelector(RegistryCommunityV0_0.initializeV2.selector)

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
            //     "CVStrategyV0_0.sol:CVStrategyV0_0",
            //     abi.encodeWithSelector(CVStrategyV0_0.init2.selector, safeArbitrator));
            // abi.encodeWithSelector(CVStrategyV0_0initializeV2.selector)

            // 3.a -- Upgrade the CV Strategy --
            CVStrategyV0_0 cvStrategy = CVStrategyV0_0(payable(address(cvStrategyProxies[i])));
            cvStrategy.upgradeTo(strategyImplementation); // DOESNT VALIDATE SAFE UPGRADING

            // 3.b -- Init the Strategy --
            // init2 was removed from CVStrategyV0_0; upgrades now rely on the existing state
            // and reconfiguration steps executed below.

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
