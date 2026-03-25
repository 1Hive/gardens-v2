// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UpgradeCVMultichainBase.s.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";

contract UpgradeCVMultichainScript is UpgradeCVMultichainBase {
    using stdJson for string;
    uint256 internal constant EXPECTED_COMMUNITY_FACET_COUNT = 7;
    uint256 internal constant EXPECTED_STRATEGY_FACET_COUNT = 9;
    bytes4 internal constant COMMUNITY_CREATE_POOL_SELECTOR_V0_2 = bytes4(
        keccak256(
            "createPool(address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,uint256,address[],address,uint256),(uint256,string))"
        )
    );
    bytes4 internal constant COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_2 = bytes4(
        keccak256(
            "createPool(address,address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,uint256,address[],address,uint256),(uint256,string))"
        )
    );
    bytes4 internal constant COMMUNITY_CREATE_POOL_SELECTOR_V0_3 = bytes4(
        keccak256(
            "createPool(address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))"
        )
    );
    bytes4 internal constant COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3 = bytes4(
        keccak256(
            "createPool(address,address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))"
        )
    );

    struct UpgradeContext {
        address registryFactoryImplementation;
        address registryImplementation;
        address strategyImplementation;
        address registryFactoryProxy;
        address pauseController;
        address streamingEscrowFactory;
        IDiamond.FacetCut[] cvCuts;
        IDiamond.FacetCut[] communityCuts;
    }

    struct CommunityUpgradeOptions {
        bool skipUpgradeTo;
        bool skipStrategyTemplate;
        bool skipDiamondCut;
        bool diamondCutBeforeUpgrade;
        address communityInit;
        bytes communityInitCalldata;
    }

    struct StrategyUpgradeOptions {
        bool skipUpgradeTo;
        bool skipDiamondCut;
        bool diamondCutBeforeUpgrade;
        address strategyInit;
        bytes strategyInitCalldata;
    }

    struct StrategyFacetSnapshot {
        address loupeFacet;
        address adminFacet;
        address allocationFacet;
        address disputeFacet;
        address pauseFacet;
        address powerFacet;
        address proposalFacet;
        address syncPowerFacet;
        address streamingFacet;
    }

    struct CommunityFacetSnapshot {
        address loupeFacet;
        address adminFacet;
        address memberFacet;
        address pauseFacet;
        address poolFacet;
        address powerFacet;
        address strategyFacet;
    }

    function runCurrentNetwork(string memory networkJson) public override {
        bool reuseConfiguredImplementations = _flagEnabled("REUSE_CONFIGURED_IMPLEMENTATIONS");

        UpgradeContext memory context;
        context.pauseController = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
        if (context.pauseController == address(0)) revert("PAUSE_CONTROLLER not set in networks.json");
        context.streamingEscrowFactory = _readAddressOrZero(".ENVS.STREAMING_ESCROW_FACTORY");
        context.registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));

        if (!_flagEnabled("SKIP_PREFLIGHT")) {
            _runPreflightChecks(
                context,
                networkJson,
                _shouldDoFactory(),
                _shouldDoCommunities(),
                _shouldDoStrategies()
            );
        }

        context.registryFactoryImplementation = _shouldDeployFactoryImplementation()
            ? _resolveRegistryFactoryImplementation(reuseConfiguredImplementations)
            : address(0);
        context.registryImplementation = _shouldDeployRegistryImplementation()
            ? _resolveRegistryImplementation(reuseConfiguredImplementations)
            : address(0);
        context.strategyImplementation = _shouldDeployStrategyImplementation()
            ? _resolveStrategyImplementation(reuseConfiguredImplementations)
            : address(0);
        context = _populateDesiredCuts(context, networkJson);

        if (_shouldDoFactory()) {
            _executeRegistryFactoryUpgrades(context);
            _syncRegistryFactoryImplementationFromLive(context.registryFactoryProxy);
        }
        if (_shouldDoCommunities()) {
            _executeCommunityUpgrades(context, networkJson);
            _syncFactoryCommunityState(context);
            _syncCommunityImplementationFromLive(networkJson);
        }
        if (_shouldDoStrategies()) {
            _executeStrategyUpgrades(context, networkJson);
            _syncFactoryStrategyState(context);
            _syncStrategyImplementationFromLive(networkJson);
        }
    }

    function _populateDesiredCuts(UpgradeContext memory context, string memory networkJson)
        internal
        returns (UpgradeContext memory)
    {
        bool doCommunities = _shouldDoCommunities();
        bool doStrategies = _shouldDoStrategies();
        bool needFactoryFacetCuts = _shouldDoFactory()
            && (_isFactoryAction(FactoryAction.SetCommunityFacets) || _isFactoryAction(FactoryAction.SetStrategyFacets));
        bool skipFacetDeployment = _skipFacetDeployment();
        bool useLiveCommunityFacets = _flagEnabled("USE_LIVE_COMMUNITY_FACETS");

        if (doCommunities) {
            FacetCuts memory facetCuts = skipFacetDeployment ? _buildFacetCutsFromSnapshot() : _buildFacetCuts();
            context.cvCuts = facetCuts.cvCuts;
            context.communityCuts = facetCuts.communityCuts;
        } else if (doStrategies) {
            context.cvCuts =
                skipFacetDeployment ? _buildCVFacetCutsFromSnapshot() : _buildCVCutsWithFreshFacets(_deployDiamondLoupeFacet());
        } else if (needFactoryFacetCuts) {
            if (factoryAction == FactoryAction.SetCommunityFacets) {
                if (useLiveCommunityFacets) {
                    context.communityCuts = _buildCommunityFacetCutsFromLive(networkJson);
                } else {
                    context.communityCuts = skipFacetDeployment
                        ? _buildCommunityFacetCutsFromSnapshot()
                        : _buildCommunityCutsWithFreshFacets(_deployDiamondLoupeFacet());
                }
            } else if (factoryAction == FactoryAction.SetStrategyFacets) {
                context.cvCuts = skipFacetDeployment
                    ? _buildCVFacetCutsFromSnapshot()
                    : _buildCVCutsWithFreshFacets(_deployDiamondLoupeFacet());
            } else {
                FacetCuts memory facetCuts = skipFacetDeployment ? _buildFacetCutsFromSnapshot() : _buildFacetCuts();
                context.cvCuts = facetCuts.cvCuts;
                context.communityCuts = facetCuts.communityCuts;
            }
        }
        return context;
    }

    function _buildCommunityFacetCutsFromLive(string memory networkJson)
        internal
        returns (IDiamond.FacetCut[] memory cuts)
    {
        address[] memory proxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        if (proxies.length == 0) {
            RegistryFactory registryFactory = RegistryFactory(payable(networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"))));
            (IDiamond.FacetCut[] memory currentCuts,,) = registryFactory.getCommunityFacets();
            require(currentCuts.length > 0, "no live community cuts");
            return _normalizeCommunityPoolFacetCuts(currentCuts);
        }

        address referenceProxy = proxies[0];
        address loupeFacet = IDiamondLoupe(referenceProxy).facetAddress(IDiamondLoupe.facets.selector);
        address adminFacet = IDiamondLoupe(referenceProxy).facetAddress(CommunityAdminFacet.setStrategyTemplate.selector);
        address memberFacet = IDiamondLoupe(referenceProxy).facetAddress(CommunityMemberFacet.stakeAndRegisterMember.selector);
        address pauseFacet =
            IDiamondLoupe(referenceProxy).facetAddress(bytes4(keccak256("setPauseController(address)")));
        address powerFacet =
            IDiamondLoupe(referenceProxy).facetAddress(CommunityPowerFacet.activateMemberInStrategy.selector);
        address strategyFacet =
            IDiamondLoupe(referenceProxy).facetAddress(CommunityStrategyFacet.addStrategyByPoolId.selector);
        (address poolFacet, bytes4[] memory poolSelectors) = _resolveCommunityPoolFacetFromLive(referenceProxy);

        cuts = new IDiamond.FacetCut[](7);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: loupeFacet,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: IDiamondLoupe(referenceProxy).facetFunctionSelectors(loupeFacet)
        });
        cuts[1] = IDiamond.FacetCut({
            facetAddress: adminFacet,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: IDiamondLoupe(referenceProxy).facetFunctionSelectors(adminFacet)
        });
        cuts[2] = IDiamond.FacetCut({
            facetAddress: memberFacet,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: IDiamondLoupe(referenceProxy).facetFunctionSelectors(memberFacet)
        });
        cuts[3] = IDiamond.FacetCut({
            facetAddress: pauseFacet,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: IDiamondLoupe(referenceProxy).facetFunctionSelectors(pauseFacet)
        });
        cuts[4] =
            IDiamond.FacetCut({facetAddress: poolFacet, action: IDiamond.FacetCutAction.Auto, functionSelectors: poolSelectors});
        cuts[5] = IDiamond.FacetCut({
            facetAddress: powerFacet,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: IDiamondLoupe(referenceProxy).facetFunctionSelectors(powerFacet)
        });
        cuts[6] = IDiamond.FacetCut({
            facetAddress: strategyFacet,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: IDiamondLoupe(referenceProxy).facetFunctionSelectors(strategyFacet)
        });

        return _normalizeCommunityPoolFacetCuts(cuts);
    }

    function _resolveCommunityPoolFacetFromLive(address referenceProxy)
        internal
        returns (address poolFacet, bytes4[] memory poolSelectors)
    {
        poolFacet = IDiamondLoupe(referenceProxy).facetAddress(COMMUNITY_CREATE_POOL_SELECTOR_V0_3);
        if (poolFacet != address(0)) {
            poolSelectors = new bytes4[](2);
            poolSelectors[0] = COMMUNITY_CREATE_POOL_SELECTOR_V0_3;
            poolSelectors[1] = COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3;
            return (poolFacet, poolSelectors);
        }

        address stalePoolFacet = IDiamondLoupe(referenceProxy).facetAddress(COMMUNITY_CREATE_POOL_SELECTOR_V0_2);
        if (stalePoolFacet != address(0)) {
            poolFacet = address(_deployCommunityPoolFacet());
            poolSelectors = new bytes4[](2);
            poolSelectors[0] = COMMUNITY_CREATE_POOL_SELECTOR_V0_3;
            poolSelectors[1] = COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3;
            return (poolFacet, poolSelectors);
        }

        if (
            IDiamondLoupe(referenceProxy).facetAddress(COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_2) != address(0)
                || IDiamondLoupe(referenceProxy).facetAddress(COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3) != address(0)
        ) {
            revert("community pool facet selector mismatch");
        }

        revert("community pool facet selector missing");
    }

    function _normalizeCommunityPoolFacetCuts(IDiamond.FacetCut[] memory source)
        internal
        returns (IDiamond.FacetCut[] memory normalized)
    {
        normalized = _cloneFacetCuts(source);

        for (uint256 i = 0; i < normalized.length; i++) {
            if (_cutHasSelector(normalized[i], COMMUNITY_CREATE_POOL_SELECTOR_V0_3)) {
                normalized[i].functionSelectors = new bytes4[](2);
                normalized[i].functionSelectors[0] = COMMUNITY_CREATE_POOL_SELECTOR_V0_3;
                normalized[i].functionSelectors[1] = COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3;
                return normalized;
            }

            if (_cutHasSelector(normalized[i], COMMUNITY_CREATE_POOL_SELECTOR_V0_2)) {
                normalized[i].facetAddress = address(_deployCommunityPoolFacet());
                normalized[i].functionSelectors = new bytes4[](2);
                normalized[i].functionSelectors[0] = COMMUNITY_CREATE_POOL_SELECTOR_V0_3;
                normalized[i].functionSelectors[1] = COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3;
                return normalized;
            }
        }

        revert("community pool facet selector missing");
    }

    function _cutHasSelector(IDiamond.FacetCut memory cut, bytes4 selector) internal pure returns (bool) {
        for (uint256 i = 0; i < cut.functionSelectors.length; i++) {
            if (cut.functionSelectors[i] == selector) {
                return true;
            }
        }
        return false;
    }

    function _shouldDoFactory() internal view returns (bool) {
        return phaseSelection == Phase.All || phaseSelection == Phase.Factory;
    }

    function _shouldDoCommunities() internal view returns (bool) {
        return phaseSelection == Phase.All || phaseSelection == Phase.Communities;
    }

    function _shouldDoStrategies() internal view returns (bool) {
        return phaseSelection == Phase.All || phaseSelection == Phase.Strategies;
    }

    function _shouldDeployFactoryImplementation() internal view returns (bool) {
        return _shouldDoFactory() && _isFactoryAction(FactoryAction.UpgradeImpl);
    }

    function _shouldDeployRegistryImplementation() internal view returns (bool) {
        return _shouldDoCommunities() || (_shouldDoFactory() && _isFactoryAction(FactoryAction.SetRegistryTemplate));
    }

    function _shouldDeployStrategyImplementation() internal view returns (bool) {
        return _shouldDoStrategies() || (_shouldDoFactory() && _isFactoryAction(FactoryAction.SetStrategyTemplate));
    }

    function _runPreflightChecks(
        UpgradeContext memory context,
        string memory networkJson,
        bool doFactory,
        bool doCommunities,
        bool doStrategies
    ) internal view {
        if (context.registryFactoryProxy.code.length == 0) revert("registry factory proxy has no code");
        if (context.pauseController.code.length == 0) revert("pause controller has no code");
        if (context.streamingEscrowFactory != address(0) && context.streamingEscrowFactory.code.length == 0) {
            revert("streaming escrow factory has no code");
        }

        bool upgradesFactoryImpl = factoryAction == FactoryAction.All || factoryAction == FactoryAction.UpgradeImpl;
        if (doFactory && !upgradesFactoryImpl && !_isRegistryFactoryProxyAbiCompatible(context.registryFactoryProxy)) {
            revert("factory impl mismatch, run factory upgrade impl first");
        }

        if (doCommunities) {
            address[] memory registryCommunityProxies =
                networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
            for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
                if (registryCommunityProxies[i].code.length == 0) revert("registry community proxy has no code");
                if (!_isDiamondLoupeCompatible(registryCommunityProxies[i])) revert("registry community loupe mismatch");
            }
        }

        if (doStrategies) {
            address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
            for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
                if (cvStrategyProxies[i].code.length == 0) revert("cv strategy proxy has no code");
                if (!_isDiamondLoupeCompatible(cvStrategyProxies[i])) revert("cv strategy loupe mismatch");
            }
        }
    }

    function _isDiamondLoupeCompatible(address proxy) internal view returns (bool) {
        (bool ok,) = proxy.staticcall(abi.encodeWithSelector(IDiamondLoupe.facetAddresses.selector));
        return ok;
    }

    function _resolveRegistryFactoryImplementation(bool reuseConfiguredImplementations) internal returns (address) {
        if (reuseConfiguredImplementations) {
            address configured = _readAddressOrZero(".IMPLEMENTATIONS.REGISTRY_FACTORY");
            if (configured == address(0) || configured.code.length == 0) {
                revert("configured registry factory implementation invalid");
            }
            return configured;
        }

        address deployed = address(new RegistryFactory());
        _writeNetworkAddress(".IMPLEMENTATIONS.REGISTRY_FACTORY", deployed);
        return deployed;
    }

    function _resolveRegistryImplementation(bool reuseConfiguredImplementations) internal returns (address) {
        if (reuseConfiguredImplementations) {
            address configured = _readAddressOrZero(".IMPLEMENTATIONS.REGISTRY_COMMUNITY");
            if (configured == address(0) || configured.code.length == 0) {
                revert("configured registry community implementation invalid");
            }
            return configured;
        }

        address deployed = address(new RegistryCommunity());
        _writeNetworkAddress(".IMPLEMENTATIONS.REGISTRY_COMMUNITY", deployed);
        return deployed;
    }

    function _resolveStrategyImplementation(bool reuseConfiguredImplementations) internal returns (address) {
        if (reuseConfiguredImplementations) {
            address configured = _readAddressOrZero(".IMPLEMENTATIONS.CV_STRATEGY");
            if (configured == address(0) || configured.code.length == 0) {
                revert("configured strategy implementation invalid");
            }
            return configured;
        }

        address deployed = address(new CVStrategy());
        _writeNetworkAddress(".IMPLEMENTATIONS.CV_STRATEGY", deployed);
        return deployed;
    }

    function _executeRegistryFactoryUpgrades(UpgradeContext memory context) internal {
        RegistryFactory registryFactory = RegistryFactory(payable(context.registryFactoryProxy));
        bool forceFacets = _flagEnabled("FORCE_FACETS");
        bool splitFactoryFacetWrites = _flagEnabled("SPLIT_FACTORY_FACETS");

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.UpgradeImpl) {
            if (context.registryFactoryImplementation == address(0)) revert("missing registry factory implementation");
            if (_proxyImplementationAddress(context.registryFactoryProxy) != context.registryFactoryImplementation) {
                registryFactory.upgradeTo(context.registryFactoryImplementation);
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetCommunityFacets) {
            bytes32 communityCutsDigest = _facetCutsDigest(context.communityCuts);
            string memory communityCutsDigestHex = _bytes32ToHex(communityCutsDigest);
            address communityInit = _getOrDeployCommunityDiamondInit();
            bytes memory communityInitCalldata = abi.encodeCall(RegistryCommunityDiamondInit.init, ());
            if (
                forceFacets
                    || !_factoryFacetStateMatches(
                        registryFactory, true, context.communityCuts, communityInit, communityInitCalldata
                    )
            ) {
                if (splitFactoryFacetWrites) {
                    _setCommunityFacetsSplit(registryFactory, context.communityCuts, communityInit, communityInitCalldata);
                } else {
                    registryFactory.setCommunityFacets(context.communityCuts, communityInit, communityInitCalldata);
                }
            }
            _writeNetworkString(".FACTORY_STATE.COMMUNITY_CUTS_DIGEST", communityCutsDigestHex);
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetStrategyFacets) {
            bytes32 strategyCutsDigest = _facetCutsDigest(context.cvCuts);
            string memory strategyCutsDigestHex = _bytes32ToHex(strategyCutsDigest);
            address strategyInit = _getOrDeployStrategyDiamondInit();
            bytes memory strategyInitCalldata = abi.encodeCall(CVStrategyDiamondInit.init, ());
            if (
                forceFacets
                    || !_factoryFacetStateMatches(
                        registryFactory, false, context.cvCuts, strategyInit, strategyInitCalldata
                    )
            ) {
                if (splitFactoryFacetWrites) {
                    _setStrategyFacetsSplit(registryFactory, context.cvCuts, strategyInit, strategyInitCalldata);
                } else {
                    registryFactory.setStrategyFacets(context.cvCuts, strategyInit, strategyInitCalldata);
                }
            }
            _writeNetworkString(".FACTORY_STATE.STRATEGY_CUTS_DIGEST", strategyCutsDigestHex);
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetPauseController) {
            if (_factoryGlobalPauseControllerOrZero(context.registryFactoryProxy) != context.pauseController) {
                registryFactory.setGlobalPauseController(context.pauseController);
            }
            if (
                context.streamingEscrowFactory != address(0)
                    && _factoryStreamingEscrowFactoryOrZero(context.registryFactoryProxy) != context.streamingEscrowFactory
            ) {
                registryFactory.setStreamingEscrowFactory(context.streamingEscrowFactory);
            }
        }

        _registerRequiredContracts(registryFactory);

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetRegistryTemplate) {
            if (context.registryImplementation == address(0)) revert("missing registry community implementation");
            if (registryFactory.registryCommunityTemplate() != context.registryImplementation) {
                registryFactory.setRegistryCommunityTemplate(context.registryImplementation);
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetStrategyTemplate) {
            if (context.strategyImplementation == address(0)) revert("missing strategy implementation");
            if (registryFactory.strategyTemplate() != context.strategyImplementation) {
                registryFactory.setStrategyTemplate(context.strategyImplementation);
            }
        }
    }

    function _factoryGlobalPauseControllerOrZero(address factoryProxy) internal view returns (address controller) {
        (bool ok, bytes memory data) =
            factoryProxy.staticcall(abi.encodeWithSelector(bytes4(keccak256("globalPauseController()"))));
        if (ok && data.length >= 32) controller = abi.decode(data, (address));
    }

    function _factoryStreamingEscrowFactoryOrZero(address factoryProxy) internal view returns (address escrowFactory) {
        (bool ok, bytes memory data) =
            factoryProxy.staticcall(abi.encodeWithSelector(bytes4(keccak256("streamingEscrowFactory()"))));
        if (ok && data.length >= 32) escrowFactory = abi.decode(data, (address));
    }

    function _executeCommunityUpgrades(UpgradeContext memory context, string memory networkJson) internal {
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        uint256 startIndex = _boundedStartIndex(vm.envOr("COMMUNITY_START_INDEX", uint256(0)), registryCommunityProxies.length);
        uint256 endIndex = _boundedEndIndex(
            vm.envOr("COMMUNITY_END_INDEX", registryCommunityProxies.length), registryCommunityProxies.length
        );
        CommunityUpgradeOptions memory options = CommunityUpgradeOptions({
            skipUpgradeTo: _flagEnabled("SKIP_COMMUNITY_UPGRADE_TO"),
            skipStrategyTemplate: _flagEnabled("SKIP_COMMUNITY_STRATEGY_TEMPLATE"),
            skipDiamondCut: _flagEnabled("SKIP_COMMUNITY_DIAMOND_CUT"),
            diamondCutBeforeUpgrade: _flagEnabled("COMMUNITY_DCUT_BEFORE_UPGRADE"),
            communityInit: address(0),
            communityInitCalldata: bytes("")
        });
        if (!options.skipDiamondCut) {
            options.communityInit = _getOrDeployCommunityDiamondInit();
            options.communityInitCalldata = abi.encodeCall(RegistryCommunityDiamondInit.init, ());
        }
        for (uint256 i = startIndex; i < endIndex; i++) {
            _executeCommunityUpgradeActions(context, registryCommunityProxies[i], options);
        }
        _syncCommunityFacetSnapshotsFromLive(registryCommunityProxies, startIndex, endIndex);
    }

    function _executeStrategyUpgrades(UpgradeContext memory context, string memory networkJson) internal {
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        uint256 startIndex = _boundedStartIndex(vm.envOr("STRATEGY_START_INDEX", uint256(0)), cvStrategyProxies.length);
        uint256 endIndex =
            _boundedEndIndex(vm.envOr("STRATEGY_END_INDEX", cvStrategyProxies.length), cvStrategyProxies.length);
        bool skipInitCall = _flagEnabled("SKIP_STRATEGY_DIAMOND_INIT");
        StrategyUpgradeOptions memory options = StrategyUpgradeOptions({
            skipUpgradeTo: _flagEnabled("SKIP_STRATEGY_UPGRADE_TO"),
            skipDiamondCut: _flagEnabled("SKIP_STRATEGY_DIAMOND_CUT"),
            diamondCutBeforeUpgrade: _flagEnabled("STRATEGY_DCUT_BEFORE_UPGRADE"),
            strategyInit: address(0),
            strategyInitCalldata: bytes("")
        });
        if (!options.skipDiamondCut && !skipInitCall) {
            options.strategyInit = _getOrDeployStrategyDiamondInit();
            options.strategyInitCalldata = abi.encodeCall(CVStrategyDiamondInit.init, ());
        }
        for (uint256 i = startIndex; i < endIndex; i++) {
            _executeStrategyUpgradeActions(context, cvStrategyProxies[i], options);
        }
        _syncStrategyFacetSnapshotsFromLive(cvStrategyProxies, startIndex, endIndex);
    }

    function _syncFactoryCommunityState(UpgradeContext memory context) internal {
        RegistryFactory registryFactory = RegistryFactory(payable(context.registryFactoryProxy));

        if (context.registryImplementation != address(0) && registryFactory.registryCommunityTemplate() != context.registryImplementation) {
            registryFactory.setRegistryCommunityTemplate(context.registryImplementation);
        }

        if (context.communityCuts.length > 0) {
            address communityInit = _getOrDeployCommunityDiamondInit();
            bytes memory communityInitCalldata = abi.encodeCall(RegistryCommunityDiamondInit.init, ());
            if (!_factoryFacetStateMatches(registryFactory, true, context.communityCuts, communityInit, communityInitCalldata)) {
                registryFactory.setCommunityFacets(context.communityCuts, communityInit, communityInitCalldata);
            }
            _writeNetworkString(".FACTORY_STATE.COMMUNITY_CUTS_DIGEST", _bytes32ToHex(_facetCutsDigest(context.communityCuts)));
        }
    }

    function _syncFactoryStrategyState(UpgradeContext memory context) internal {
        RegistryFactory registryFactory = RegistryFactory(payable(context.registryFactoryProxy));

        if (context.strategyImplementation != address(0) && registryFactory.strategyTemplate() != context.strategyImplementation) {
            registryFactory.setStrategyTemplate(context.strategyImplementation);
        }

        if (context.cvCuts.length > 0) {
            address strategyInit = _getOrDeployStrategyDiamondInit();
            bytes memory strategyInitCalldata = abi.encodeCall(CVStrategyDiamondInit.init, ());
            if (!_factoryFacetStateMatches(registryFactory, false, context.cvCuts, strategyInit, strategyInitCalldata)) {
                registryFactory.setStrategyFacets(context.cvCuts, strategyInit, strategyInitCalldata);
            }
            _writeNetworkString(".FACTORY_STATE.STRATEGY_CUTS_DIGEST", _bytes32ToHex(_facetCutsDigest(context.cvCuts)));
        }
    }

    function _executeCommunityUpgradeActions(
        UpgradeContext memory context,
        address proxy,
        CommunityUpgradeOptions memory options
    ) internal {
        RegistryCommunity registryCommunity = RegistryCommunity(payable(proxy));
        bool needsUpgradeTo = !options.skipUpgradeTo && _proxyImplementationAddress(proxy) != context.registryImplementation;
        if (
            context.strategyImplementation != address(0) && !options.skipStrategyTemplate
                && registryCommunity.strategyTemplate() != context.strategyImplementation
        ) {
            registryCommunity.setStrategyTemplate(context.strategyImplementation);
        }

        IDiamond.FacetCut[] memory allCuts = _mergeFacetCuts(
            _buildStaleSelectorRemovalCuts(proxy, context.communityCuts), _buildChangedFacetCuts(proxy, context.communityCuts)
        );
        bool needsDiamondCut = !options.skipDiamondCut && allCuts.length > 0;

        if (options.diamondCutBeforeUpgrade) {
            if (needsDiamondCut) {
                IDiamondCut(proxy).diamondCut(allCuts, options.communityInit, options.communityInitCalldata);
            }
            if (needsUpgradeTo) {
                registryCommunity.upgradeTo(context.registryImplementation);
            }
            return;
        }

        if (needsUpgradeTo) {
            registryCommunity.upgradeTo(context.registryImplementation);
        }
        if (needsDiamondCut) {
            IDiamondCut(proxy).diamondCut(allCuts, options.communityInit, options.communityInitCalldata);
        }
    }

    function _executeStrategyUpgradeActions(
        UpgradeContext memory context,
        address proxy,
        StrategyUpgradeOptions memory options
    ) internal {
        CVStrategy cvStrategy = CVStrategy(payable(proxy));
        bool needsUpgradeTo = !options.skipUpgradeTo && _proxyImplementationAddress(proxy) != context.strategyImplementation;
        IDiamond.FacetCut[] memory allCuts = _mergeFacetCuts(
            _buildStaleSelectorRemovalCuts(proxy, context.cvCuts), _buildChangedFacetCuts(proxy, context.cvCuts)
        );
        bool needsDiamondCut = !options.skipDiamondCut && allCuts.length > 0;

        if (options.diamondCutBeforeUpgrade) {
            if (needsDiamondCut) {
                IDiamondCut(proxy).diamondCut(allCuts, options.strategyInit, options.strategyInitCalldata);
            }
            if (needsUpgradeTo) {
                cvStrategy.upgradeTo(context.strategyImplementation);
            }
            return;
        }

        if (needsUpgradeTo) {
            cvStrategy.upgradeTo(context.strategyImplementation);
        }
        if (needsDiamondCut) {
            IDiamondCut(proxy).diamondCut(allCuts, options.strategyInit, options.strategyInitCalldata);
        }
    }

    function _boundedStartIndex(uint256 requestedStart, uint256 length) internal pure returns (uint256) {
        return requestedStart > length ? length : requestedStart;
    }

    function _boundedEndIndex(uint256 requestedEnd, uint256 length) internal pure returns (uint256) {
        return requestedEnd > length ? length : requestedEnd;
    }

    function _mergeFacetCuts(IDiamond.FacetCut[] memory removals, IDiamond.FacetCut[] memory changes)
        internal
        pure
        returns (IDiamond.FacetCut[] memory merged)
    {
        merged = new IDiamond.FacetCut[](removals.length + changes.length);
        uint256 index = 0;
        for (uint256 i = 0; i < removals.length; i++) {
            merged[index] = removals[i];
            index++;
        }
        for (uint256 i = 0; i < changes.length; i++) {
            merged[index] = changes[i];
            index++;
        }
    }

    function _syncCommunityFacetSnapshotsFromLive(address[] memory proxies, uint256 startIndex, uint256 endIndex)
        internal
    {
        if (endIndex <= startIndex) return;

        address referenceProxy = proxies[startIndex];
        {
            address[] memory referenceFacets = IDiamondLoupe(referenceProxy).facetAddresses();
            require(referenceFacets.length == EXPECTED_COMMUNITY_FACET_COUNT, "community facet count mismatch");
        }

        CommunityFacetSnapshot memory snapshot = _readCommunityFacetSnapshot(referenceProxy);
        require(
            snapshot.loupeFacet != address(0) && snapshot.adminFacet != address(0) && snapshot.memberFacet != address(0)
                && snapshot.pauseFacet != address(0) && snapshot.poolFacet != address(0)
                && snapshot.powerFacet != address(0) && snapshot.strategyFacet != address(0),
            "community facet selector missing"
        );

        for (uint256 i = startIndex + 1; i < endIndex; i++) {
            address proxy = proxies[i];
            {
                address[] memory facetAddresses = IDiamondLoupe(proxy).facetAddresses();
                require(facetAddresses.length == EXPECTED_COMMUNITY_FACET_COUNT, "community facet count mismatch");
            }
            require(_communityFacetSnapshotMatches(proxy, snapshot), "community facets diverged across proxies");
        }

        _writeNetworkAddress(".FACETS.DIAMOND_LOUPE", snapshot.loupeFacet);
        _writeNetworkAddress(".FACETS.COMMUNITY_DIAMOND_LOUPE", snapshot.loupeFacet);
        _writeNetworkAddress(".FACETS.COMMUNITY_ADMIN", snapshot.adminFacet);
        _writeNetworkAddress(".FACETS.COMMUNITY_MEMBER", snapshot.memberFacet);
        _writeNetworkAddress(".FACETS.COMMUNITY_PAUSE", snapshot.pauseFacet);
        _writeNetworkAddress(".FACETS.COMMUNITY_POOL", snapshot.poolFacet);
        _writeNetworkAddress(".FACETS.COMMUNITY_POWER", snapshot.powerFacet);
        _writeNetworkAddress(".FACETS.COMMUNITY_STRATEGY", snapshot.strategyFacet);
    }

    function _syncRegistryFactoryImplementationFromLive(address proxy) internal {
        require(proxy != address(0), "registry factory proxy missing");
        address implementation = _proxyImplementationAddress(proxy);
        require(implementation != address(0), "registry factory implementation missing");
        _writeNetworkAddress(".IMPLEMENTATIONS.REGISTRY_FACTORY", implementation);
    }

    function _syncCommunityImplementationFromLive(string memory networkJson) internal {
        address[] memory proxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        if (proxies.length == 0) return;

        address implementation = _proxyImplementationAddress(proxies[0]);
        require(implementation != address(0), "community implementation missing");
        for (uint256 i = 1; i < proxies.length; i++) {
            require(_proxyImplementationAddress(proxies[i]) == implementation, "community implementation mismatch");
        }
        _writeNetworkAddress(".IMPLEMENTATIONS.REGISTRY_COMMUNITY", implementation);
    }

    function _syncStrategyFacetSnapshotsFromLive(address[] memory proxies, uint256 startIndex, uint256 endIndex) internal {
        if (endIndex <= startIndex) return;

        address referenceProxy = proxies[startIndex];
        address[] memory referenceFacets = IDiamondLoupe(referenceProxy).facetAddresses();
        require(referenceFacets.length == EXPECTED_STRATEGY_FACET_COUNT, "strategy facet count mismatch");
        bytes4 adminSelector = _strategyAdminSelector();
        bytes4 syncSelector = _strategySyncSelector();
        StrategyFacetSnapshot memory snapshot = _readStrategyFacetSnapshot(referenceProxy, adminSelector, syncSelector);
        require(
            snapshot.loupeFacet != address(0) && snapshot.adminFacet != address(0) && snapshot.allocationFacet != address(0)
                && snapshot.disputeFacet != address(0) && snapshot.pauseFacet != address(0)
                && snapshot.powerFacet != address(0) && snapshot.proposalFacet != address(0)
                && snapshot.syncPowerFacet != address(0) && snapshot.streamingFacet != address(0),
            "strategy facet selector missing"
        );

        for (uint256 i = startIndex + 1; i < endIndex; i++) {
            address proxy = proxies[i];
            address[] memory facetAddresses = IDiamondLoupe(proxy).facetAddresses();
            require(facetAddresses.length == EXPECTED_STRATEGY_FACET_COUNT, "strategy facet count mismatch");
            require(
                _strategyFacetSnapshotMatches(proxy, snapshot, adminSelector, syncSelector),
                "strategy facets diverged across proxies"
            );
        }

        _writeNetworkAddress(".FACETS.DIAMOND_LOUPE", snapshot.loupeFacet);
        _writeNetworkAddress(".FACETS.STRATEGY_DIAMOND_LOUPE", snapshot.loupeFacet);
        _writeNetworkAddress(".FACETS.CV_ADMIN", snapshot.adminFacet);
        _writeNetworkAddress(".FACETS.CV_ALLOCATION", snapshot.allocationFacet);
        _writeNetworkAddress(".FACETS.CV_DISPUTE", snapshot.disputeFacet);
        _writeNetworkAddress(".FACETS.CV_PAUSE", snapshot.pauseFacet);
        _writeNetworkAddress(".FACETS.CV_POWER", snapshot.powerFacet);
        _writeNetworkAddress(".FACETS.CV_PROPOSAL", snapshot.proposalFacet);
        _writeNetworkAddress(".FACETS.CV_SYNC_POWER", snapshot.syncPowerFacet);
        _writeNetworkAddress(".FACETS.CV_STREAMING", snapshot.streamingFacet);
    }

    function _syncStrategyImplementationFromLive(string memory networkJson) internal {
        address[] memory proxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        if (proxies.length == 0) return;

        address implementation = _proxyImplementationAddress(proxies[0]);
        require(implementation != address(0), "strategy implementation missing");
        for (uint256 i = 1; i < proxies.length; i++) {
            require(_proxyImplementationAddress(proxies[i]) == implementation, "strategy implementation mismatch");
        }
        _writeNetworkAddress(".IMPLEMENTATIONS.CV_STRATEGY", implementation);
    }

    function _factoryFacetStateMatches(
        RegistryFactory registryFactory,
        bool isCommunity,
        IDiamond.FacetCut[] memory desiredCuts,
        address desiredInit,
        bytes memory desiredInitCalldata
    ) internal view returns (bool) {
        IDiamond.FacetCut[] memory currentCuts;
        address currentInit;
        bytes memory currentInitCalldata;

        if (isCommunity) {
            (currentCuts, currentInit, currentInitCalldata) = registryFactory.getCommunityFacets();
        } else {
            (currentCuts, currentInit, currentInitCalldata) = registryFactory.getStrategyFacets();
        }

        return _facetCutsDigest(currentCuts) == _facetCutsDigest(desiredCuts) && currentInit == desiredInit
            && keccak256(currentInitCalldata) == keccak256(desiredInitCalldata);
    }

    function _strategyAdminSelector() internal pure returns (bytes4) {
        return bytes4(
            keccak256(
                "setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address)"
            )
        );
    }

    function _strategySyncSelector() internal pure returns (bytes4) {
        return bytes4(keccak256("setAuthorizedSyncCaller(address,bool)"));
    }

    function _readStrategyFacetSnapshot(address proxy, bytes4 adminSelector, bytes4 syncSelector)
        internal
        view
        returns (StrategyFacetSnapshot memory snapshot)
    {
        snapshot.loupeFacet = IDiamondLoupe(proxy).facetAddress(IDiamondLoupe.facets.selector);
        snapshot.adminFacet = IDiamondLoupe(proxy).facetAddress(adminSelector);
        snapshot.allocationFacet = IDiamondLoupe(proxy).facetAddress(CVStrategy.allocate.selector);
        snapshot.disputeFacet = IDiamondLoupe(proxy).facetAddress(CVStrategy.disputeProposal.selector);
        snapshot.pauseFacet = IDiamondLoupe(proxy).facetAddress(bytes4(keccak256("setPauseController(address)")));
        snapshot.powerFacet = IDiamondLoupe(proxy).facetAddress(CVStrategy.activatePoints.selector);
        snapshot.proposalFacet = IDiamondLoupe(proxy).facetAddress(CVStrategy.registerRecipient.selector);
        snapshot.syncPowerFacet = IDiamondLoupe(proxy).facetAddress(syncSelector);
        snapshot.streamingFacet = IDiamondLoupe(proxy).facetAddress(CVStrategy.rebalance.selector);
    }

    function _strategyFacetSnapshotMatches(
        address proxy,
        StrategyFacetSnapshot memory snapshot,
        bytes4 adminSelector,
        bytes4 syncSelector
    ) internal view returns (bool) {
        return IDiamondLoupe(proxy).facetAddress(IDiamondLoupe.facets.selector) == snapshot.loupeFacet
            && IDiamondLoupe(proxy).facetAddress(adminSelector) == snapshot.adminFacet
            && IDiamondLoupe(proxy).facetAddress(CVStrategy.allocate.selector) == snapshot.allocationFacet
            && IDiamondLoupe(proxy).facetAddress(CVStrategy.disputeProposal.selector) == snapshot.disputeFacet
            && IDiamondLoupe(proxy).facetAddress(bytes4(keccak256("setPauseController(address)"))) == snapshot.pauseFacet
            && IDiamondLoupe(proxy).facetAddress(CVStrategy.activatePoints.selector) == snapshot.powerFacet
            && IDiamondLoupe(proxy).facetAddress(CVStrategy.registerRecipient.selector) == snapshot.proposalFacet
            && IDiamondLoupe(proxy).facetAddress(syncSelector) == snapshot.syncPowerFacet
            && IDiamondLoupe(proxy).facetAddress(CVStrategy.rebalance.selector) == snapshot.streamingFacet;
    }

    function _readCommunityFacetSnapshot(address proxy)
        internal
        view
        returns (CommunityFacetSnapshot memory snapshot)
    {
        snapshot.loupeFacet = IDiamondLoupe(proxy).facetAddress(IDiamondLoupe.facets.selector);
        snapshot.adminFacet = IDiamondLoupe(proxy).facetAddress(CommunityAdminFacet.setStrategyTemplate.selector);
        snapshot.memberFacet =
            IDiamondLoupe(proxy).facetAddress(CommunityMemberFacet.stakeAndRegisterMember.selector);
        snapshot.pauseFacet = IDiamondLoupe(proxy).facetAddress(bytes4(keccak256("setPauseController(address)")));
        snapshot.poolFacet = IDiamondLoupe(proxy).facetAddress(COMMUNITY_CREATE_POOL_SELECTOR_V0_3);
        snapshot.powerFacet =
            IDiamondLoupe(proxy).facetAddress(CommunityPowerFacet.activateMemberInStrategy.selector);
        snapshot.strategyFacet =
            IDiamondLoupe(proxy).facetAddress(CommunityStrategyFacet.addStrategyByPoolId.selector);
    }

    function _communityFacetSnapshotMatches(address proxy, CommunityFacetSnapshot memory snapshot)
        internal
        view
        returns (bool)
    {
        return IDiamondLoupe(proxy).facetAddress(IDiamondLoupe.facets.selector) == snapshot.loupeFacet
            && IDiamondLoupe(proxy).facetAddress(CommunityAdminFacet.setStrategyTemplate.selector) == snapshot.adminFacet
            && IDiamondLoupe(proxy).facetAddress(CommunityMemberFacet.stakeAndRegisterMember.selector)
                == snapshot.memberFacet
            && IDiamondLoupe(proxy).facetAddress(bytes4(keccak256("setPauseController(address)"))) == snapshot.pauseFacet
            && IDiamondLoupe(proxy).facetAddress(COMMUNITY_CREATE_POOL_SELECTOR_V0_3) == snapshot.poolFacet
            && IDiamondLoupe(proxy).facetAddress(CommunityPowerFacet.activateMemberInStrategy.selector)
                == snapshot.powerFacet
            && IDiamondLoupe(proxy).facetAddress(CommunityStrategyFacet.addStrategyByPoolId.selector)
                == snapshot.strategyFacet;
    }
}
