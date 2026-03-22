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

contract UpgradeCVMultichain is UpgradeCVMultichainBase {
    using stdJson for string;

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
        context = _populateDesiredCuts(context);

        if (_shouldDoFactory()) {
            _executeRegistryFactoryUpgrades(context);
        }
        if (_shouldDoCommunities()) {
            _executeCommunityUpgrades(context, networkJson);
        }
        if (_shouldDoStrategies()) {
            _executeStrategyUpgrades(context, networkJson);
        }
    }

    function _populateDesiredCuts(UpgradeContext memory context) internal returns (UpgradeContext memory) {
        bool doCommunities = _shouldDoCommunities();
        bool doStrategies = _shouldDoStrategies();
        bool needFactoryFacetCuts = _shouldDoFactory()
            && (_isFactoryAction(FactoryAction.SetCommunityFacets) || _isFactoryAction(FactoryAction.SetStrategyFacets));

        if (doCommunities) {
            FacetCuts memory facetCuts = _buildFacetCutsFromSnapshot();
            context.cvCuts = facetCuts.cvCuts;
            context.communityCuts = facetCuts.communityCuts;
        } else if (doStrategies) {
            context.cvCuts = _buildCVFacetCutsFromSnapshot();
        } else if (needFactoryFacetCuts) {
            if (factoryAction == FactoryAction.SetCommunityFacets) {
                context.communityCuts = _buildCommunityFacetCutsFromSnapshot();
            } else if (factoryAction == FactoryAction.SetStrategyFacets) {
                context.cvCuts = _buildCVFacetCutsFromSnapshot();
            } else {
                FacetCuts memory facetCuts = _buildFacetCutsFromSnapshot();
                context.cvCuts = facetCuts.cvCuts;
                context.communityCuts = facetCuts.communityCuts;
            }
        }
        return context;
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
            string memory previousCommunityCutsDigest = _readStringOrEmpty(".FACTORY_STATE.COMMUNITY_CUTS_DIGEST");
            if (forceFacets || keccak256(bytes(previousCommunityCutsDigest)) != keccak256(bytes(communityCutsDigestHex))) {
                address communityInit = _getOrDeployCommunityDiamondInit();
                bytes memory communityInitCalldata = abi.encodeCall(RegistryCommunityDiamondInit.init, ());
                if (splitFactoryFacetWrites) {
                    _setCommunityFacetsSplit(registryFactory, context.communityCuts, communityInit, communityInitCalldata);
                } else {
                    registryFactory.setCommunityFacets(context.communityCuts, communityInit, communityInitCalldata);
                }
                _writeNetworkString(".FACTORY_STATE.COMMUNITY_CUTS_DIGEST", communityCutsDigestHex);
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetStrategyFacets) {
            bytes32 strategyCutsDigest = _facetCutsDigest(context.cvCuts);
            string memory strategyCutsDigestHex = _bytes32ToHex(strategyCutsDigest);
            string memory previousStrategyCutsDigest = _readStringOrEmpty(".FACTORY_STATE.STRATEGY_CUTS_DIGEST");
            if (forceFacets || keccak256(bytes(previousStrategyCutsDigest)) != keccak256(bytes(strategyCutsDigestHex))) {
                address strategyInit = _getOrDeployStrategyDiamondInit();
                bytes memory strategyInitCalldata = abi.encodeCall(CVStrategyDiamondInit.init, ());
                if (splitFactoryFacetWrites) {
                    _setStrategyFacetsSplit(registryFactory, context.cvCuts, strategyInit, strategyInitCalldata);
                } else {
                    registryFactory.setStrategyFacets(context.cvCuts, strategyInit, strategyInitCalldata);
                }
                _writeNetworkString(".FACTORY_STATE.STRATEGY_CUTS_DIGEST", strategyCutsDigestHex);
            }
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
    }

    function _executeCommunityUpgradeActions(
        UpgradeContext memory context,
        address proxy,
        CommunityUpgradeOptions memory options
    ) internal {
        RegistryCommunity registryCommunity = RegistryCommunity(payable(proxy));
        bool needsUpgradeTo = !options.skipUpgradeTo && _proxyImplementationAddress(proxy) != context.registryImplementation;
        if (!options.skipStrategyTemplate && registryCommunity.strategyTemplate() != context.strategyImplementation) {
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
}
