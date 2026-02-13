// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {StrategyDiamondConfiguratorBase} from "../test/helpers/StrategyDiamondConfigurator.sol";
import {CommunityDiamondConfiguratorBase} from "../test/helpers/CommunityDiamondConfigurator.sol";

// EIP-1967 slot for proxy implementation:

contract UpgradeCVMultichainTest is BaseMultiChain, StrategyDiamondConfiguratorBase, CommunityDiamondConfiguratorBase {
    using stdJson for string;

    bytes32 constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    struct FacetCuts {
        IDiamond.FacetCut[] cvCuts;
        IDiamond.FacetCut[] communityCuts;
    }

    function runCurrentNetwork(string memory networkJson) public override {
        address pauseController = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
        if (pauseController == address(0)) {
            revert("PAUSE_CONTROLLER not set in networks.json");
        }
        address registryImplementation = address(new RegistryCommunity());
        address strategyImplementation = address(new CVStrategy());
        address registryFactoryImplementation = address(new RegistryFactory());

        FacetCuts memory facetCuts = _buildFacetCuts();
        IDiamond.FacetCut[] memory cvCuts = facetCuts.cvCuts;
        IDiamond.FacetCut[] memory communityCuts = facetCuts.communityCuts;
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
        registryFactory.upgradeTo(registryFactoryImplementation);

        // 1.b -- Set faceting config --
        registryFactory.setCommunityFacets(
            communityCuts,
            address(new RegistryCommunityDiamondInit()),
            abi.encodeCall(RegistryCommunityDiamondInit.init, ())
        );
        registryFactory.setStrategyFacets(
            cvCuts, address(new CVStrategyDiamondInit()), abi.encodeCall(CVStrategyDiamondInit.init, ())
        );

        // 1.b.1 -- Set the Global Pause Controller --
        registryFactory.setGlobalPauseController(pauseController);

        // 1.c -- Set the Registry Community Template --
        registryFactory.setRegistryCommunityTemplate(registryImplementation);

        // 1.d -- Set the Strategy Template --
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
            registryCommunity.upgradeTo(registryImplementation);

            // 2.b -- Set the Strategy Template --
            registryCommunity.setStrategyTemplate(strategyImplementation);

            // 2.c -- Set the Strategy Facets --
            registryCommunity.setStrategyFacets(
                cvCuts, address(new CVStrategyDiamondInit()), abi.encodeCall(CVStrategyDiamondInit.init, ())
            );

            // 2.d -- Apply community facet cuts --
            IDiamond.FacetCut[] memory changedCommunityCuts =
                _buildChangedFacetCuts(registryCommunityProxies[i], communityCuts);
            if (changedCommunityCuts.length > 0) {
                IDiamondCut(registryCommunityProxies[i])
                    .diamondCut(
                        changedCommunityCuts,
                        address(new RegistryCommunityDiamondInit()),
                        abi.encodeCall(RegistryCommunityDiamondInit.init, ())
                    );
            }

        }

        // 3. CV STRATEGIES UPGRADES
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        IDiamond.FacetCut[] memory upgradedPoolCuts = _buildUpgradedStrategyFacetCuts();
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

            // 3.d -- Apply pool facet cuts --
            // if (upgradedPoolCuts.length > 0) {
            //     IDiamondCut(cvStrategyProxies[i])
            //         .diamondCut(
            //             upgradedPoolCuts, address(new CVStrategyDiamondInit()), abi.encodeCall(CVStrategyDiamondInit.init, ())
            //         );
            // }
        }
    }

    function _buildUpgradedCommunityFacetCuts() internal returns (IDiamond.FacetCut[] memory cuts) {
        CommunityPoolFacet communityPoolFacet = new CommunityPoolFacet();
        bytes4[] memory poolSelectors = new bytes4[](2);
        poolSelectors[0] = bytes4(
            keccak256(
                "createPool(address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        poolSelectors[1] = bytes4(
            keccak256(
                "createPool(address,address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(communityPoolFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: poolSelectors
        });
    }

    function _buildUpgradedStrategyFacetCuts() internal returns (IDiamond.FacetCut[] memory cuts) {
        // Existing pools do not need the streaming facet.
        cuts = new IDiamond.FacetCut[](0);
    }

    function _buildChangedFacetCuts(address diamondProxy, IDiamond.FacetCut[] memory desiredCuts)
        internal
        view
        returns (IDiamond.FacetCut[] memory changedCuts)
    {
        bytes4[][] memory selectorsByCut = new bytes4[][](desiredCuts.length);
        uint256[] memory selectorCountByCut = new uint256[](desiredCuts.length);
        uint256 changedCutCount = 0;

        for (uint256 i = 0; i < desiredCuts.length; i++) {
            bytes4[] memory desiredSelectors = desiredCuts[i].functionSelectors;
            selectorsByCut[i] = new bytes4[](desiredSelectors.length);
            uint256 changedSelectorCount = 0;

            for (uint256 j = 0; j < desiredSelectors.length; j++) {
                bytes4 selector = desiredSelectors[j];
                address currentFacet = IDiamondLoupe(diamondProxy).facetAddress(selector);
                if (currentFacet != desiredCuts[i].facetAddress) {
                    selectorsByCut[i][changedSelectorCount] = selector;
                    changedSelectorCount++;
                }
            }

            selectorCountByCut[i] = changedSelectorCount;
            if (changedSelectorCount > 0) {
                changedCutCount++;
            }
        }

        changedCuts = new IDiamond.FacetCut[](changedCutCount);
        uint256 changedIndex = 0;

        for (uint256 i = 0; i < desiredCuts.length; i++) {
            uint256 selectorCount = selectorCountByCut[i];
            if (selectorCount == 0) continue;

            bytes4[] memory changedSelectors = new bytes4[](selectorCount);
            for (uint256 j = 0; j < selectorCount; j++) {
                changedSelectors[j] = selectorsByCut[i][j];
            }

            changedCuts[changedIndex] = IDiamond.FacetCut({
                facetAddress: desiredCuts[i].facetAddress,
                action: desiredCuts[i].action,
                functionSelectors: changedSelectors
            });
            changedIndex++;
        }
    }

    function _buildFacetCuts() internal returns (FacetCuts memory cuts) {
        CVAdminFacet cvAdminFacet = new CVAdminFacet();
        CVAllocationFacet cvAllocationFacet = new CVAllocationFacet();
        CVDisputeFacet cvDisputeFacet = new CVDisputeFacet();
        CVPauseFacet cvPauseFacet = new CVPauseFacet();
        CVPowerFacet cvPowerFacet = new CVPowerFacet();
        CVProposalFacet cvProposalFacet = new CVProposalFacet();
        CVStreamingFacet cvStreamingFacet = new CVStreamingFacet();

        CommunityAdminFacet communityAdminFacet = new CommunityAdminFacet();
        CommunityMemberFacet communityMemberFacet = new CommunityMemberFacet();
        CommunityPauseFacet communityPauseFacet = new CommunityPauseFacet();
        CommunityPoolFacet communityPoolFacet = new CommunityPoolFacet();
        CommunityPowerFacet communityPowerFacet = new CommunityPowerFacet();
        CommunityStrategyFacet communityStrategyFacet = new CommunityStrategyFacet();

        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();

        cuts.cvCuts = _buildCVFacetCuts(
            cvAdminFacet,
            cvAllocationFacet,
            cvDisputeFacet,
            cvPauseFacet,
            cvPowerFacet,
            cvProposalFacet,
            cvStreamingFacet,
            loupeFacet
        );
        cuts.communityCuts = _buildCommunityFacetCuts(
            communityAdminFacet,
            communityMemberFacet,
            communityPauseFacet,
            communityPoolFacet,
            communityPowerFacet,
            communityStrategyFacet,
            loupeFacet
        );
    }

    function _buildCVFacetCuts(
        CVAdminFacet cvAdminFacet,
        CVAllocationFacet cvAllocationFacet,
        CVDisputeFacet cvDisputeFacet,
        CVPauseFacet cvPauseFacet,
        CVPowerFacet cvPowerFacet,
        CVProposalFacet cvProposalFacet,
        CVStreamingFacet cvStreamingFacet,
        DiamondLoupeFacet loupeFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = _buildFacetCuts(
            cvAdminFacet,
            cvAllocationFacet,
            cvDisputeFacet,
            cvPauseFacet,
            cvPowerFacet,
            cvProposalFacet
        );
        cuts = new IDiamond.FacetCut[](8);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 6; i++) {
            cuts[i + 1] = baseCuts[i];
        }
        bytes4[] memory streamingSelectors = new bytes4[](1);
        streamingSelectors[0] = CVStreamingFacet.rebalance.selector;
        cuts[7] = IDiamond.FacetCut({
            facetAddress: address(cvStreamingFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: streamingSelectors
        });
    }

    function _buildCommunityFacetCuts(
        CommunityAdminFacet communityAdminFacet,
        CommunityMemberFacet communityMemberFacet,
        CommunityPauseFacet communityPauseFacet,
        CommunityPoolFacet communityPoolFacet,
        CommunityPowerFacet communityPowerFacet,
        CommunityStrategyFacet communityStrategyFacet,
        DiamondLoupeFacet loupeFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts =
            CommunityDiamondConfiguratorBase._buildFacetCuts(
                communityAdminFacet,
                communityMemberFacet,
                communityPauseFacet,
                communityPoolFacet,
                communityPowerFacet,
                communityStrategyFacet
            );
        cuts = new IDiamond.FacetCut[](7);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 6; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    function _buildLoupeFacetCut(DiamondLoupeFacet _loupeFacet)
        internal
        pure
        override(StrategyDiamondConfiguratorBase, CommunityDiamondConfiguratorBase)
        returns (IDiamond.FacetCut memory)
    {
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        return IDiamond.FacetCut({
            facetAddress: address(_loupeFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: loupeSelectors
        });
    }
}
