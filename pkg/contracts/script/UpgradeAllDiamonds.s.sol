// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {CVSyncPowerFacet} from "../src/CVStrategy/facets/CVSyncPowerFacet.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {StrategyDiamondConfiguratorBase} from "../test/helpers/StrategyDiamondConfigurator.sol";
import {CommunityDiamondConfiguratorBase} from "../test/helpers/CommunityDiamondConfigurator.sol";
import "forge-std/console2.sol";

/**
 * @title UpgradeAllDiamonds
 * @notice Atomic upgrade for both CVStrategy and RegistryCommunity to diamond pattern
 * @dev Generates a single Safe Transaction Builder JSON payload containing all upgrade transactions
 *      Ensures atomicity: all contracts upgrade together or none upgrade (via Safe multisig)
 */
contract UpgradeAllDiamonds is BaseMultiChain, StrategyDiamondConfiguratorBase, CommunityDiamondConfiguratorBase {
    using stdJson for string;

    bool internal directBroadcastOverride;
    bytes32 constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    // CVStrategy facets
    CVAdminFacet public cvAdminFacet;
    CVAllocationFacet public cvAllocationFacet;
    CVDisputeFacet public cvDisputeFacet;
    CVPauseFacet public cvPauseFacet;
    CVPowerFacet public cvPowerFacet;
    CVProposalFacet public cvProposalFacet;
    CVSyncPowerFacet public cvSyncPowerFacet;

    // RegistryCommunity facets
    CommunityAdminFacet public communityAdminFacet;
    CommunityMemberFacet public communityMemberFacet;
    CommunityPauseFacet public communityPauseFacet;
    CommunityPoolFacet public communityPoolFacet;
    CommunityPowerFacet public communityPowerFacet;
    CommunityStrategyFacet public communityStrategyFacet;

    // Shared DiamondLoupe facet (can be reused)
    DiamondLoupeFacet public loupeFacet;

    struct RunContext {
        address registryFactoryProxy;
        address[] registryCommunityProxies;
        address[] cvStrategyProxies;
        address strategyImplementation;
        address communityImplementation;
        address collateralVaultTemplate;
        IDiamond.FacetCut[] cvCuts;
        IDiamond.FacetCut[] communityCuts;
    }

    struct DeploymentCache {
        address cached;
        bool reused;
    }

    function runCurrentNetwork(string memory networkJson) public override {
        bool directBroadcast = directBroadcastOverride || networkJson.readBool(getKeyNetwork(".no-safe"));

        console2.log(
            directBroadcast
                ? "=== Starting Atomic Diamond Upgrade (Direct Broadcast) ==="
                : "=== Starting Atomic Diamond Upgrade (Safe Transaction Builder) ==="
        );
        console2.log("This will upgrade BOTH CVStrategy AND RegistryCommunity to diamond pattern");

        console2.log(
            directBroadcast
                ? "\n[1/5] Deploying implementations and facets..."
                : "\n[1/6] Deploying implementations and facets..."
        );

        RunContext memory context = _buildRunContext(networkJson);
        _executeRun(networkJson, directBroadcast, context);

        console2.log("\n=== Summary ===");
        console2.log("Registry Factory: %s", context.registryFactoryProxy);
        console2.log("Registry Communities: %s", context.registryCommunityProxies.length);
        console2.log("CV Strategies: %s", context.cvStrategyProxies.length);
        if (!directBroadcast) {
            uint256 totalTxs = 3 // Factory templates (strategy + community + collateral vault)
                + (context.registryCommunityProxies.length * 2) // Community setStrategyTemplate + setCollateralVaultTemplate
                + (context.cvStrategyProxies.length * 3) // CV upgradeTo + diamondCut + setCollateralVaultTemplate
                + (context.registryCommunityProxies.length * 2); // Community upgradeTo + diamondCut
            console2.log("Total atomic transactions: %s", totalTxs);
        }
    }

    function _buildRunContext(string memory networkJson) internal returns (RunContext memory context) {
        DeploymentCache memory strategyCache = _reuseDeployment(
            "CVStrategy impl",
            _readAddressOrZero(".IMPLEMENTATIONS.CV_STRATEGY"),
            _runtimeCodeHash("src/CVStrategy/CVStrategy.sol:CVStrategy")
        );
        context.strategyImplementation = strategyCache.reused ? strategyCache.cached : address(new CVStrategy());
        _logDeploymentResult("CVStrategy impl", strategyCache.reused, context.strategyImplementation);
        if (!strategyCache.reused) {
            _writeNetworkAddress(".IMPLEMENTATIONS.CV_STRATEGY", context.strategyImplementation);
        }

        DeploymentCache memory communityCache = _reuseDeployment(
            "RegistryCommunity impl",
            _readAddressOrZero(".IMPLEMENTATIONS.REGISTRY_COMMUNITY"),
            _runtimeCodeHash("src/RegistryCommunity/RegistryCommunity.sol:RegistryCommunity")
        );
        context.communityImplementation =
            communityCache.reused ? communityCache.cached : address(new RegistryCommunity());
        _logDeploymentResult("RegistryCommunity impl", communityCache.reused, context.communityImplementation);
        if (!communityCache.reused) {
            _writeNetworkAddress(".IMPLEMENTATIONS.REGISTRY_COMMUNITY", context.communityImplementation);
        }

        DeploymentCache memory collateralCache = _reuseDeployment(
            "CollateralVault template",
            _readAddressOrZero(".IMPLEMENTATIONS.COLLATERAL_VAULT"),
            _runtimeCodeHash("src/CollateralVault.sol:CollateralVault")
        );
        context.collateralVaultTemplate =
            collateralCache.reused ? collateralCache.cached : address(new CollateralVault());
        _logDeploymentResult("CollateralVault template", collateralCache.reused, context.collateralVaultTemplate);
        if (!collateralCache.reused) {
            _writeNetworkAddress(".IMPLEMENTATIONS.COLLATERAL_VAULT", context.collateralVaultTemplate);
        }

        // Deploy CVStrategy facets
        cvAdminFacet = new CVAdminFacet();
        console2.log("  CVAdminFacet:", address(cvAdminFacet));

        cvAllocationFacet = new CVAllocationFacet();
        console2.log("  CVAllocationFacet:", address(cvAllocationFacet));

        cvDisputeFacet = new CVDisputeFacet();
        console2.log("  CVDisputeFacet:", address(cvDisputeFacet));

        cvPauseFacet = new CVPauseFacet();
        console2.log("  CVPauseFacet:", address(cvPauseFacet));

        cvPowerFacet = new CVPowerFacet();
        console2.log("  CVPowerFacet:", address(cvPowerFacet));

        cvProposalFacet = new CVProposalFacet();
        console2.log("  CVProposalFacet:", address(cvProposalFacet));

        cvSyncPowerFacet = new CVSyncPowerFacet();
        console2.log("  CVSyncPowerFacet:", address(cvSyncPowerFacet));

        // Deploy RegistryCommunity facets
        communityAdminFacet = new CommunityAdminFacet();
        console2.log("  CommunityAdminFacet:", address(communityAdminFacet));

        communityMemberFacet = new CommunityMemberFacet();
        console2.log("  CommunityMemberFacet:", address(communityMemberFacet));

        communityPauseFacet = new CommunityPauseFacet();
        console2.log("  CommunityPauseFacet:", address(communityPauseFacet));

        communityPoolFacet = new CommunityPoolFacet();
        console2.log("  CommunityPoolFacet:", address(communityPoolFacet));

        communityPowerFacet = new CommunityPowerFacet();
        console2.log("  CommunityPowerFacet:", address(communityPowerFacet));

        communityStrategyFacet = new CommunityStrategyFacet();
        console2.log("  CommunityStrategyFacet:", address(communityStrategyFacet));

        // Deploy shared DiamondLoupe facet
        loupeFacet = new DiamondLoupeFacet();
        console2.log("  DiamondLoupeFacet (shared):", address(loupeFacet));

        // Read network configuration
        context.registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        context.registryCommunityProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        context.cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));

        // Build facet cuts
        context.cvCuts = _buildCVFacetCuts();
        context.communityCuts = _buildCommunityFacetCuts();
    }

    function _reuseDeployment(string memory label, address cached, bytes32 expectedCodeHash)
        internal
        returns (DeploymentCache memory result)
    {
        result.cached = cached;
        if (cached == address(0)) {
            return result;
        }

        if (cached.code.length == 0) {
            console2.log("  Cached", label, "has no code; redeploying");
            result.cached = address(0);
            return result;
        }

        if (cached.codehash != expectedCodeHash) {
            console2.log("  Cached", label, "bytecode mismatch; redeploying");
            result.cached = address(0);
            return result;
        }

        result.reused = true;
    }

    function _logDeploymentResult(string memory label, bool reused, address deployed) internal {
        if (reused) {
            console2.log("  Reusing", label, ":", deployed);
        } else {
            console2.log("  Deployed", label, ":", deployed);
        }
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
        bytes memory result = vm.ffi(inputs);
        string memory value = _trim(string(result));
        if (bytes(value).length == 0) {
            return address(0);
        }
        if (keccak256(bytes(value)) == keccak256(bytes("null"))) {
            return address(0);
        }
        return _parseAddress(value);
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
        if (value >= 48 && value <= 57) {
            return value - 48;
        }
        if (value >= 65 && value <= 70) {
            return value - 55;
        }
        if (value >= 97 && value <= 102) {
            return value - 87;
        }
        return 255;
    }

    function _runtimeCodeHash(string memory artifactId) internal returns (bytes32) {
        bytes memory deployedCode = vm.getDeployedCode(artifactId);
        if (deployedCode.length == 0) {
            revert("Missing deployed bytecode for artifact");
        }
        return keccak256(deployedCode);
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
        vm.ffi(inputs);
        console2.log("  Cached deployment in networks.json:", key);
    }

    function _executeRun(string memory networkJson, bool directBroadcast, RunContext memory context) internal {
        if (directBroadcast) {
            RegistryFactory registryFactory = RegistryFactory(payable(context.registryFactoryProxy));
            _executeDirectUpgrades(
                registryFactory,
                context.registryFactoryProxy,
                context.registryCommunityProxies,
                context.cvStrategyProxies,
                context.strategyImplementation,
                context.communityImplementation,
                context.collateralVaultTemplate,
                context.cvCuts,
                context.communityCuts
            );
        } else {
            _executeSafeUpgrade(networkJson, context);
        }
    }

    function _currentImplementation(address proxy) internal view returns (address) {
        bytes32 data = vm.load(proxy, IMPLEMENTATION_SLOT);
        return address(uint160(uint256(data)));
    }

    function _executeSafeUpgrade(string memory networkJson, RunContext memory context) internal {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address safeOwner = ProxyOwner(proxyOwner).owner();
        _generateSafeTransactions(
            context.registryFactoryProxy,
            context.registryCommunityProxies,
            context.cvStrategyProxies,
            context.strategyImplementation,
            context.communityImplementation,
            context.collateralVaultTemplate,
            context.cvCuts,
            context.communityCuts,
            safeOwner,
            networkJson
        );
    }

    function _executeDirectUpgrades(
        RegistryFactory registryFactory,
        address registryFactoryProxy,
        address[] memory registryCommunityProxies,
        address[] memory cvStrategyProxies,
        address strategyImplementation,
        address communityImplementation,
        address collateralVaultTemplate,
        IDiamond.FacetCut[] memory cvCuts,
        IDiamond.FacetCut[] memory communityCuts
    ) internal {
        console2.log("\n[2/5] Updating RegistryFactory templates...");
        registryFactory.setStrategyTemplate(strategyImplementation);
        console2.log("  Strategy template updated:", registryFactoryProxy);

        registryFactory.setRegistryCommunityTemplate(communityImplementation);
        console2.log("  Community template updated:", registryFactoryProxy);

        registryFactory.setCollateralVaultTemplate(collateralVaultTemplate);
        console2.log("  CollateralVault template updated:", registryFactoryProxy);

        registryFactory.setCommunityFacets(
            communityCuts, address(new RegistryCommunityDiamondInit()), abi.encodeCall(RegistryCommunityDiamondInit.init, ())
        );
        console2.log("  Community facets updated:", registryFactoryProxy);

        registryFactory.setStrategyFacets(
            cvCuts, address(new CVStrategyDiamondInit()), abi.encodeCall(CVStrategyDiamondInit.init, ())
        );
        console2.log("  Strategy facets updated:", registryFactoryProxy);

        console2.log("\n[3/5] Updating RegistryCommunity strategy templates...");
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity registryCommunity = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            registryCommunity.setStrategyTemplate(strategyImplementation);
            registryCommunity.setCollateralVaultTemplate(collateralVaultTemplate);
            registryCommunity.setStrategyFacets(
                cvCuts, address(new CVStrategyDiamondInit()), abi.encodeCall(CVStrategyDiamondInit.init, ())
            );
            console2.log("  Community", i + 1, "templates updated:", registryCommunityProxies[i]);
        }

        console2.log("\n[4/5] Upgrading CVStrategy proxies and applying diamond cuts...");
        CVStrategyDiamondInit cvInitContract = new CVStrategyDiamondInit();
        console2.log("  CVStrategyDiamondInit deployed:", address(cvInitContract));

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategy cvStrategy = CVStrategy(payable(address(cvStrategyProxies[i])));
            address currentImplementation = _currentImplementation(address(cvStrategyProxies[i]));
            if (currentImplementation != strategyImplementation) {
                cvStrategy.upgradeTo(strategyImplementation);
            } else {
                console2.log("  Strategy", i + 1, "already at implementation; skipping upgradeTo");
            }
            cvStrategy.diamondCut(cvCuts, address(cvInitContract), abi.encodeCall(CVStrategyDiamondInit.init, ()));
            cvStrategy.setCollateralVaultTemplate(collateralVaultTemplate);
            console2.log("  Strategy", i + 1, "upgraded with diamond facets:", cvStrategyProxies[i]);
        }

        console2.log("\n[5/5] Upgrading RegistryCommunity proxies and applying diamond cuts...");
        RegistryCommunityDiamondInit communityInitContract = new RegistryCommunityDiamondInit();
        console2.log("  RegistryCommunityDiamondInit deployed:", address(communityInitContract));

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity community = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            address currentImplementation = _currentImplementation(address(registryCommunityProxies[i]));
            if (currentImplementation != communityImplementation) {
                community.upgradeTo(communityImplementation);
            } else {
                console2.log("  Community", i + 1, "already at implementation; skipping upgradeTo");
            }
            community.diamondCut(
                communityCuts, address(communityInitContract), abi.encodeCall(RegistryCommunityDiamondInit.init, ())
            );
            console2.log("  Community", i + 1, "upgraded with diamond facets:", registryCommunityProxies[i]);
        }
    }

    struct UpgradeParams {
        address registryFactoryProxy;
        address[] registryCommunityProxies;
        address[] cvStrategyProxies;
        address strategyImplementation;
        address communityImplementation;
        address collateralVaultTemplate;
        address safeOwner;
        string networkJson;
    }

    struct JsonWriter {
        string path;
        bool hasEntries;
    }

    function _generateSafeTransactions(
        address registryFactoryProxy,
        address[] memory registryCommunityProxies,
        address[] memory cvStrategyProxies,
        address strategyImplementation,
        address communityImplementation,
        address collateralVaultTemplate,
        IDiamond.FacetCut[] memory cvCuts,
        IDiamond.FacetCut[] memory communityCuts,
        address safeOwner,
        string memory networkJson
    ) internal {
        UpgradeParams memory params = UpgradeParams({
            registryFactoryProxy: registryFactoryProxy,
            registryCommunityProxies: registryCommunityProxies,
            cvStrategyProxies: cvStrategyProxies,
            strategyImplementation: strategyImplementation,
            communityImplementation: communityImplementation,
            collateralVaultTemplate: collateralVaultTemplate,
            safeOwner: safeOwner,
            networkJson: networkJson
        });

        JsonWriter memory writer = _initPayloadWriter(params.safeOwner, params.networkJson);
        console2.log("\n[2/6] Building RegistryFactory template updates...");
        writer = _appendTransaction(
            writer,
            _createTransactionJson(
                params.registryFactoryProxy,
                abi.encodeWithSelector(RegistryFactory.setStrategyTemplate.selector, params.strategyImplementation)
            )
        );
        console2.log("  Factory strategy template update added");

        writer = _appendTransaction(
            writer,
            _createTransactionJson(
                params.registryFactoryProxy,
                abi.encodeWithSelector(
                    RegistryFactory.setRegistryCommunityTemplate.selector, params.communityImplementation
                )
            )
        );
        console2.log("  Factory community template update added");

        writer = _appendTransaction(
            writer,
            _createTransactionJson(
                params.registryFactoryProxy,
                abi.encodeWithSelector(
                    RegistryFactory.setCollateralVaultTemplate.selector, params.collateralVaultTemplate
                )
            )
        );
        console2.log("  Factory CollateralVault template update added");

        IDiamondCut.FacetCut[] memory cvCutsLocal = _buildCVFacetCuts();
        IDiamondCut.FacetCut[] memory communityCutsLocal = _buildCommunityFacetCuts();
        writer = _appendTransaction(
            writer,
            _createTransactionJson(
                params.registryFactoryProxy,
                abi.encodeWithSelector(
                    RegistryFactory.setCommunityFacets.selector,
                    communityCutsLocal,
                    address(new RegistryCommunityDiamondInit()),
                    abi.encodeCall(RegistryCommunityDiamondInit.init, ())
                )
            )
        );
        console2.log("  Factory community facets update added");

        writer = _appendTransaction(
            writer,
            _createTransactionJson(
                params.registryFactoryProxy,
                abi.encodeWithSelector(
                    RegistryFactory.setStrategyFacets.selector,
                    cvCutsLocal,
                    address(new CVStrategyDiamondInit()),
                    abi.encodeCall(CVStrategyDiamondInit.init, ())
                )
            )
        );
        console2.log("  Factory strategy facets update added");

        console2.log("\n[3/6] Building RegistryCommunity strategy template updates...");
        bytes memory communitySetStrategyData =
            abi.encodeWithSelector(RegistryCommunity.setStrategyTemplate.selector, params.strategyImplementation);
        bytes memory communitySetCollateralVaultData = abi.encodeWithSelector(
            RegistryCommunity.setCollateralVaultTemplate.selector, params.collateralVaultTemplate
        );
        bytes memory communitySetStrategyFacetsData = abi.encodeWithSelector(
            RegistryCommunity.setStrategyFacets.selector,
            cvCuts,
            address(new CVStrategyDiamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );
        for (uint256 i = 0; i < params.registryCommunityProxies.length; i++) {
            writer = _appendTransaction(
                writer, _createTransactionJson(params.registryCommunityProxies[i], communitySetStrategyData)
            );
            writer = _appendTransaction(
                writer, _createTransactionJson(params.registryCommunityProxies[i], communitySetCollateralVaultData)
            );
            writer = _appendTransaction(
                writer, _createTransactionJson(params.registryCommunityProxies[i], communitySetStrategyFacetsData)
            );
            console2.log("  Community", i + 1, "added to batch:", params.registryCommunityProxies[i]);
        }

        writer = _buildCVStrategyTransactions(
            writer, params.cvStrategyProxies, params.strategyImplementation, params.collateralVaultTemplate, cvCuts
        );

        writer = _buildCommunityTransactions(
            writer, params.registryCommunityProxies, params.communityImplementation, communityCuts
        );

        _finalizePayloadWriter(writer);

        console2.log("\n[6/6] Atomic Safe Transaction Builder JSON generated!");
    }

    function _buildCVStrategyTransactions(
        JsonWriter memory writer,
        address[] memory cvStrategyProxies,
        address strategyImplementation,
        address collateralVaultTemplate,
        IDiamond.FacetCut[] memory cvCuts
    ) internal returns (JsonWriter memory) {
        console2.log("\n[4/6] Building CVStrategy upgrade + diamond cut transactions...");
        CVStrategyDiamondInit cvInitContract = new CVStrategyDiamondInit();
        console2.log("  CVStrategyDiamondInit deployed:", address(cvInitContract));

        bytes4 upgradeSelector = bytes4(keccak256("upgradeTo(address)"));
        bytes memory cvDiamondCutCalldata = abi.encodeWithSelector(
            CVStrategy.diamondCut.selector,
            cvCuts,
            address(cvInitContract),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );
        bytes memory cvUpgradeCalldata = abi.encodeWithSelector(upgradeSelector, strategyImplementation);
        bytes memory cvSetCollateralVaultCalldata =
            abi.encodeWithSelector(CVStrategy.setCollateralVaultTemplate.selector, collateralVaultTemplate);

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            address currentImplementation = _currentImplementation(address(cvStrategyProxies[i]));
            if (currentImplementation != strategyImplementation) {
                writer = _appendTransaction(writer, _createTransactionJson(cvStrategyProxies[i], cvUpgradeCalldata));
            } else {
                console2.log("  Strategy", i + 1, "already at implementation; skipping upgradeTo");
            }
            writer = _appendTransaction(writer, _createTransactionJson(cvStrategyProxies[i], cvDiamondCutCalldata));
            writer =
                _appendTransaction(writer, _createTransactionJson(cvStrategyProxies[i], cvSetCollateralVaultCalldata));
            console2.log("  Strategy", i + 1, "added to batch:", cvStrategyProxies[i]);
        }

        return writer;
    }

    function _buildCommunityTransactions(
        JsonWriter memory writer,
        address[] memory registryCommunityProxies,
        address communityImplementation,
        IDiamond.FacetCut[] memory communityCuts
    ) internal returns (JsonWriter memory) {
        console2.log("\n[5/6] Building RegistryCommunity upgrade + diamond cut transactions...");
        RegistryCommunityDiamondInit communityInitContract = new RegistryCommunityDiamondInit();
        console2.log("  RegistryCommunityDiamondInit deployed:", address(communityInitContract));

        bytes4 upgradeSelector = bytes4(keccak256("upgradeTo(address)"));
        bytes memory communityDiamondCutCalldata = abi.encodeWithSelector(
            RegistryCommunity.diamondCut.selector,
            communityCuts,
            address(communityInitContract),
            abi.encodeCall(RegistryCommunityDiamondInit.init, ())
        );
        bytes memory communityUpgradeCalldata = abi.encodeWithSelector(upgradeSelector, communityImplementation);

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            address currentImplementation = _currentImplementation(address(registryCommunityProxies[i]));
            if (currentImplementation != communityImplementation) {
                writer = _appendTransaction(
                    writer, _createTransactionJson(registryCommunityProxies[i], communityUpgradeCalldata)
                );
            } else {
                console2.log("  Community", i + 1, "already at implementation; skipping upgradeTo");
            }
            writer = _appendTransaction(
                writer, _createTransactionJson(registryCommunityProxies[i], communityDiamondCutCalldata)
            );
            console2.log("  Community", i + 1, "added to batch:", registryCommunityProxies[i]);
        }

        return writer;
    }

    function _buildCVFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts =
            _buildFacetCuts(
                cvAdminFacet,
                cvAllocationFacet,
                cvDisputeFacet,
                cvPauseFacet,
                cvPowerFacet,
                cvProposalFacet,
                cvSyncPowerFacet
            );
        cuts = new IDiamond.FacetCut[](8);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 7; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    function _buildCommunityFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = CommunityDiamondConfiguratorBase._buildFacetCuts(
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

    // Override to resolve ambiguity between DiamondConfiguratorBase and CommunityDiamondConfiguratorBase
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

    function _initPayloadWriter(address safeOwner, string memory networkJson)
        internal
        returns (JsonWriter memory writer)
    {
        vm.createDir("transaction-builder", true);
        writer.path = string.concat(
            vm.projectRoot(),
            "/pkg/contracts/transaction-builder/",
            CURRENT_NETWORK,
            "-atomic-diamond-upgrade-payload.json"
        );
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
            '"name":"Atomic Diamond Upgrade: CVStrategy + RegistryCommunity",',
            '"description":"Atomically upgrades both CVStrategy and RegistryCommunity to diamond pattern. All contracts upgrade together or none upgrade.",',
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
        console2.log("  File: %s", writer.path);
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
