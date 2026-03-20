// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UpgradeCVMultichainTest.s.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";

contract UpgradeCVMultichainProd is UpgradeCVMultichainTest {
    using stdJson for string;

    struct JsonWriter {
        string path;
        bool hasEntries;
    }

    struct AuditWriter {
        string path;
        bool enabled;
        uint256 index;
    }

    struct UpgradeContext {
        address registryFactoryImplementation;
        address registryImplementation;
        address strategyImplementation;
        address registryFactoryProxy;
        address safeOwner;
        address pauseController;
        address streamingEscrowFactory;
        IDiamond.FacetCut[] cvCuts;
        IDiamond.FacetCut[] communityCuts;
        JsonWriter writer;
        AuditWriter auditWriter;
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
        bool doFactory = phaseSelection == Phase.All || phaseSelection == Phase.Factory;
        bool doCommunities = phaseSelection == Phase.All || phaseSelection == Phase.Communities;
        bool doStrategies = phaseSelection == Phase.All || phaseSelection == Phase.Strategies;
        bool deployFactoryImplementation = doFactory && _isFactoryAction(FactoryAction.UpgradeImpl);
        bool deployRegistryImplementation =
            doCommunities || (doFactory && _isFactoryAction(FactoryAction.SetRegistryTemplate));
        bool deployStrategyImplementation =
            doStrategies || (doFactory && _isFactoryAction(FactoryAction.SetStrategyTemplate));
        bool reuseConfiguredImplementations = vm.envOr("REUSE_CONFIGURED_IMPLEMENTATIONS", false);

        UpgradeContext memory context;

        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        context.pauseController = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
        if (context.pauseController == address(0)) {
            revert("PAUSE_CONTROLLER not set in networks.json");
        }
        context.streamingEscrowFactory = _readAddressOrZero(".ENVS.STREAMING_ESCROW_FACTORY");
        context.safeOwner = ProxyOwner(proxyOwner).owner();
        context.registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));

        if (!vm.envOr("SKIP_PREFLIGHT", false)) {
            vm.stopBroadcast();
            _runPreflightChecks(context, networkJson, proxyOwner, doFactory, doCommunities, doStrategies);
            _runPostUpgradeUpgradeabilityChecks(
                context,
                networkJson,
                deployFactoryImplementation,
                deployRegistryImplementation,
                deployStrategyImplementation
            );
            vm.startBroadcast(pool_admin());
        }

        context.registryFactoryImplementation = deployFactoryImplementation
            ? _resolveRegistryFactoryImplementation(reuseConfiguredImplementations)
            : address(0);
        context.registryImplementation = deployRegistryImplementation
            ? _resolveRegistryImplementation(reuseConfiguredImplementations)
            : address(0);
        context.strategyImplementation = deployStrategyImplementation
            ? _resolveStrategyImplementation(reuseConfiguredImplementations)
            : address(0);

        bool needFactoryFacetCuts = doFactory
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

        context.writer = _initPayloadWriter(context.safeOwner, networkJson);
        context.auditWriter = _initAuditWriter();

        if (doFactory) {
            context = _writeRegistryFactoryUpgrades(context);
        }

        if (doCommunities) {
            context = _writeCommunityUpgrades(context, networkJson);
        }

        if (doStrategies) {
            context = _writeStrategyUpgrades(context, networkJson);
        }

        _finalizePayloadWriter(context.writer);
    }

    function _runPreflightChecks(
        UpgradeContext memory context,
        string memory networkJson,
        address proxyOwner,
        bool doFactory,
        bool doCommunities,
        bool doStrategies
    ) internal view {
        if (context.registryFactoryProxy.code.length == 0) {
            revert("registry factory proxy has no code");
        }
        if (proxyOwner.code.length == 0) {
            revert("proxy owner has no code");
        }
        if (context.safeOwner == address(0)) {
            revert("proxy owner owner() is zero");
        }
        if (context.pauseController.code.length == 0) {
            revert("pause controller has no code");
        }
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
                address proxy = registryCommunityProxies[i];
                if (proxy.code.length == 0) {
                    revert("registry community proxy has no code");
                }
                if (!_isDiamondLoupeCompatible(proxy)) {
                    revert("registry community loupe mismatch");
                }
            }
        }

        if (doStrategies) {
            address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
            for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
                address proxy = cvStrategyProxies[i];
                if (proxy.code.length == 0) {
                    revert("cv strategy proxy has no code");
                }
                if (!_isDiamondLoupeCompatible(proxy)) {
                    revert("cv strategy loupe mismatch");
                }
            }
        }
    }

    function _isDiamondLoupeCompatible(address proxy) internal view returns (bool) {
        (bool ok,) = proxy.staticcall(abi.encodeWithSelector(IDiamondLoupe.facetAddresses.selector));
        return ok;
    }

    function _runPostUpgradeUpgradeabilityChecks(
        UpgradeContext memory context,
        string memory networkJson,
        bool deployFactoryImplementation,
        bool deployRegistryImplementation,
        bool deployStrategyImplementation
    ) internal {
        uint256 forkId = vm.createFork(_rpcUrlForUpgradePreflight());
        vm.selectFork(forkId);

        if (deployFactoryImplementation) {
            address forkRegistryFactoryImplementation = address(new RegistryFactory());
            _assertUpgradeableAfterUpgrade(
                context.registryFactoryProxy,
                context.safeOwner,
                forkRegistryFactoryImplementation,
                address(new RegistryFactory())
            );
        }

        if (deployRegistryImplementation) {
            address[] memory registryCommunityProxies =
                networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
            address forkRegistryImplementation = address(new RegistryCommunity());
            address probeRegistryImplementation = address(new RegistryCommunity());
            for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
                _assertUpgradeableAfterUpgrade(
                    registryCommunityProxies[i],
                    context.safeOwner,
                    forkRegistryImplementation,
                    probeRegistryImplementation
                );
            }
        }

        if (deployStrategyImplementation) {
            address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
            address forkStrategyImplementation = address(new CVStrategy());
            address probeStrategyImplementation = address(new CVStrategy());
            for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
                _assertUpgradeableAfterUpgrade(
                    cvStrategyProxies[i], context.safeOwner, forkStrategyImplementation, probeStrategyImplementation
                );
            }
        }
    }

    function _assertUpgradeableAfterUpgrade(
        address proxy,
        address owner,
        address nextImplementation,
        address probeImplementation
    ) internal {
        vm.startPrank(owner);
        ProxyOwnableUpgrader(payable(proxy)).upgradeTo(nextImplementation);
        if (_proxyImplementationAddress(proxy) != nextImplementation) {
            revert("preflight upgradeTo failed");
        }
        ProxyOwnableUpgrader(payable(proxy)).upgradeTo(probeImplementation);
        if (_proxyImplementationAddress(proxy) != probeImplementation) {
            revert("preflight future upgradeTo failed");
        }
        vm.stopPrank();
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

    function _rpcUrlForUpgradePreflight() internal view returns (string memory) {
        bytes32 networkHash = keccak256(bytes(CURRENT_NETWORK));
        if (networkHash == keccak256(bytes("ethsepolia"))) return vm.envString("RPC_URL_SEP_TESTNET");
        if (networkHash == keccak256(bytes("arbsepolia"))) return vm.envString("RPC_URL_ARB_TESTNET");
        if (networkHash == keccak256(bytes("opsepolia"))) return vm.envString("RPC_URL_OP_TESTNET");
        if (networkHash == keccak256(bytes("arbitrum"))) return vm.envString("RPC_URL_ARB");
        if (networkHash == keccak256(bytes("optimism"))) return vm.envString("RPC_URL_OPT");
        if (networkHash == keccak256(bytes("polygon"))) return vm.envString("RPC_URL_POLYGON");
        if (networkHash == keccak256(bytes("gnosis"))) return vm.envString("RPC_URL_GNOSIS");
        if (networkHash == keccak256(bytes("base"))) return vm.envString("RPC_URL_BASE");
        if (networkHash == keccak256(bytes("celo"))) return vm.envString("RPC_URL_CELO");
        revert("missing rpc url for preflight");
    }

    function _writeRegistryFactoryUpgrades(UpgradeContext memory context)
        internal
        returns (UpgradeContext memory)
    {
        RegistryFactory registryFactory = RegistryFactory(payable(context.registryFactoryProxy));
        bool forceFacets = vm.envOr("FORCE_FACETS", false);
        bool splitFactoryFacetWrites = vm.envOr("SPLIT_FACTORY_FACETS", false);

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.UpgradeImpl) {
            if (context.registryFactoryImplementation == address(0)) revert("missing registry factory implementation");
            if (_proxyImplementationAddress(context.registryFactoryProxy) != context.registryFactoryImplementation) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        context.registryFactoryProxy,
                        abi.encodeCall(registryFactory.upgradeTo, (context.registryFactoryImplementation))
                    )
                );
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetCommunityFacets) {
            bytes32 communityCutsDigest = _facetCutsDigest(context.communityCuts);
            string memory communityCutsDigestHex = _bytes32ToHex(communityCutsDigest);
            string memory previousCommunityCutsDigest = _readStringOrEmpty(".FACTORY_STATE.COMMUNITY_CUTS_DIGEST");

            if (forceFacets || keccak256(bytes(previousCommunityCutsDigest)) != keccak256(bytes(communityCutsDigestHex)))
            {
                context =
                    _appendCommunityFacetWrites(context, registryFactory, splitFactoryFacetWrites);
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetStrategyFacets) {
            bytes32 strategyCutsDigest = _facetCutsDigest(context.cvCuts);
            string memory strategyCutsDigestHex = _bytes32ToHex(strategyCutsDigest);
            string memory previousStrategyCutsDigest = _readStringOrEmpty(".FACTORY_STATE.STRATEGY_CUTS_DIGEST");

            if (forceFacets || keccak256(bytes(previousStrategyCutsDigest)) != keccak256(bytes(strategyCutsDigestHex))) {
                context = _appendStrategyFacetWrites(context, registryFactory, splitFactoryFacetWrites);
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetPauseController) {
            if (_factoryGlobalPauseControllerOrZero(context.registryFactoryProxy) != context.pauseController) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        context.registryFactoryProxy,
                        abi.encodeCall(registryFactory.setGlobalPauseController, (context.pauseController))
                    )
                );
            }

            if (
                context.streamingEscrowFactory != address(0)
                    && _factoryStreamingEscrowFactoryOrZero(context.registryFactoryProxy) != context.streamingEscrowFactory
            ) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        context.registryFactoryProxy,
                        abi.encodeCall(registryFactory.setStreamingEscrowFactory, (context.streamingEscrowFactory))
                    )
                );
            }
        }

        context = _appendRequiredContractRegistrations(context, registryFactory);

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetRegistryTemplate) {
            if (context.registryImplementation == address(0)) revert("missing registry community implementation");
            if (registryFactory.registryCommunityTemplate() != context.registryImplementation) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        context.registryFactoryProxy,
                        abi.encodeCall(registryFactory.setRegistryCommunityTemplate, (context.registryImplementation))
                    )
                );
            }
        }

        if (factoryAction == FactoryAction.All || factoryAction == FactoryAction.SetStrategyTemplate) {
            if (context.strategyImplementation == address(0)) revert("missing strategy implementation");
            if (registryFactory.strategyTemplate() != context.strategyImplementation) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        context.registryFactoryProxy,
                        abi.encodeCall(registryFactory.setStrategyTemplate, (context.strategyImplementation))
                    )
                );
            }
        }

        return context;
    }

    function _appendCommunityFacetWrites(
        UpgradeContext memory context,
        RegistryFactory registryFactory,
        bool splitFactoryFacetWrites
    )
        internal
        returns (UpgradeContext memory)
    {
        address communityInit = _getOrDeployCommunityDiamondInit();
        bytes memory communityInitCalldata = abi.encodeCall(RegistryCommunityDiamondInit.init, ());

        if (splitFactoryFacetWrites) {
            for (uint256 i = 0; i < context.communityCuts.length; i++) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        context.registryFactoryProxy,
                        abi.encodeCall(
                            registryFactory.upsertCommunityFacetCut,
                            (
                                i,
                                context.communityCuts[i].facetAddress,
                                context.communityCuts[i].action,
                                context.communityCuts[i].functionSelectors
                            )
                        )
                    )
                );
            }
            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(
                    context.registryFactoryProxy,
                    abi.encodeCall(registryFactory.setCommunityFacetInit, (communityInit, communityInitCalldata))
                )
            );
            return context;
        }

        context.writer = _appendTransaction(
            context.writer,
            _createTransactionJson(
                context.registryFactoryProxy,
                abi.encodeCall(registryFactory.setCommunityFacets, (context.communityCuts, communityInit, communityInitCalldata))
            )
        );
        return context;
    }

    function _appendStrategyFacetWrites(
        UpgradeContext memory context,
        RegistryFactory registryFactory,
        bool splitFactoryFacetWrites
    )
        internal
        returns (UpgradeContext memory)
    {
        address strategyInit = _getOrDeployStrategyDiamondInit();
        bytes memory strategyInitCalldata = abi.encodeCall(CVStrategyDiamondInit.init, ());

        if (splitFactoryFacetWrites) {
            for (uint256 i = 0; i < context.cvCuts.length; i++) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        context.registryFactoryProxy,
                        abi.encodeCall(
                            registryFactory.upsertStrategyFacetCut,
                            (
                                i,
                                context.cvCuts[i].facetAddress,
                                context.cvCuts[i].action,
                                context.cvCuts[i].functionSelectors
                            )
                        )
                    )
                );
            }
            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(
                    context.registryFactoryProxy,
                    abi.encodeCall(registryFactory.setStrategyFacetInit, (strategyInit, strategyInitCalldata))
                )
            );
            return context;
        }

        context.writer = _appendTransaction(
            context.writer,
            _createTransactionJson(
                context.registryFactoryProxy,
                abi.encodeCall(registryFactory.setStrategyFacets, (context.cvCuts, strategyInit, strategyInitCalldata))
            )
        );
        return context;
    }

    function _appendRequiredContractRegistrations(UpgradeContext memory context, RegistryFactory registryFactory)
        internal
        returns (UpgradeContext memory)
    {
        context = _appendRegistrationIfPresent(context, registryFactory, _readAddressOrZero(".ENVS.ARBITRATOR"));
        context = _appendRegistrationIfPresent(context, registryFactory, _readAddressOrZero(".ENVS.PASSPORT_SCORER"));
        context = _appendRegistrationIfPresent(context, registryFactory, _readAddressOrZero(".ENVS.GOOD_DOLLAR_SYBIL"));
        return context;
    }

    function _appendRegistrationIfPresent(
        UpgradeContext memory context,
        RegistryFactory registryFactory,
        address target
    )
        internal
        returns (UpgradeContext memory)
    {
        if (target == address(0) || _factoryIsContractRegisteredOrFalse(context.registryFactoryProxy, target)) {
            return context;
        }

        context.writer = _appendTransaction(
            context.writer,
            _createTransactionJson(
                context.registryFactoryProxy,
                abi.encodeCall(registryFactory.registerContract, (target))
            )
        );
        return context;
    }

    function _factoryGlobalPauseControllerOrZero(address factoryProxy) internal view returns (address controller) {
        (bool ok, bytes memory data) =
            factoryProxy.staticcall(abi.encodeWithSelector(bytes4(keccak256("globalPauseController()"))));
        if (ok && data.length >= 32) {
            controller = abi.decode(data, (address));
        }
    }

    function _factoryStreamingEscrowFactoryOrZero(address factoryProxy) internal view returns (address escrowFactory) {
        (bool ok, bytes memory data) =
            factoryProxy.staticcall(abi.encodeWithSelector(bytes4(keccak256("streamingEscrowFactory()"))));
        if (ok && data.length >= 32) {
            escrowFactory = abi.decode(data, (address));
        }
    }

    function _factoryIsContractRegisteredOrFalse(address factoryProxy, address target) internal view returns (bool isRegistered) {
        (bool ok, bytes memory data) =
            factoryProxy.staticcall(abi.encodeWithSelector(bytes4(keccak256("isContractRegistered(address)")), target));
        if (ok && data.length >= 32) {
            isRegistered = abi.decode(data, (bool));
        }
    }

    function _writeCommunityUpgrades(UpgradeContext memory context, string memory networkJson)
        internal
        returns (UpgradeContext memory)
    {
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        uint256 startIndex = _boundedStartIndex(vm.envOr("COMMUNITY_START_INDEX", uint256(0)), registryCommunityProxies.length);
        uint256 endIndex = _boundedEndIndex(
            vm.envOr("COMMUNITY_END_INDEX", registryCommunityProxies.length), registryCommunityProxies.length
        );
        CommunityUpgradeOptions memory options = CommunityUpgradeOptions({
            skipUpgradeTo: vm.envOr("SKIP_COMMUNITY_UPGRADE_TO", false),
            skipStrategyTemplate: vm.envOr("SKIP_COMMUNITY_STRATEGY_TEMPLATE", false),
            skipDiamondCut: vm.envOr("SKIP_COMMUNITY_DIAMOND_CUT", false),
            diamondCutBeforeUpgrade: vm.envOr("COMMUNITY_DCUT_BEFORE_UPGRADE", false),
            communityInit: address(0),
            communityInitCalldata: bytes("")
        });
        if (!options.skipDiamondCut) {
            options.communityInit = _getOrDeployCommunityDiamondInit();
            options.communityInitCalldata = abi.encodeCall(RegistryCommunityDiamondInit.init, ());
        }

        for (uint256 i = startIndex; i < endIndex; i++) {
            context = _appendCommunityUpgradeActions(context, registryCommunityProxies[i], options);
        }

        return context;
    }

    function _writeStrategyUpgrades(UpgradeContext memory context, string memory networkJson)
        internal
        returns (UpgradeContext memory)
    {
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        uint256 startIndex = _boundedStartIndex(vm.envOr("STRATEGY_START_INDEX", uint256(0)), cvStrategyProxies.length);
        uint256 endIndex =
            _boundedEndIndex(vm.envOr("STRATEGY_END_INDEX", cvStrategyProxies.length), cvStrategyProxies.length);
        bool skipInitCall = vm.envOr("SKIP_STRATEGY_DIAMOND_INIT", false);
        StrategyUpgradeOptions memory options = StrategyUpgradeOptions({
            skipUpgradeTo: vm.envOr("SKIP_STRATEGY_UPGRADE_TO", false),
            skipDiamondCut: vm.envOr("SKIP_STRATEGY_DIAMOND_CUT", false),
            diamondCutBeforeUpgrade: vm.envOr("STRATEGY_DCUT_BEFORE_UPGRADE", false),
            strategyInit: address(0),
            strategyInitCalldata: bytes("")
        });
        if (!options.skipDiamondCut && !skipInitCall) {
            options.strategyInit = _getOrDeployStrategyDiamondInit();
            options.strategyInitCalldata = abi.encodeCall(CVStrategyDiamondInit.init, ());
        }

        for (uint256 i = startIndex; i < endIndex; i++) {
            context = _appendStrategyUpgradeActions(context, cvStrategyProxies[i], options);
        }

        return context;
    }

    function _appendCommunityUpgradeActions(
        UpgradeContext memory context,
        address proxy,
        CommunityUpgradeOptions memory options
    ) internal returns (UpgradeContext memory) {
        RegistryCommunity registryCommunity = RegistryCommunity(payable(proxy));
        bool needsUpgradeTo = !options.skipUpgradeTo && _proxyImplementationAddress(proxy) != context.registryImplementation;
        if (!options.skipStrategyTemplate && registryCommunity.strategyTemplate() != context.strategyImplementation) {
            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(proxy, abi.encodeCall(registryCommunity.setStrategyTemplate, (context.strategyImplementation)))
            );
            context.auditWriter =
                _appendAuditEntry(context.auditWriter, "communities", proxy, "setStrategyTemplate", "stale template");
        }

        IDiamond.FacetCut[] memory allCuts = _mergeFacetCuts(
            _buildStaleSelectorRemovalCuts(proxy, context.communityCuts), _buildChangedFacetCuts(proxy, context.communityCuts)
        );
        bool needsDiamondCut = !options.skipDiamondCut && allCuts.length > 0;

        if (options.diamondCutBeforeUpgrade) {
            if (needsDiamondCut) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        proxy,
                        abi.encodeCall(IDiamondCut.diamondCut, (allCuts, options.communityInit, options.communityInitCalldata))
                    )
                );
                context.auditWriter =
                    _appendAuditEntry(context.auditWriter, "communities", proxy, "diamondCut", _communityCutAuditNote(proxy));
            }
            if (needsUpgradeTo) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(proxy, abi.encodeCall(registryCommunity.upgradeTo, (context.registryImplementation)))
                );
                context.auditWriter =
                    _appendAuditEntry(context.auditWriter, "communities", proxy, "upgradeTo", "implementation mismatch");
            }
            return context;
        }

        if (needsUpgradeTo) {
            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(proxy, abi.encodeCall(registryCommunity.upgradeTo, (context.registryImplementation)))
            );
            context.auditWriter =
                _appendAuditEntry(context.auditWriter, "communities", proxy, "upgradeTo", "implementation mismatch");
        }
        if (needsDiamondCut) {
            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(
                    proxy,
                    abi.encodeCall(IDiamondCut.diamondCut, (allCuts, options.communityInit, options.communityInitCalldata))
                )
            );
            context.auditWriter =
                _appendAuditEntry(context.auditWriter, "communities", proxy, "diamondCut", _communityCutAuditNote(proxy));
        }
        return context;
    }

    function _appendStrategyUpgradeActions(
        UpgradeContext memory context,
        address proxy,
        StrategyUpgradeOptions memory options
    ) internal returns (UpgradeContext memory) {
        CVStrategy cvStrategy = CVStrategy(payable(proxy));
        bool needsUpgradeTo = !options.skipUpgradeTo && _proxyImplementationAddress(proxy) != context.strategyImplementation;
        IDiamond.FacetCut[] memory allCuts = _mergeFacetCuts(
            _buildStaleSelectorRemovalCuts(proxy, context.cvCuts), _buildChangedFacetCuts(proxy, context.cvCuts)
        );
        bool needsDiamondCut = !options.skipDiamondCut && allCuts.length > 0;

        if (options.diamondCutBeforeUpgrade) {
            if (needsDiamondCut) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        proxy,
                        abi.encodeCall(IDiamondCut.diamondCut, (allCuts, options.strategyInit, options.strategyInitCalldata))
                    )
                );
                context.auditWriter =
                    _appendAuditEntry(context.auditWriter, "strategies", proxy, "diamondCut", _strategyCutAuditNote(proxy));
            }
            if (needsUpgradeTo) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(proxy, abi.encodeCall(cvStrategy.upgradeTo, (context.strategyImplementation)))
                );
                context.auditWriter =
                    _appendAuditEntry(context.auditWriter, "strategies", proxy, "upgradeTo", "implementation mismatch");
            }
            return context;
        }

        if (needsUpgradeTo) {
            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(proxy, abi.encodeCall(cvStrategy.upgradeTo, (context.strategyImplementation)))
            );
            context.auditWriter =
                _appendAuditEntry(context.auditWriter, "strategies", proxy, "upgradeTo", "implementation mismatch");
        }
        if (needsDiamondCut) {
            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(
                    proxy,
                    abi.encodeCall(IDiamondCut.diamondCut, (allCuts, options.strategyInit, options.strategyInitCalldata))
                )
            );
            context.auditWriter =
                _appendAuditEntry(context.auditWriter, "strategies", proxy, "diamondCut", _strategyCutAuditNote(proxy));
        }
        return context;
    }

    function _initPayloadWriter(address safeOwner, string memory networkJson)
        internal
        returns (JsonWriter memory writer)
    {
        vm.createDir("transaction-builder", true);
        writer.path = string.concat(vm.projectRoot(), "/pkg/contracts/transaction-builder/", CURRENT_NETWORK, "-payload.json");
        string memory payloadHeader = string.concat(
            "{",
            '"version":"1.0",',
            '"chainId":"',
            vm.toString(block.chainid),
            '",',
            '"createdAt":',
            vm.toString(block.timestamp * 1000),
            ",",
            '"meta":{',
            '"name":"Contracts Upgrades Batch",',
            '"description":"Safe Transaction Builder payload to upgrade contracts from Safe owner",',
            '"txBuilderVersion":"1.18.0",',
            '"createdFromSafeAddress":"',
            _addressToString(safeOwner),
            '",',
            '"createdFromOwnerAddress":"',
            _addressToString(msg.sender),
            '",',
            '"hash":"',
            networkJson.readString(getKeyNetwork(".hash")),
            '"},',
            '"transactions":['
        );
        vm.writeFile(writer.path, payloadHeader);
    }

    function _initAuditWriter() internal returns (AuditWriter memory writer) {
        writer.enabled = vm.envOr("WRITE_AUDIT_REPORT", false);
        if (!writer.enabled) return writer;

        vm.createDir("transaction-builder", true);
        writer.path = string.concat(vm.projectRoot(), "/pkg/contracts/transaction-builder/", CURRENT_NETWORK, "-payload-audit.ndjson");
        vm.writeFile(writer.path, "");
    }

    function _appendTransaction(JsonWriter memory writer, string memory transactionJson)
        internal
        returns (JsonWriter memory)
    {
        string memory entry = writer.hasEntries ? string.concat(",", transactionJson) : transactionJson;
        vm.writeLine(writer.path, entry);
        writer.hasEntries = true;
        return writer;
    }

    function _appendAuditEntry(
        AuditWriter memory writer,
        string memory phase,
        address target,
        string memory action,
        string memory note
    ) internal returns (AuditWriter memory) {
        if (!writer.enabled) return writer;

        string memory line = string.concat(
            '{"index":',
            vm.toString(writer.index),
            ',"phase":"',
            phase,
            '","target":"',
            _addressToString(target),
            '","action":"',
            action,
            '","note":"',
            note,
            '"}'
        );
        vm.writeLine(writer.path, line);
        writer.index++;
        return writer;
    }

    function _finalizePayloadWriter(JsonWriter memory writer) internal {
        vm.writeLine(writer.path, "]}");
    }

    function _boundedStartIndex(uint256 requestedStart, uint256 length) internal pure returns (uint256) {
        return requestedStart > length ? length : requestedStart;
    }

    function _boundedEndIndex(uint256 requestedEnd, uint256 length) internal pure returns (uint256) {
        return requestedEnd > length ? length : requestedEnd;
    }

    function _strategyCutAuditNote(address proxy) internal view returns (string memory) {
        return _supportsLoupeIntrospection(proxy) ? "loupe diff" : "no loupe: full desired cuts";
    }

    function _communityCutAuditNote(address proxy) internal view returns (string memory) {
        return _supportsLoupeIntrospection(proxy) ? "loupe diff" : "no loupe: full desired cuts";
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

    function _createTransactionJson(address to, bytes memory data) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"to":"',
                _addressToString(to),
                '","value":"0","data":"',
                _bytesToHexString(data),
                '","operation":0,"contractMethod":{"inputs":[],"name":"","payable":false},"contractInputsValues":{}}'
            )
        );
    }

    function _bytesToHexString(bytes memory _bytes) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + _bytes.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < _bytes.length; i++) {
            str[2 + i * 2] = alphabet[uint8(_bytes[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(str);
    }
}
