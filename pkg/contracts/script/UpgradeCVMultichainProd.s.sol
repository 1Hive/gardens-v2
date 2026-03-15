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

        context.registryFactoryImplementation = deployFactoryImplementation ? address(new RegistryFactory()) : address(0);
        context.registryImplementation = deployRegistryImplementation ? address(new RegistryCommunity()) : address(0);
        context.strategyImplementation = deployStrategyImplementation ? address(new CVStrategy()) : address(0);

        bool needFactoryFacetCuts = doFactory
            && (_isFactoryAction(FactoryAction.SetCommunityFacets) || _isFactoryAction(FactoryAction.SetStrategyFacets));

        if (doCommunities) {
            FacetCuts memory facetCuts = _buildFacetCutsFromSnapshot();
            context.cvCuts = facetCuts.cvCuts;
            context.communityCuts = facetCuts.communityCuts;
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

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            address proxy = registryCommunityProxies[i];
            RegistryCommunity registryCommunity = RegistryCommunity(payable(proxy));

            if (_proxyImplementationAddress(proxy) != context.registryImplementation) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(proxy, abi.encodeCall(registryCommunity.upgradeTo, (context.registryImplementation)))
                );
            }
            if (registryCommunity.strategyTemplate() != context.strategyImplementation) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(
                        proxy, abi.encodeCall(registryCommunity.setStrategyTemplate, (context.strategyImplementation))
                    )
                );
            }

            IDiamond.FacetCut[] memory staleCommunityRemovals =
                _buildStaleSelectorRemovalCuts(proxy, context.communityCuts);
            IDiamond.FacetCut[] memory changedCommunityCuts = _buildChangedFacetCuts(proxy, context.communityCuts);
            uint256 totalCuts = staleCommunityRemovals.length + changedCommunityCuts.length;

            if (totalCuts == 0) continue;

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

            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(
                    proxy,
                    abi.encodeCall(
                        IDiamondCut.diamondCut,
                        (allCuts, address(new RegistryCommunityDiamondInit()), abi.encodeCall(RegistryCommunityDiamondInit.init, ()))
                    )
                )
            );
        }

        return context;
    }

    function _writeStrategyUpgrades(UpgradeContext memory context, string memory networkJson)
        internal
        returns (UpgradeContext memory)
    {
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            address proxy = cvStrategyProxies[i];
            CVStrategy cvStrategy = CVStrategy(payable(proxy));

            if (_proxyImplementationAddress(proxy) != context.strategyImplementation) {
                context.writer = _appendTransaction(
                    context.writer,
                    _createTransactionJson(proxy, abi.encodeCall(cvStrategy.upgradeTo, (context.strategyImplementation)))
                );
            }

            IDiamond.FacetCut[] memory staleStrategyRemovals = _buildStaleSelectorRemovalCuts(proxy, context.cvCuts);
            IDiamond.FacetCut[] memory changedStrategyCuts = _buildChangedFacetCuts(proxy, context.cvCuts);
            uint256 totalCuts = staleStrategyRemovals.length + changedStrategyCuts.length;

            if (totalCuts == 0) continue;

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

            context.writer = _appendTransaction(
                context.writer,
                _createTransactionJson(
                    proxy,
                    abi.encodeCall(
                        IDiamondCut.diamondCut,
                        (allCuts, address(new CVStrategyDiamondInit()), abi.encodeCall(CVStrategyDiamondInit.init, ()))
                    )
                )
            );
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

    function _appendTransaction(JsonWriter memory writer, string memory transactionJson)
        internal
        returns (JsonWriter memory)
    {
        string memory entry = writer.hasEntries ? string.concat(",", transactionJson) : transactionJson;
        vm.writeLine(writer.path, entry);
        writer.hasEntries = true;
        return writer;
    }

    function _finalizePayloadWriter(JsonWriter memory writer) internal {
        vm.writeLine(writer.path, "]}");
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
