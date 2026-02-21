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
import {CVSyncPowerFacet} from "../src/CVStrategy/facets/CVSyncPowerFacet.sol";
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
    enum Phase {
        All,
        Factory,
        Communities,
        Strategies
    }
    enum FactoryAction {
        All,
        UpgradeImpl,
        SetCommunityFacets,
        SetStrategyFacets,
        SetPauseController,
        SetRegistryTemplate,
        SetStrategyTemplate
    }
    Phase public phaseSelection = Phase.All;
    FactoryAction public factoryAction = FactoryAction.All;

    struct FacetCuts {
        IDiamond.FacetCut[] cvCuts;
        IDiamond.FacetCut[] communityCuts;
    }

    function runFactory(string memory network) public {
        phaseSelection = Phase.Factory;
        factoryAction = FactoryAction.All;
        run(network);
    }

    function runFactoryStep(string memory network, string memory action) public {
        phaseSelection = Phase.Factory;
        factoryAction = _parseFactoryAction(action);
        run(network);
    }

    function runFactoryUpgradeImpl(string memory network) public {
        phaseSelection = Phase.Factory;
        factoryAction = FactoryAction.UpgradeImpl;
        run(network);
    }

    function runFactorySetCommunityFacets(string memory network) public {
        phaseSelection = Phase.Factory;
        factoryAction = FactoryAction.SetCommunityFacets;
        run(network);
    }

    function runFactorySetStrategyFacets(string memory network) public {
        phaseSelection = Phase.Factory;
        factoryAction = FactoryAction.SetStrategyFacets;
        run(network);
    }

    function runFactorySetPauseController(string memory network) public {
        phaseSelection = Phase.Factory;
        factoryAction = FactoryAction.SetPauseController;
        run(network);
    }

    function runFactorySetRegistryTemplate(string memory network) public {
        phaseSelection = Phase.Factory;
        factoryAction = FactoryAction.SetRegistryTemplate;
        run(network);
    }

    function runFactorySetStrategyTemplate(string memory network) public {
        phaseSelection = Phase.Factory;
        factoryAction = FactoryAction.SetStrategyTemplate;
        run(network);
    }

    function runCommunities(string memory network) public {
        phaseSelection = Phase.Communities;
        run(network);
    }

    function runStrategies(string memory network) public {
        phaseSelection = Phase.Strategies;
        run(network);
    }

    function run(string memory network, string memory phase) public {
        phaseSelection = _parsePhase(phase);
        factoryAction = FactoryAction.All;
        run(network);
    }

    function runCurrentNetwork(string memory networkJson) public override {
        bool doFactory = phaseSelection == Phase.All || phaseSelection == Phase.Factory;
        bool doCommunities = phaseSelection == Phase.All || phaseSelection == Phase.Communities;
        bool doStrategies = phaseSelection == Phase.All || phaseSelection == Phase.Strategies;

        address strategyImplementation = (doStrategies
                || (doFactory && _isFactoryAction(FactoryAction.SetStrategyTemplate)))
            ? address(new CVStrategy())
            : address(0);
        address registryImplementation = (doCommunities
                || (doFactory && _isFactoryAction(FactoryAction.SetRegistryTemplate)))
            ? address(new RegistryCommunity())
            : address(0);
        address registryFactoryImplementation =
            (doFactory && _isFactoryAction(FactoryAction.UpgradeImpl)) ? address(new RegistryFactory()) : address(0);

        IDiamond.FacetCut[] memory cvCuts;
        IDiamond.FacetCut[] memory communityCuts;
        bool needFactoryFacetCuts = doFactory
            && (_isFactoryAction(FactoryAction.SetCommunityFacets) || _isFactoryAction(FactoryAction.SetStrategyFacets));
        if (doCommunities) {
            FacetCuts memory facetCuts;
            if (phaseSelection == Phase.Factory) {
                facetCuts = _buildFacetCutsFromSnapshot();
            } else {
                facetCuts = _buildFacetCuts();
            }
            cvCuts = facetCuts.cvCuts;
            communityCuts = facetCuts.communityCuts;
        } else if (needFactoryFacetCuts) {
            if (factoryAction == FactoryAction.SetCommunityFacets) {
                communityCuts = _buildCommunityFacetCutsFromSnapshot();
            } else if (factoryAction == FactoryAction.SetStrategyFacets) {
                cvCuts = _buildCVFacetCutsFromSnapshot();
            } else {
                FacetCuts memory facetCuts = _buildFacetCutsFromSnapshot();
                cvCuts = facetCuts.cvCuts;
                communityCuts = facetCuts.communityCuts;
            }
        }

        if (doFactory) {
            _upgradeRegistryFactory(
                networkJson,
                registryFactoryImplementation,
                registryImplementation,
                strategyImplementation,
                cvCuts,
                communityCuts
            );
        }

        if (doCommunities) {
            _upgradeRegistryCommunities(
                networkJson, registryImplementation, strategyImplementation, cvCuts, communityCuts
            );
        }

        if (doStrategies) {
            _upgradeStrategies(networkJson, strategyImplementation, cvCuts);
        }
    }

    function _isFactoryAction(FactoryAction action) internal view returns (bool) {
        return factoryAction == FactoryAction.All || factoryAction == action;
    }

    function _upgradeRegistryFactory(
        string memory networkJson,
        address registryFactoryImplementation,
        address registryImplementation,
        address strategyImplementation,
        IDiamond.FacetCut[] memory cvCuts,
        IDiamond.FacetCut[] memory communityCuts
    ) internal {
        address pauseController = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
        if (pauseController == address(0)) {
            revert("PAUSE_CONTROLLER not set in networks.json");
        }

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactory registryFactory = RegistryFactory(payable(address(registryFactoryProxy)));
        bool forceFacets = vm.envOr("FORCE_FACETS", false);
        bool splitFactoryFacetWrites = vm.envOr("SPLIT_FACTORY_FACETS", false);
        bool checkFactoryImpl = vm.envOr("CHECK_FACTORY_IMPL", false);
        if (
            checkFactoryImpl && splitFactoryFacetWrites
                && (factoryAction == FactoryAction.SetCommunityFacets
                    || factoryAction == FactoryAction.SetStrategyFacets)
        ) {
            address currentImpl = _proxyImplementationAddress(registryFactoryProxy);
            if (!_isRegistryFactoryProxyAbiCompatible(registryFactoryProxy)) {
                revert("factory impl mismatch, run upgrade-opsep-factory-upgrade-impl");
            }
        } else if (
            splitFactoryFacetWrites
                && (factoryAction == FactoryAction.SetCommunityFacets
                    || factoryAction == FactoryAction.SetStrategyFacets)
        ) {
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.UpgradeImpl) {
            if (registryFactoryImplementation == address(0)) revert("missing registry factory implementation");
            registryFactory.upgradeTo(registryFactoryImplementation);
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetCommunityFacets) {
            bytes32 communityCutsDigest = _facetCutsDigest(communityCuts);
            string memory communityCutsDigestHex = _bytes32ToHex(communityCutsDigest);
            string memory previousCommunityCutsDigest = _readStringOrEmpty(".FACTORY_STATE.COMMUNITY_CUTS_DIGEST");
            if (!forceFacets && keccak256(bytes(previousCommunityCutsDigest)) == keccak256(bytes(communityCutsDigestHex)))
            {
            } else {
                address communityInit = _getOrDeployCommunityDiamondInit();
                bytes memory communityInitCalldata = abi.encodeCall(RegistryCommunityDiamondInit.init, ());
                if (vm.envOr("ESTIMATE_FACTORY_GAS", false)) {
                    bytes memory setCommunityFacetsCalldata = abi.encodeCall(
                        RegistryFactory.setCommunityFacets, (communityCuts, communityInit, communityInitCalldata)
                    );
                    _logEstimatedTxGas("setCommunityFacets", registryFactoryProxy, setCommunityFacetsCalldata);
                }
                if (splitFactoryFacetWrites) {
                    _setCommunityFacetsSplit(registryFactory, communityCuts, communityInit, communityInitCalldata);
                } else {
                    registryFactory.setCommunityFacets(communityCuts, communityInit, communityInitCalldata);
                }
                _writeNetworkString(".FACTORY_STATE.COMMUNITY_CUTS_DIGEST", communityCutsDigestHex);
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetStrategyFacets) {
            bytes32 strategyCutsDigest = _facetCutsDigest(cvCuts);
            string memory strategyCutsDigestHex = _bytes32ToHex(strategyCutsDigest);
            string memory previousStrategyCutsDigest = _readStringOrEmpty(".FACTORY_STATE.STRATEGY_CUTS_DIGEST");
            if (!forceFacets && keccak256(bytes(previousStrategyCutsDigest)) == keccak256(bytes(strategyCutsDigestHex)))
            {
            } else {
                address strategyInit = _getOrDeployStrategyDiamondInit();
                bytes memory strategyInitCalldata = abi.encodeCall(CVStrategyDiamondInit.init, ());
                if (vm.envOr("ESTIMATE_FACTORY_GAS", false)) {
                    bytes memory setStrategyFacetsCalldata =
                        abi.encodeCall(RegistryFactory.setStrategyFacets, (cvCuts, strategyInit, strategyInitCalldata));
                    _logEstimatedTxGas("setStrategyFacets", registryFactoryProxy, setStrategyFacetsCalldata);
                }
                if (splitFactoryFacetWrites) {
                    _setStrategyFacetsSplit(registryFactory, cvCuts, strategyInit, strategyInitCalldata);
                } else {
                    registryFactory.setStrategyFacets(cvCuts, strategyInit, strategyInitCalldata);
                }
                _writeNetworkString(".FACTORY_STATE.STRATEGY_CUTS_DIGEST", strategyCutsDigestHex);
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetPauseController) {
            registryFactory.setGlobalPauseController(pauseController);
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetRegistryTemplate) {
            if (registryImplementation == address(0)) revert("missing registry community implementation");
            registryFactory.setRegistryCommunityTemplate(registryImplementation);
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetStrategyTemplate) {
            if (strategyImplementation == address(0)) revert("missing strategy implementation");
            registryFactory.setStrategyTemplate(strategyImplementation);
        }
    }

    function _upgradeRegistryCommunities(
        string memory networkJson,
        address registryImplementation,
        address strategyImplementation,
        IDiamond.FacetCut[] memory cvCuts,
        IDiamond.FacetCut[] memory communityCuts
    ) internal {
        address[] memory registryCommunityProxies = networkJson.readAddressArray(
            getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES")
        );
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity registryCommunity = RegistryCommunity(payable(address(registryCommunityProxies[i])));

            registryCommunity.upgradeTo(registryImplementation);
            registryCommunity.setStrategyTemplate(strategyImplementation);

            IDiamond.FacetCut[] memory staleCommunityRemovals =
                _buildStaleSelectorRemovalCuts(registryCommunityProxies[i], communityCuts);
            IDiamond.FacetCut[] memory changedCommunityCuts =
                _buildChangedFacetCuts(registryCommunityProxies[i], communityCuts);

            uint256 totalCuts = staleCommunityRemovals.length + changedCommunityCuts.length;
            if (totalCuts > 0) {
                IDiamond.FacetCut[] memory allCuts = new IDiamond.FacetCut[](totalCuts);
                uint256 cutIndex = 0;
                for (uint256 j = 0; j < staleCommunityRemovals.length; j++) {
                    allCuts[cutIndex] = staleCommunityRemovals[j];
                    cutIndex++;
                }
                for (uint256 j = 0; j < changedCommunityCuts.length; j++) {
                    allCuts[cutIndex] = changedCommunityCuts[j];
                    cutIndex++;
                }

                IDiamondCut(registryCommunityProxies[i])
                    .diamondCut(
                        allCuts,
                        address(new RegistryCommunityDiamondInit()),
                        abi.encodeCall(RegistryCommunityDiamondInit.init, ())
                    );
            } else {
            }
        }
    }

    function _upgradeStrategies(
        string memory networkJson,
        address strategyImplementation,
        IDiamond.FacetCut[] memory cvCuts
    ) internal {
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategy cvStrategy = CVStrategy(payable(address(cvStrategyProxies[i])));
            cvStrategy.upgradeTo(strategyImplementation); // DOESNT VALIDATE SAFE UPGRADING

            IDiamond.FacetCut[] memory staleStrategyRemovals =
                _buildStaleSelectorRemovalCuts(cvStrategyProxies[i], cvCuts);
            IDiamond.FacetCut[] memory changedStrategyCuts =
                _buildChangedFacetCuts(cvStrategyProxies[i], cvCuts);

            uint256 totalCuts = staleStrategyRemovals.length + changedStrategyCuts.length;
            if (totalCuts > 0) {
                IDiamond.FacetCut[] memory allCuts = new IDiamond.FacetCut[](totalCuts);
                uint256 cutIndex = 0;
                for (uint256 j = 0; j < staleStrategyRemovals.length; j++) {
                    allCuts[cutIndex] = staleStrategyRemovals[j];
                    cutIndex++;
                }
                for (uint256 j = 0; j < changedStrategyCuts.length; j++) {
                    allCuts[cutIndex] = changedStrategyCuts[j];
                    cutIndex++;
                }

                IDiamondCut(cvStrategyProxies[i]).diamondCut(
                    allCuts,
                    address(new CVStrategyDiamondInit()),
                    abi.encodeCall(CVStrategyDiamondInit.init, ())
                );
            } else {
            }
        }
    }

    function _setCommunityFacetsSplit(
        RegistryFactory registryFactory,
        IDiamond.FacetCut[] memory communityCuts,
        address communityInit,
        bytes memory communityInitCalldata
    ) internal {
        for (uint256 i = 0; i < communityCuts.length; i++) {
            registryFactory.upsertCommunityFacetCut(
                i, communityCuts[i].facetAddress, communityCuts[i].action, communityCuts[i].functionSelectors
            );
        }
        registryFactory.setCommunityFacetInit(communityInit, communityInitCalldata);
    }

    function _setStrategyFacetsSplit(
        RegistryFactory registryFactory,
        IDiamond.FacetCut[] memory cvCuts,
        address strategyInit,
        bytes memory strategyInitCalldata
    ) internal {
        for (uint256 i = 0; i < cvCuts.length; i++) {
            registryFactory.upsertStrategyFacetCut(
                i, cvCuts[i].facetAddress, cvCuts[i].action, cvCuts[i].functionSelectors
            );
        }
        registryFactory.setStrategyFacetInit(strategyInit, strategyInitCalldata);
    }

    function _parsePhase(string memory phase) internal pure returns (Phase) {
        bytes32 phaseHash = keccak256(bytes(phase));
        if (phaseHash == keccak256(bytes("all"))) return Phase.All;
        if (phaseHash == keccak256(bytes("factory"))) return Phase.Factory;
        if (phaseHash == keccak256(bytes("communities"))) return Phase.Communities;
        if (phaseHash == keccak256(bytes("strategies"))) return Phase.Strategies;
        revert("invalid phase, use all|factory|communities|strategies");
    }

    function _parseFactoryAction(string memory action) internal pure returns (FactoryAction) {
        bytes32 actionHash = keccak256(bytes(action));
        if (actionHash == keccak256(bytes("all"))) return FactoryAction.All;
        if (actionHash == keccak256(bytes("upgrade_impl"))) return FactoryAction.UpgradeImpl;
        if (actionHash == keccak256(bytes("set_community_facets"))) return FactoryAction.SetCommunityFacets;
        if (actionHash == keccak256(bytes("set_strategy_facets"))) return FactoryAction.SetStrategyFacets;
        if (actionHash == keccak256(bytes("set_pause_controller"))) return FactoryAction.SetPauseController;
        if (actionHash == keccak256(bytes("set_registry_template"))) return FactoryAction.SetRegistryTemplate;
        if (actionHash == keccak256(bytes("set_strategy_template"))) return FactoryAction.SetStrategyTemplate;
        revert(
            "invalid factory action, use all|upgrade_impl|set_community_facets|set_strategy_facets|set_pause_controller|set_registry_template|set_strategy_template"
        );
    }

    function _getOrDeployCommunityDiamondInit() internal returns (address) {
        string memory key = ".INITS.REGISTRY_COMMUNITY_DIAMOND_INIT";
        address cached = _readAddressOrZero(key);
        if (cached != address(0) && cached.code.length > 0) {
            return cached;
        }

        RegistryCommunityDiamondInit deployed = new RegistryCommunityDiamondInit();
        _writeNetworkAddress(key, address(deployed));
        return address(deployed);
    }

    function _getOrDeployStrategyDiamondInit() internal returns (address) {
        string memory key = ".INITS.CV_STRATEGY_DIAMOND_INIT";
        address cached = _readAddressOrZero(key);
        if (cached != address(0) && cached.code.length > 0) {
            return cached;
        }

        CVStrategyDiamondInit deployed = new CVStrategyDiamondInit();
        _writeNetworkAddress(key, address(deployed));
        return address(deployed);
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

    function _buildStaleSelectorRemovalCuts(address diamondProxy, IDiamond.FacetCut[] memory desiredCuts)
        internal
        view
        returns (IDiamond.FacetCut[] memory removalCuts)
    {
        address[] memory candidateFacets = new address[](desiredCuts.length * 8);
        uint256 candidateCount = 0;

        for (uint256 i = 0; i < desiredCuts.length; i++) {
            bytes4[] memory selectors = desiredCuts[i].functionSelectors;
            for (uint256 j = 0; j < selectors.length; j++) {
                bytes4 selector = selectors[j];
                address currentFacet = IDiamondLoupe(diamondProxy).facetAddress(selector);
                if (
                    currentFacet != address(0) && currentFacet != desiredCuts[i].facetAddress
                        && !_containsAddress(candidateFacets, candidateCount, currentFacet)
                ) {
                    candidateFacets[candidateCount] = currentFacet;
                    candidateCount++;
                }
            }
        }

        removalCuts = new IDiamond.FacetCut[](candidateCount);
        uint256 removalCount = 0;
        for (uint256 i = 0; i < candidateCount; i++) {
            bytes4[] memory currentSelectors = IDiamondLoupe(diamondProxy).facetFunctionSelectors(candidateFacets[i]);
            bytes4[] memory staleSelectors = new bytes4[](currentSelectors.length);
            uint256 staleCount = 0;

            for (uint256 j = 0; j < currentSelectors.length; j++) {
                if (!_selectorInDesiredCuts(currentSelectors[j], desiredCuts)) {
                    staleSelectors[staleCount] = currentSelectors[j];
                    staleCount++;
                }
            }

            if (staleCount == 0) continue;

            bytes4[] memory selectorsToRemove = new bytes4[](staleCount);
            for (uint256 j = 0; j < staleCount; j++) {
                selectorsToRemove[j] = staleSelectors[j];
            }

            removalCuts[removalCount] = IDiamond.FacetCut({
                facetAddress: address(0),
                action: IDiamond.FacetCutAction.Remove,
                functionSelectors: selectorsToRemove
            });
            removalCount++;
        }

        if (removalCount == candidateCount) return removalCuts;

        IDiamond.FacetCut[] memory trimmed = new IDiamond.FacetCut[](removalCount);
        for (uint256 i = 0; i < removalCount; i++) {
            trimmed[i] = removalCuts[i];
        }
        return trimmed;
    }

    function _selectorInDesiredCuts(bytes4 selector, IDiamond.FacetCut[] memory desiredCuts) internal pure returns (bool) {
        for (uint256 i = 0; i < desiredCuts.length; i++) {
            bytes4[] memory selectors = desiredCuts[i].functionSelectors;
            for (uint256 j = 0; j < selectors.length; j++) {
                if (selectors[j] == selector) {
                    return true;
                }
            }
        }
        return false;
    }

    function _containsAddress(address[] memory values, uint256 length, address value) internal pure returns (bool) {
        for (uint256 i = 0; i < length; i++) {
            if (values[i] == value) {
                return true;
            }
        }
        return false;
    }

    function _buildFacetCuts() internal returns (FacetCuts memory cuts) {
        DiamondLoupeFacet loupeFacet = _deployDiamondLoupeFacet();
        cuts.cvCuts = _buildCVCutsWithFreshFacets(loupeFacet);
        cuts.communityCuts = _buildCommunityCutsWithFreshFacets(loupeFacet);
    }

    function _buildFacetCutsFromSnapshot() internal returns (FacetCuts memory cuts) {

        DiamondLoupeFacet loupeFacet = DiamondLoupeFacet(
            _requireSnapshotFacet(
                ".FACETS.DIAMOND_LOUPE", "DIAMOND_LOUPE", "src/diamonds/facets/DiamondLoupeFacet.sol:DiamondLoupeFacet"
            )
        );

        cuts.cvCuts = _buildCVFacetCuts(
            CVAdminFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_ADMIN", "CV_ADMIN", "src/CVStrategy/facets/CVAdminFacet.sol:CVAdminFacet"
                )
            ),
            CVAllocationFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_ALLOCATION",
                    "CV_ALLOCATION",
                    "src/CVStrategy/facets/CVAllocationFacet.sol:CVAllocationFacet"
                )
            ),
            CVDisputeFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_DISPUTE", "CV_DISPUTE", "src/CVStrategy/facets/CVDisputeFacet.sol:CVDisputeFacet"
                )
            ),
            CVPauseFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_PAUSE", "CV_PAUSE", "src/CVStrategy/facets/CVPauseFacet.sol:CVPauseFacet"
                )
            ),
            CVPowerFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_POWER", "CV_POWER", "src/CVStrategy/facets/CVPowerFacet.sol:CVPowerFacet"
                )
            ),
            CVProposalFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_PROPOSAL", "CV_PROPOSAL", "src/CVStrategy/facets/CVProposalFacet.sol:CVProposalFacet"
                )
            ),
            CVSyncPowerFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_SYNC_POWER",
                    "CV_SYNC_POWER",
                    "src/CVStrategy/facets/CVSyncPowerFacet.sol:CVSyncPowerFacet"
                )
            ),
            CVStreamingFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_STREAMING",
                    "CV_STREAMING",
                    "src/CVStrategy/facets/CVStreamingFacet.sol:CVStreamingFacet"
                )
            ),
            loupeFacet
        );

        cuts.communityCuts = _buildCommunityFacetCuts(
            CommunityAdminFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_ADMIN",
                    "COMMUNITY_ADMIN",
                    "src/RegistryCommunity/facets/CommunityAdminFacet.sol:CommunityAdminFacet"
                )
            ),
            CommunityMemberFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_MEMBER",
                    "COMMUNITY_MEMBER",
                    "src/RegistryCommunity/facets/CommunityMemberFacet.sol:CommunityMemberFacet"
                )
            ),
            CommunityPauseFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_PAUSE",
                    "COMMUNITY_PAUSE",
                    "src/RegistryCommunity/facets/CommunityPauseFacet.sol:CommunityPauseFacet"
                )
            ),
            CommunityPoolFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_POOL",
                    "COMMUNITY_POOL",
                    "src/RegistryCommunity/facets/CommunityPoolFacet.sol:CommunityPoolFacet"
                )
            ),
            CommunityPowerFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_POWER",
                    "COMMUNITY_POWER",
                    "src/RegistryCommunity/facets/CommunityPowerFacet.sol:CommunityPowerFacet"
                )
            ),
            CommunityStrategyFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_STRATEGY",
                    "COMMUNITY_STRATEGY",
                    "src/RegistryCommunity/facets/CommunityStrategyFacet.sol:CommunityStrategyFacet"
                )
            ),
            loupeFacet
        );
    }

    function _buildCVFacetCutsFromSnapshot() internal returns (IDiamond.FacetCut[] memory cvCuts) {
        DiamondLoupeFacet loupeFacet = DiamondLoupeFacet(
            _requireSnapshotFacet(
                ".FACETS.DIAMOND_LOUPE", "DIAMOND_LOUPE", "src/diamonds/facets/DiamondLoupeFacet.sol:DiamondLoupeFacet"
            )
        );
        cvCuts = _buildCVFacetCuts(
            CVAdminFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_ADMIN", "CV_ADMIN", "src/CVStrategy/facets/CVAdminFacet.sol:CVAdminFacet"
                )
            ),
            CVAllocationFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_ALLOCATION",
                    "CV_ALLOCATION",
                    "src/CVStrategy/facets/CVAllocationFacet.sol:CVAllocationFacet"
                )
            ),
            CVDisputeFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_DISPUTE", "CV_DISPUTE", "src/CVStrategy/facets/CVDisputeFacet.sol:CVDisputeFacet"
                )
            ),
            CVPauseFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_PAUSE", "CV_PAUSE", "src/CVStrategy/facets/CVPauseFacet.sol:CVPauseFacet"
                )
            ),
            CVPowerFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_POWER", "CV_POWER", "src/CVStrategy/facets/CVPowerFacet.sol:CVPowerFacet"
                )
            ),
            CVProposalFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_PROPOSAL", "CV_PROPOSAL", "src/CVStrategy/facets/CVProposalFacet.sol:CVProposalFacet"
                )
            ),
            CVSyncPowerFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_SYNC_POWER",
                    "CV_SYNC_POWER",
                    "src/CVStrategy/facets/CVSyncPowerFacet.sol:CVSyncPowerFacet"
                )
            ),
            CVStreamingFacet(
                _requireSnapshotFacet(
                    ".FACETS.CV_STREAMING",
                    "CV_STREAMING",
                    "src/CVStrategy/facets/CVStreamingFacet.sol:CVStreamingFacet"
                )
            ),
            loupeFacet
        );
    }

    function _buildCommunityFacetCutsFromSnapshot() internal returns (IDiamond.FacetCut[] memory communityCuts) {
        DiamondLoupeFacet loupeFacet = DiamondLoupeFacet(
            _requireSnapshotFacet(
                ".FACETS.DIAMOND_LOUPE", "DIAMOND_LOUPE", "src/diamonds/facets/DiamondLoupeFacet.sol:DiamondLoupeFacet"
            )
        );
        communityCuts = _buildCommunityFacetCuts(
            CommunityAdminFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_ADMIN",
                    "COMMUNITY_ADMIN",
                    "src/RegistryCommunity/facets/CommunityAdminFacet.sol:CommunityAdminFacet"
                )
            ),
            CommunityMemberFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_MEMBER",
                    "COMMUNITY_MEMBER",
                    "src/RegistryCommunity/facets/CommunityMemberFacet.sol:CommunityMemberFacet"
                )
            ),
            CommunityPauseFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_PAUSE",
                    "COMMUNITY_PAUSE",
                    "src/RegistryCommunity/facets/CommunityPauseFacet.sol:CommunityPauseFacet"
                )
            ),
            CommunityPoolFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_POOL",
                    "COMMUNITY_POOL",
                    "src/RegistryCommunity/facets/CommunityPoolFacet.sol:CommunityPoolFacet"
                )
            ),
            CommunityPowerFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_POWER",
                    "COMMUNITY_POWER",
                    "src/RegistryCommunity/facets/CommunityPowerFacet.sol:CommunityPowerFacet"
                )
            ),
            CommunityStrategyFacet(
                _requireSnapshotFacet(
                    ".FACETS.COMMUNITY_STRATEGY",
                    "COMMUNITY_STRATEGY",
                    "src/RegistryCommunity/facets/CommunityStrategyFacet.sol:CommunityStrategyFacet"
                )
            ),
            loupeFacet
        );
    }

    function _requireSnapshotFacet(string memory key, string memory label, string memory artifactId)
        internal
        returns (address addr)
    {
        bytes32 expectedCodeHash = _runtimeCodeHash(artifactId);
        addr = _readAddressOrZero(key);

        if (addr == address(0)) {
            return _deployFacetForSnapshot(key, label);
        }

        if (addr.code.length == 0) {
            return _deployFacetForSnapshot(key, label);
        }

        if (addr.codehash != expectedCodeHash) {
            return _deployFacetForSnapshot(key, label);
        }
    }

    function _requireSnapshotAddress(string memory key, string memory label) internal returns (address addr) {
        addr = _readAddressOrZero(key);
        if (addr == address(0)) {
            revert(string.concat("missing facet snapshot: ", label));
        }
        if (addr.code.length == 0) {
            revert(string.concat("facet snapshot has no code: ", label));
        }
    }

    function _deployFacetForSnapshot(string memory key, string memory label) internal returns (address) {
        bytes32 keyHash = keccak256(bytes(key));

        if (keyHash == keccak256(bytes(".FACETS.DIAMOND_LOUPE"))) return address(_deployDiamondLoupeFacet());
        if (keyHash == keccak256(bytes(".FACETS.CV_ADMIN"))) return address(_deployCVAdminFacet());
        if (keyHash == keccak256(bytes(".FACETS.CV_ALLOCATION"))) return address(_deployCVAllocationFacet());
        if (keyHash == keccak256(bytes(".FACETS.CV_DISPUTE"))) return address(_deployCVDisputeFacet());
        if (keyHash == keccak256(bytes(".FACETS.CV_PAUSE"))) return address(_deployCVPauseFacet());
        if (keyHash == keccak256(bytes(".FACETS.CV_POWER"))) return address(_deployCVPowerFacet());
        if (keyHash == keccak256(bytes(".FACETS.CV_PROPOSAL"))) return address(_deployCVProposalFacet());
        if (keyHash == keccak256(bytes(".FACETS.CV_SYNC_POWER"))) return address(_deployCVSyncPowerFacet());
        if (keyHash == keccak256(bytes(".FACETS.CV_STREAMING"))) return address(_deployCVStreamingFacet());
        if (keyHash == keccak256(bytes(".FACETS.COMMUNITY_ADMIN"))) return address(_deployCommunityAdminFacet());
        if (keyHash == keccak256(bytes(".FACETS.COMMUNITY_MEMBER"))) return address(_deployCommunityMemberFacet());
        if (keyHash == keccak256(bytes(".FACETS.COMMUNITY_PAUSE"))) return address(_deployCommunityPauseFacet());
        if (keyHash == keccak256(bytes(".FACETS.COMMUNITY_POOL"))) return address(_deployCommunityPoolFacet());
        if (keyHash == keccak256(bytes(".FACETS.COMMUNITY_POWER"))) return address(_deployCommunityPowerFacet());
        if (keyHash == keccak256(bytes(".FACETS.COMMUNITY_STRATEGY"))) return address(_deployCommunityStrategyFacet());

        revert(string.concat("unsupported facet snapshot key: ", label));
    }

    function _buildCVCutsWithFreshFacets(DiamondLoupeFacet loupeFacet) internal returns (IDiamond.FacetCut[] memory) {
        return _buildCVFacetCuts(
            _deployCVAdminFacet(),
            _deployCVAllocationFacet(),
            _deployCVDisputeFacet(),
            _deployCVPauseFacet(),
            _deployCVPowerFacet(),
            _deployCVProposalFacet(),
            _deployCVSyncPowerFacet(),
            _deployCVStreamingFacet(),
            loupeFacet
        );
    }

    function _buildCommunityCutsWithFreshFacets(DiamondLoupeFacet loupeFacet)
        internal
        returns (IDiamond.FacetCut[] memory)
    {
        return _buildCommunityFacetCuts(
            _deployCommunityAdminFacet(),
            _deployCommunityMemberFacet(),
            _deployCommunityPauseFacet(),
            _deployCommunityPoolFacet(),
            _deployCommunityPowerFacet(),
            _deployCommunityStrategyFacet(),
            loupeFacet
        );
    }

    function _deployCVAdminFacet() internal returns (CVAdminFacet) {
        string memory key = ".FACETS.CV_ADMIN";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/CVStrategy/facets/CVAdminFacet.sol:CVAdminFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CVAdminFacet");
        if (reused) return CVAdminFacet(cached);
        CVAdminFacet deployed = new CVAdminFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCVAllocationFacet() internal returns (CVAllocationFacet) {
        string memory key = ".FACETS.CV_ALLOCATION";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/CVStrategy/facets/CVAllocationFacet.sol:CVAllocationFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CVAllocationFacet");
        if (reused) return CVAllocationFacet(cached);
        CVAllocationFacet deployed = new CVAllocationFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCVDisputeFacet() internal returns (CVDisputeFacet) {
        string memory key = ".FACETS.CV_DISPUTE";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/CVStrategy/facets/CVDisputeFacet.sol:CVDisputeFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CVDisputeFacet");
        if (reused) return CVDisputeFacet(cached);
        CVDisputeFacet deployed = new CVDisputeFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCVPauseFacet() internal returns (CVPauseFacet) {
        string memory key = ".FACETS.CV_PAUSE";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/CVStrategy/facets/CVPauseFacet.sol:CVPauseFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CVPauseFacet");
        if (reused) return CVPauseFacet(cached);
        CVPauseFacet deployed = new CVPauseFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCVPowerFacet() internal returns (CVPowerFacet) {
        string memory key = ".FACETS.CV_POWER";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/CVStrategy/facets/CVPowerFacet.sol:CVPowerFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CVPowerFacet");
        if (reused) return CVPowerFacet(cached);
        CVPowerFacet deployed = new CVPowerFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCVProposalFacet() internal returns (CVProposalFacet) {
        string memory key = ".FACETS.CV_PROPOSAL";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/CVStrategy/facets/CVProposalFacet.sol:CVProposalFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CVProposalFacet");
        if (reused) return CVProposalFacet(cached);
        CVProposalFacet deployed = new CVProposalFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCVSyncPowerFacet() internal returns (CVSyncPowerFacet) {
        string memory key = ".FACETS.CV_SYNC_POWER";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/CVStrategy/facets/CVSyncPowerFacet.sol:CVSyncPowerFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CVSyncPowerFacet");
        if (reused) return CVSyncPowerFacet(cached);
        CVSyncPowerFacet deployed = new CVSyncPowerFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCVStreamingFacet() internal returns (CVStreamingFacet) {
        string memory key = ".FACETS.CV_STREAMING";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/CVStrategy/facets/CVStreamingFacet.sol:CVStreamingFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CVStreamingFacet");
        if (reused) return CVStreamingFacet(cached);
        CVStreamingFacet deployed = new CVStreamingFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCommunityAdminFacet() internal returns (CommunityAdminFacet) {
        string memory key = ".FACETS.COMMUNITY_ADMIN";
        bytes32 expectedCodeHash =
            _runtimeCodeHash("src/RegistryCommunity/facets/CommunityAdminFacet.sol:CommunityAdminFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CommunityAdminFacet");
        if (reused) return CommunityAdminFacet(cached);
        CommunityAdminFacet deployed = new CommunityAdminFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCommunityMemberFacet() internal returns (CommunityMemberFacet) {
        string memory key = ".FACETS.COMMUNITY_MEMBER";
        bytes32 expectedCodeHash =
            _runtimeCodeHash("src/RegistryCommunity/facets/CommunityMemberFacet.sol:CommunityMemberFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CommunityMemberFacet");
        if (reused) return CommunityMemberFacet(cached);
        CommunityMemberFacet deployed = new CommunityMemberFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCommunityPauseFacet() internal returns (CommunityPauseFacet) {
        string memory key = ".FACETS.COMMUNITY_PAUSE";
        bytes32 expectedCodeHash =
            _runtimeCodeHash("src/RegistryCommunity/facets/CommunityPauseFacet.sol:CommunityPauseFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CommunityPauseFacet");
        if (reused) return CommunityPauseFacet(cached);
        CommunityPauseFacet deployed = new CommunityPauseFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCommunityPoolFacet() internal returns (CommunityPoolFacet) {
        string memory key = ".FACETS.COMMUNITY_POOL";
        bytes32 expectedCodeHash =
            _runtimeCodeHash("src/RegistryCommunity/facets/CommunityPoolFacet.sol:CommunityPoolFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CommunityPoolFacet");
        if (reused) return CommunityPoolFacet(cached);
        CommunityPoolFacet deployed = new CommunityPoolFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCommunityPowerFacet() internal returns (CommunityPowerFacet) {
        string memory key = ".FACETS.COMMUNITY_POWER";
        bytes32 expectedCodeHash =
            _runtimeCodeHash("src/RegistryCommunity/facets/CommunityPowerFacet.sol:CommunityPowerFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CommunityPowerFacet");
        if (reused) return CommunityPowerFacet(cached);
        CommunityPowerFacet deployed = new CommunityPowerFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployCommunityStrategyFacet() internal returns (CommunityStrategyFacet) {
        string memory key = ".FACETS.COMMUNITY_STRATEGY";
        bytes32 expectedCodeHash =
            _runtimeCodeHash("src/RegistryCommunity/facets/CommunityStrategyFacet.sol:CommunityStrategyFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "CommunityStrategyFacet");
        if (reused) return CommunityStrategyFacet(cached);
        CommunityStrategyFacet deployed = new CommunityStrategyFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _deployDiamondLoupeFacet() internal returns (DiamondLoupeFacet) {
        string memory key = ".FACETS.DIAMOND_LOUPE";
        bytes32 expectedCodeHash = _runtimeCodeHash("src/diamonds/facets/DiamondLoupeFacet.sol:DiamondLoupeFacet");
        (address cached, bool reused) = _reuseCachedAddress(key, expectedCodeHash, "DiamondLoupeFacet");
        if (reused) return DiamondLoupeFacet(cached);
        DiamondLoupeFacet deployed = new DiamondLoupeFacet();
        _writeNetworkAddress(key, address(deployed));
        return deployed;
    }

    function _reuseCachedAddress(string memory key, bytes32 expectedCodeHash, string memory label)
        internal
        returns (address cached, bool reused)
    {
        if (vm.envOr("FORCE_FACETS", false)) {
            return (address(0), false);
        }

        cached = _readAddressOrZero(key);
        if (cached == address(0)) {
            return (address(0), false);
        }

        if (cached.code.length == 0) {
            return (address(0), false);
        }

        if (cached.codehash != expectedCodeHash) {
            return (address(0), false);
        }

        return (cached, true);
    }

    function _readAddressOrZero(string memory key) internal returns (address) {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory command = string.concat(
            "jq -r '(.networks[] | select(.name==\"", CURRENT_NETWORK, "\") | ", key, " // empty)' ", path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        bytes memory result = _ffiCall("readAddressOrZero", inputs);
        // vm.ffi hex-decodes stdout when it starts with "0x", so jq can return
        // either raw 20 bytes or the ASCII form. Handle both.
        if (result.length == 20) {
            return address(bytes20(result));
        }
        string memory value = _trim(string(result));
        if (bytes(value).length == 0) return address(0);
        if (keccak256(bytes(value)) == keccak256(bytes("null"))) return address(0);
        return _parseAddress(value);
    }

    function _readStringOrEmpty(string memory key) internal returns (string memory) {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory command = string.concat(
            "v=$(jq -r '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            " // empty)' ",
            path,
            "); if [ -n \"$v\" ]; then echo \"str:$v\"; fi"
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        bytes memory result = _ffiCall("readStringOrEmpty", inputs);
        string memory value = _trim(string(result));
        if (bytes(value).length == 0) return "";

        bytes memory valueBytes = bytes(value);
        if (valueBytes.length < 4) return "";
        if (valueBytes[0] != "s" || valueBytes[1] != "t" || valueBytes[2] != "r" || valueBytes[3] != ":") return "";

        bytes memory trimmed = new bytes(valueBytes.length - 4);
        for (uint256 i = 0; i < trimmed.length; i++) {
            trimmed[i] = valueBytes[i + 4];
        }
        return string(trimmed);
    }

    function _writeNetworkAddress(string memory key, address value) internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory tmpPath = string.concat(root, "/pkg/contracts/config/.networks.tmp.json");
        string memory command = string.concat(
            "jq '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            ") = \"",
            _addressToString(value),
            "\"' ",
            path,
            " > ",
            tmpPath,
            " && mv ",
            tmpPath,
            " ",
            path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        _ffiCall("writeNetworkAddress", inputs);
    }

    function _writeNetworkString(string memory key, string memory value) internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory tmpPath = string.concat(root, "/pkg/contracts/config/.networks.tmp.json");
        string memory command = string.concat(
            "jq '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            ") = \"",
            value,
            "\"' ",
            path,
            " > ",
            tmpPath,
            " && mv ",
            tmpPath,
            " ",
            path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        _ffiCall("writeNetworkString", inputs);
    }

    function _ffiCall(string memory label, string[] memory inputs) internal returns (bytes memory result) {
        result = vm.ffi(inputs);
    }

    function _runtimeCodeHash(string memory artifactId) internal returns (bytes32) {
        bytes memory deployedCode = vm.getDeployedCode(artifactId);
        if (deployedCode.length == 0) {
            revert("missing deployed bytecode for artifact");
        }
        return keccak256(deployedCode);
    }

    function _proxyImplementationAddress(address proxy) internal view returns (address) {
        bytes32 raw = vm.load(proxy, IMPLEMENTATION_SLOT);
        return address(uint160(uint256(raw)));
    }

    function _isRegistryFactoryProxyAbiCompatible(address proxy) internal view returns (bool) {
        bytes4 nonceSelector = bytes4(keccak256("nonce()"));
        (bool ok,) = proxy.staticcall(abi.encodeWithSelector(nonceSelector));
        return ok;
    }

    function _facetCutsDigest(IDiamond.FacetCut[] memory cuts) internal pure returns (bytes32) {
        bytes memory packed;
        for (uint256 i = 0; i < cuts.length; i++) {
            packed =
                abi.encodePacked(packed, cuts[i].facetAddress, uint8(cuts[i].action), cuts[i].functionSelectors.length);
            for (uint256 j = 0; j < cuts[i].functionSelectors.length; j++) {
                packed = abi.encodePacked(packed, cuts[i].functionSelectors[j]);
            }
        }
        return keccak256(packed);
    }

    function _logEstimatedTxGas(string memory label, address to, bytes memory data) internal {
        string memory rpcUrl = _rpcUrlForCurrentNetwork();
        if (bytes(rpcUrl).length == 0) {
            return;
        }

        string memory command = string.concat(
            "cast estimate --rpc-url '",
            rpcUrl,
            "' --from ",
            _addressToString(pool_admin()),
            " --to ",
            _addressToString(to),
            " --data ",
            _bytesToHex(data),
            " 2>/dev/null || true"
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;

        bytes memory result = _ffiCall("estimateTxGas", inputs);
        string memory value = _trim(string(result));
        if (bytes(value).length == 0) {
            return;
        }

    }

    function _rpcUrlForCurrentNetwork() internal view returns (string memory) {
        bytes32 networkHash = keccak256(bytes(CURRENT_NETWORK));
        if (networkHash == keccak256(bytes("opsepolia"))) {
            return vm.envOr("RPC_URL_OP_TESTNET", string(""));
        }
        if (networkHash == keccak256(bytes("arbsepolia"))) {
            return vm.envOr("RPC_URL_ARB_TESTNET", string(""));
        }
        if (networkHash == keccak256(bytes("ethsepolia"))) {
            return vm.envOr("RPC_URL_SEP_TESTNET", string(""));
        }
        return "";
    }

    function _trim(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        uint256 start = 0;
        uint256 end = inputBytes.length;
        while (start < end && _isWhitespace(inputBytes[start])) {
            start++;
        }
        while (end > start && _isWhitespace(inputBytes[end - 1])) {
            end--;
        }
        bytes memory trimmed = new bytes(end - start);
        for (uint256 i = 0; i < trimmed.length; i++) {
            trimmed[i] = inputBytes[start + i];
        }
        return string(trimmed);
    }

    function _isWhitespace(bytes1 char) internal pure returns (bool) {
        return char == 0x20 || char == 0x0a || char == 0x0d || char == 0x09;
    }

    function _parseAddress(string memory value) internal pure returns (address) {
        bytes memory data = bytes(value);
        if (data.length != 42 || data[0] != "0" || data[1] != "x") {
            return address(0);
        }
        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            uint8 nibble = _fromHexChar(data[i]);
            if (nibble > 15) {
                return address(0);
            }
            result = (result << 4) | uint160(nibble);
        }
        return address(result);
    }

    function _fromHexChar(bytes1 char) internal pure returns (uint8) {
        uint8 value = uint8(char);
        if (value >= 48 && value <= 57) return value - 48;
        if (value >= 65 && value <= 70) return value - 55;
        if (value >= 97 && value <= 102) return value - 87;
        return 255;
    }

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    function _bytesToHex(bytes memory data) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }

    function _bytes32ToHex(bytes32 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }

    function _buildCVFacetCuts(
        CVAdminFacet cvAdminFacet,
        CVAllocationFacet cvAllocationFacet,
        CVDisputeFacet cvDisputeFacet,
        CVPauseFacet cvPauseFacet,
        CVPowerFacet cvPowerFacet,
        CVProposalFacet cvProposalFacet,
        CVSyncPowerFacet cvSyncPowerFacet,
        CVStreamingFacet cvStreamingFacet,
        DiamondLoupeFacet loupeFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = _buildFacetCuts(
            cvAdminFacet,
            cvAllocationFacet,
            cvDisputeFacet,
            cvPauseFacet,
            cvPowerFacet,
            cvProposalFacet,
            cvSyncPowerFacet
        );
        cuts = new IDiamond.FacetCut[](9);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 7; i++) {
            cuts[i + 1] = baseCuts[i];
        }
        bytes4[] memory streamingSelectors = new bytes4[](1);
        streamingSelectors[0] = CVStreamingFacet.rebalance.selector;
        cuts[8] = IDiamond.FacetCut({
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
