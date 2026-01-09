// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
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
import {DiamondConfiguratorBase} from "../test/helpers/DiamondConfigurator.sol";
import {CommunityDiamondConfiguratorBase} from "../test/helpers/CommunityDiamondConfigurator.sol";
import "forge-std/console2.sol";

/**
 * @title UpgradeAllDiamonds
 * @notice Atomic upgrade for both CVStrategy and RegistryCommunity to diamond pattern
 * @dev Generates a single Safe Transaction Builder JSON payload containing all upgrade transactions
 *      Ensures atomicity: all contracts upgrade together or none upgrade (via Safe multisig)
 */
contract UpgradeAllDiamonds is BaseMultiChain, DiamondConfiguratorBase, CommunityDiamondConfiguratorBase {
    using stdJson for string;

    bool internal directBroadcastOverride;

    // CVStrategy facets
    CVAdminFacet public cvAdminFacet;
    CVAllocationFacet public cvAllocationFacet;
    CVDisputeFacet public cvDisputeFacet;
    CVPowerFacet public cvPowerFacet;
    CVProposalFacet public cvProposalFacet;

    // RegistryCommunity facets
    CommunityAdminFacet public communityAdminFacet;
    CommunityMemberFacet public communityMemberFacet;
    CommunityPoolFacet public communityPoolFacet;
    CommunityPowerFacet public communityPowerFacet;
    CommunityStrategyFacet public communityStrategyFacet;

    // Shared DiamondLoupe facet (can be reused)
    DiamondLoupeFacet public loupeFacet;

    function runCurrentNetwork(string memory networkJson) public override {
        bool directBroadcast = directBroadcastOverride || networkJson.readBool(getKeyNetwork(".no-safe"));

        console2.log(
            directBroadcast
                ? "=== Starting Atomic Diamond Upgrade (Direct Broadcast) ==="
                : "=== Starting Atomic Diamond Upgrade (Safe Transaction Builder) ==="
        );
        console2.log("This will upgrade BOTH CVStrategy AND RegistryCommunity to diamond pattern");

        // 1. Deploy all implementations and facets
        console2.log(
            directBroadcast
                ? "\n[1/5] Deploying implementations and facets..."
                : "\n[1/6] Deploying implementations and facets..."
        );

        address strategyImplementation = address(new CVStrategy());
        console2.log("  CVStrategy impl:", strategyImplementation);

        address communityImplementation = address(new RegistryCommunity());
        console2.log("  RegistryCommunity impl:", communityImplementation);

        address collateralVaultTemplate = address(new CollateralVault());
        console2.log("  CollateralVault template:", collateralVaultTemplate);

        // Deploy CVStrategy facets
        cvAdminFacet = new CVAdminFacet();
        console2.log("  CVAdminFacet:", address(cvAdminFacet));

        cvAllocationFacet = new CVAllocationFacet();
        console2.log("  CVAllocationFacet:", address(cvAllocationFacet));

        cvDisputeFacet = new CVDisputeFacet();
        console2.log("  CVDisputeFacet:", address(cvDisputeFacet));

        cvPowerFacet = new CVPowerFacet();
        console2.log("  CVPowerFacet:", address(cvPowerFacet));

        cvProposalFacet = new CVProposalFacet();
        console2.log("  CVProposalFacet:", address(cvProposalFacet));

        // Deploy RegistryCommunity facets
        communityAdminFacet = new CommunityAdminFacet();
        console2.log("  CommunityAdminFacet:", address(communityAdminFacet));

        communityMemberFacet = new CommunityMemberFacet();
        console2.log("  CommunityMemberFacet:", address(communityMemberFacet));

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
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));

        // Build facet cuts
        IDiamond.FacetCut[] memory cvCuts = _buildCVFacetCuts();
        IDiamond.FacetCut[] memory communityCuts = _buildCommunityFacetCuts();

        if (directBroadcast) {
            RegistryFactory registryFactory = RegistryFactory(payable(registryFactoryProxy));
            _executeDirectUpgrades(
                registryFactory,
                registryFactoryProxy,
                registryCommunityProxies,
                cvStrategyProxies,
                strategyImplementation,
                communityImplementation,
                collateralVaultTemplate,
                cvCuts,
                communityCuts
            );
        } else {
            address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
            address safeOwner = ProxyOwner(proxyOwner).owner();
            _generateSafeTransactions(
                registryFactoryProxy,
                registryCommunityProxies,
                cvStrategyProxies,
                strategyImplementation,
                communityImplementation,
                collateralVaultTemplate,
                cvCuts,
                communityCuts,
                safeOwner,
                networkJson
            );
        }

        console2.log("\n=== Summary ===");
        console2.log("Registry Factory: %s", registryFactoryProxy);
        console2.log("Registry Communities: %s", registryCommunityProxies.length);
        console2.log("CV Strategies: %s", cvStrategyProxies.length);
        if (!directBroadcast) {
            uint256 totalTxs = 3 + // Factory templates (strategy + community + collateral vault)
                (registryCommunityProxies.length * 2) + // Community setStrategyTemplate + setCollateralVaultTemplate
                (cvStrategyProxies.length * 3) + // CV upgradeTo + diamondCut + setCollateralVaultTemplate
                (registryCommunityProxies.length * 2); // Community upgradeTo + diamondCut
            console2.log("Total atomic transactions: %s", totalTxs);
        }
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

        console2.log("\n[3/5] Updating RegistryCommunity strategy templates...");
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity registryCommunity = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            registryCommunity.setStrategyTemplate(strategyImplementation);
            registryCommunity.setCollateralVaultTemplate(collateralVaultTemplate);
            console2.log("  Community", i + 1, "templates updated:", registryCommunityProxies[i]);
        }

        console2.log("\n[4/5] Upgrading CVStrategy proxies and applying diamond cuts...");
        CVStrategyDiamondInit cvInitContract = new CVStrategyDiamondInit();
        console2.log("  CVStrategyDiamondInit deployed:", address(cvInitContract));

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategy cvStrategy = CVStrategy(payable(address(cvStrategyProxies[i])));
            cvStrategy.upgradeTo(strategyImplementation);
            cvStrategy.diamondCut(cvCuts, address(cvInitContract), abi.encodeCall(CVStrategyDiamondInit.init, ()));
            cvStrategy.setCollateralVaultTemplate(collateralVaultTemplate);
            console2.log("  Strategy", i + 1, "upgraded with diamond facets:", cvStrategyProxies[i]);
        }

        console2.log("\n[5/5] Upgrading RegistryCommunity proxies and applying diamond cuts...");
        RegistryCommunityDiamondInit communityInitContract = new RegistryCommunityDiamondInit();
        console2.log("  RegistryCommunityDiamondInit deployed:", address(communityInitContract));

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity community = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            community.upgradeTo(communityImplementation);
            community.diamondCut(communityCuts, address(communityInitContract), abi.encodeCall(RegistryCommunityDiamondInit.init, ()));
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
        console2.log("\n[2/6] Building RegistryFactory template updates...");
        string memory json = string(abi.encodePacked("["));

        // 1. Update Factory CVStrategy template
        json = string(
            abi.encodePacked(json, _createTransactionJson(params.registryFactoryProxy,
                abi.encodeWithSelector(RegistryFactory.setStrategyTemplate.selector, params.strategyImplementation)), ",")
        );
        console2.log("  Factory strategy template update added");

        // 2. Update Factory RegistryCommunity template
        json = string(
            abi.encodePacked(json, _createTransactionJson(params.registryFactoryProxy,
                abi.encodeWithSelector(RegistryFactory.setRegistryCommunityTemplate.selector, params.communityImplementation)), ",")
        );
        console2.log("  Factory community template update added");

        json = string(
            abi.encodePacked(json, _createTransactionJson(params.registryFactoryProxy,
                abi.encodeWithSelector(RegistryFactory.setCollateralVaultTemplate.selector, params.collateralVaultTemplate)), ",")
        );
        console2.log("  Factory CollateralVault template update added");

        console2.log("\n[3/6] Building RegistryCommunity strategy template updates...");
        bytes memory communitySetStrategyData =
            abi.encodeWithSelector(RegistryCommunity.setStrategyTemplate.selector, params.strategyImplementation);
        bytes memory communitySetCollateralVaultData =
            abi.encodeWithSelector(RegistryCommunity.setCollateralVaultTemplate.selector, params.collateralVaultTemplate);
        for (uint256 i = 0; i < params.registryCommunityProxies.length; i++) {
            json = string(
                abi.encodePacked(
                    json, _createTransactionJson(params.registryCommunityProxies[i], communitySetStrategyData), ","
                )
            );
            json = string(
                abi.encodePacked(
                    json, _createTransactionJson(params.registryCommunityProxies[i], communitySetCollateralVaultData), ","
                )
            );
            console2.log("  Community", i + 1, "added to batch:", params.registryCommunityProxies[i]);
        }

        json = _buildCVStrategyTransactions(
            json,
            params.cvStrategyProxies,
            params.strategyImplementation,
            params.collateralVaultTemplate,
            cvCuts
        );

        json = _buildCommunityTransactions(json, params.registryCommunityProxies, params.communityImplementation, communityCuts);

        json = string(abi.encodePacked(_removeLastChar(json), "]"));

        _writePayloadFile(json, params.safeOwner, params.networkJson);

        console2.log("\n[6/6] Atomic Safe Transaction Builder JSON generated!");
    }

    function _buildCVStrategyTransactions(
        string memory json,
        address[] memory cvStrategyProxies,
        address strategyImplementation,
        address collateralVaultTemplate,
        IDiamond.FacetCut[] memory cvCuts
    ) internal returns (string memory) {
        console2.log("\n[4/6] Building CVStrategy upgrade + diamond cut transactions...");
        CVStrategyDiamondInit cvInitContract = new CVStrategyDiamondInit();
        console2.log("  CVStrategyDiamondInit deployed:", address(cvInitContract));

        bytes4 upgradeSelector = bytes4(keccak256("upgradeTo(address)"));
        bytes memory cvDiamondCutCalldata =
            abi.encodeWithSelector(CVStrategy.diamondCut.selector, cvCuts, address(cvInitContract), abi.encodeCall(CVStrategyDiamondInit.init, ()));
        bytes memory cvUpgradeCalldata = abi.encodeWithSelector(upgradeSelector, strategyImplementation);
        bytes memory cvSetCollateralVaultCalldata =
            abi.encodeWithSelector(CVStrategy.setCollateralVaultTemplate.selector, collateralVaultTemplate);

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            json = string(abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], cvUpgradeCalldata), ","));
            json = string(abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], cvDiamondCutCalldata), ","));
            json = string(
                abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], cvSetCollateralVaultCalldata), ",")
            );
            console2.log("  Strategy", i + 1, "added to batch:", cvStrategyProxies[i]);
        }

        return json;
    }

    function _buildCommunityTransactions(
        string memory json,
        address[] memory registryCommunityProxies,
        address communityImplementation,
        IDiamond.FacetCut[] memory communityCuts
    ) internal returns (string memory) {
        console2.log("\n[5/6] Building RegistryCommunity upgrade + diamond cut transactions...");
        RegistryCommunityDiamondInit communityInitContract = new RegistryCommunityDiamondInit();
        console2.log("  RegistryCommunityDiamondInit deployed:", address(communityInitContract));

        bytes4 upgradeSelector = bytes4(keccak256("upgradeTo(address)"));
        bytes memory communityDiamondCutCalldata = abi.encodeWithSelector(
            RegistryCommunity.diamondCut.selector, communityCuts, address(communityInitContract), abi.encodeCall(RegistryCommunityDiamondInit.init, ())
        );
        bytes memory communityUpgradeCalldata = abi.encodeWithSelector(upgradeSelector, communityImplementation);

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            json = string(
                abi.encodePacked(json, _createTransactionJson(registryCommunityProxies[i], communityUpgradeCalldata), ",")
            );
            json = string(
                abi.encodePacked(json, _createTransactionJson(registryCommunityProxies[i], communityDiamondCutCalldata), ",")
            );
            console2.log("  Community", i + 1, "added to batch:", registryCommunityProxies[i]);
        }

        return json;
    }

    function _buildCVFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = _buildFacetCuts(cvAdminFacet, cvAllocationFacet, cvDisputeFacet, cvPowerFacet, cvProposalFacet);
        cuts = new IDiamond.FacetCut[](6);
        for (uint256 i = 0; i < 5; i++) {
            cuts[i] = baseCuts[i];
        }
        cuts[5] = _buildLoupeFacetCut(loupeFacet);
    }

    function _buildCommunityFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = CommunityDiamondConfiguratorBase._buildFacetCuts(
            communityAdminFacet, communityMemberFacet, communityPoolFacet, communityPowerFacet, communityStrategyFacet
        );
        cuts = new IDiamond.FacetCut[](6);
        for (uint256 i = 0; i < 5; i++) {
            cuts[i] = baseCuts[i];
        }
        cuts[5] = _buildLoupeFacetCut(loupeFacet);
    }

    // Override to resolve ambiguity between DiamondConfiguratorBase and CommunityDiamondConfiguratorBase
    function _buildLoupeFacetCut(DiamondLoupeFacet _loupeFacet) internal pure override(DiamondConfiguratorBase, CommunityDiamondConfiguratorBase) returns (IDiamond.FacetCut memory) {
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        return IDiamond.FacetCut({
            facetAddress: address(_loupeFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: loupeSelectors
        });
    }

    function _writePayloadFile(string memory transactionsJson, address safeOwner, string memory networkJson) internal {
        string memory payload = string.concat(
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
            '"transactions":',
            transactionsJson,
            "}"
        );

        vm.createDir("transaction-builder", true);
        string memory path = string.concat(
            vm.projectRoot(), "/pkg/contracts/transaction-builder/", CURRENT_NETWORK, "-atomic-diamond-upgrade-payload.json"
        );

        vm.writeFile(path, payload);
        console2.log("  File: %s", path);
    }

    function _removeLastChar(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        require(inputBytes.length > 0, "String is empty");
        bytes memory trimmedBytes = new bytes(inputBytes.length - 1);
        for (uint256 i = 0; i < inputBytes.length - 1; i++) {
            trimmedBytes[i] = inputBytes[i];
        }
        return string(trimmedBytes);
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
