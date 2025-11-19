// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import "forge-std/console2.sol";

/**
 * @title UpgradeRegistryCommunityDiamond
 * @notice Upgrades RegistryCommunity contracts to diamond pattern with facets
 * @dev Can broadcast upgrades directly or generate Safe transaction payloads via a flag
 */
contract UpgradeRegistryCommunityDiamond is BaseMultiChain {
    using stdJson for string;

    bool internal directBroadcastOverride;

    // Deployed facet addresses
    CommunityAdminFacet public adminFacet;
    CommunityMemberFacet public memberFacet;
    CommunityPoolFacet public poolFacet;
    CommunityPowerFacet public powerFacet;
    CommunityStrategyFacet public strategyFacet;
    DiamondLoupeFacet public loupeFacet;

    function runCurrentNetwork(string memory networkJson) public override {
        // Auto-detect direct broadcast mode based on network config
        // Testnets with "no-safe": true will use direct broadcast
        // Production networks will generate Safe Transaction Builder JSON
        bool directBroadcast = directBroadcastOverride || networkJson.readBool(getKeyNetwork(".no-safe"));
        console2.log(
            directBroadcast
                ? "=== Starting RegistryCommunity Diamond Pattern Upgrade (Direct Broadcast) ==="
                : "=== Starting RegistryCommunity Diamond Pattern Upgrade (Safe Transaction Builder) ==="
        );

        // 1. Deploy new implementation and facets
        console2.log(
            directBroadcast
                ? "\n[1/3] Deploying new RegistryCommunity implementation and facets..."
                : "\n[1/4] Deploying new RegistryCommunity implementation and facets..."
        );
        address communityImplementation = address(new RegistryCommunity());
        console2.log("  RegistryCommunity impl:", communityImplementation);

        adminFacet = new CommunityAdminFacet();
        console2.log("  CommunityAdminFacet:", address(adminFacet));

        memberFacet = new CommunityMemberFacet();
        console2.log("  CommunityMemberFacet:", address(memberFacet));

        poolFacet = new CommunityPoolFacet();
        console2.log("  CommunityPoolFacet:", address(poolFacet));

        powerFacet = new CommunityPowerFacet();
        console2.log("  CommunityPowerFacet:", address(powerFacet));

        strategyFacet = new CommunityStrategyFacet();
        console2.log("  CommunityStrategyFacet:", address(strategyFacet));

        loupeFacet = new DiamondLoupeFacet();
        console2.log("  DiamondLoupeFacet:", address(loupeFacet));

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactory registryFactory = RegistryFactory(payable(address(registryFactoryProxy)));

        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        IDiamond.FacetCut[] memory cuts = _getFacetCuts();

        if (directBroadcast) {
            _executeDirectUpgrades(
                registryFactory, registryFactoryProxy, registryCommunityProxies, communityImplementation, cuts
            );
        } else {
            address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
            address safeOwner = ProxyOwner(proxyOwner).owner();
            _generateSafeTransactions(
                registryFactory,
                registryFactoryProxy,
                registryCommunityProxies,
                communityImplementation,
                cuts,
                safeOwner,
                networkJson
            );
        }

        console2.log("\n=== Summary ===");
        console2.log("Registry Factory: %s", registryFactoryProxy);
        console2.log("Registry Communities: %s", registryCommunityProxies.length);
        if (!directBroadcast) {
            console2.log("Total transactions: %s", 1 + (registryCommunityProxies.length * 2));
        }
    }

    function _executeDirectUpgrades(
        RegistryFactory registryFactory,
        address registryFactoryProxy,
        address[] memory registryCommunityProxies,
        address communityImplementation,
        IDiamond.FacetCut[] memory cuts
    ) internal {
        console2.log("\n[2/3] Updating RegistryFactory community template...");
        registryFactory.setRegistryCommunityTemplate(communityImplementation);
        console2.log("  RegistryFactory template updated:", registryFactoryProxy);

        console2.log("\n[3/3] Upgrading RegistryCommunity proxies and applying diamond cuts...");
        RegistryCommunityDiamondInit initContract = new RegistryCommunityDiamondInit();
        console2.log("  RegistryCommunityDiamondInit deployed:", address(initContract));

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity community = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            community.upgradeTo(communityImplementation);
            community.diamondCut(cuts, address(initContract), abi.encodeCall(RegistryCommunityDiamondInit.init, ()));
            console2.log("  Community", i + 1, "upgraded with diamond facets:", registryCommunityProxies[i]);
        }
    }

    function _generateSafeTransactions(
        RegistryFactory registryFactory,
        address registryFactoryProxy,
        address[] memory registryCommunityProxies,
        address communityImplementation,
        IDiamond.FacetCut[] memory cuts,
        address safeOwner,
        string memory networkJson
    ) internal {
        console2.log("\n[2/4] Building RegistryFactory community template update transaction...");
        string memory json = string(abi.encodePacked("["));
        {
            bytes memory setTemplate =
                abi.encodeWithSelector(registryFactory.setRegistryCommunityTemplate.selector, communityImplementation);
            json = string(abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, setTemplate), ","));
        }

        console2.log("\n[3/4] Building RegistryCommunity upgrade + diamond cut transactions...");
        RegistryCommunityDiamondInit initContract = new RegistryCommunityDiamondInit();
        console2.log("  RegistryCommunityDiamondInit deployed:", address(initContract));

        bytes memory diamondCutCalldata = abi.encodeWithSelector(
            RegistryCommunity.diamondCut.selector, cuts, address(initContract), abi.encodeCall(RegistryCommunityDiamondInit.init, ())
        );

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity community = RegistryCommunity(payable(address(registryCommunityProxies[i])));

            bytes memory upgradeCalldata = abi.encodeWithSelector(community.upgradeTo.selector, communityImplementation);
            json = string(
                abi.encodePacked(json, _createTransactionJson(registryCommunityProxies[i], upgradeCalldata), ",")
            );

            json = string(
                abi.encodePacked(json, _createTransactionJson(registryCommunityProxies[i], diamondCutCalldata), ",")
            );

            console2.log("  Community", i + 1, "added to batch:", registryCommunityProxies[i]);
        }

        json = string(abi.encodePacked(_removeLastChar(json), "]"));

        _writePayloadFile(json, safeOwner, networkJson);

        console2.log("\n[4/4] Safe Transaction Builder JSON generated!");
    }

    /**
     * @notice Get facet cuts for diamond configuration
     * @return cuts Array of FacetCut structs for RegistryCommunity facets
     */
    function _getFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](6);

        // CommunityAdminFacet functions
        bytes4[] memory adminSelectors = new bytes4[](9);
        adminSelectors[0] = CommunityAdminFacet.setStrategyTemplate.selector;
        adminSelectors[1] = CommunityAdminFacet.setCollateralVaultTemplate.selector;
        adminSelectors[2] = CommunityAdminFacet.setArchived.selector;
        adminSelectors[3] = CommunityAdminFacet.setBasisStakedAmount.selector;
        adminSelectors[4] = CommunityAdminFacet.setCommunityFee.selector;
        adminSelectors[5] = CommunityAdminFacet.setCouncilSafe.selector;
        adminSelectors[6] = CommunityAdminFacet.acceptCouncilSafe.selector;
        adminSelectors[7] = CommunityAdminFacet.setCommunityParams.selector;
        adminSelectors[8] = CommunityAdminFacet.isCouncilMember.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: adminSelectors
        });

        // CommunityMemberFacet functions
        bytes4[] memory memberSelectors = new bytes4[](6);
        memberSelectors[0] = CommunityMemberFacet.stakeAndRegisterMember.selector;
        memberSelectors[1] = CommunityMemberFacet.unregisterMember.selector;
        memberSelectors[2] = CommunityMemberFacet.kickMember.selector;
        memberSelectors[3] = CommunityMemberFacet.isMember.selector;
        memberSelectors[4] = CommunityMemberFacet.getBasisStakedAmount.selector;
        memberSelectors[5] = CommunityMemberFacet.getStakeAmountWithFees.selector;
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(memberFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: memberSelectors
        });

        // CommunityPoolFacet functions
        bytes4[] memory poolSelectors = new bytes4[](2);
        // createPool has two overloads with different signatures
        poolSelectors[0] = bytes4(
            keccak256(
                "createPool(address,(uint256,bool,bool,bool,(uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        poolSelectors[1] = bytes4(
            keccak256(
                "createPool(address,address,(uint256,bool,bool,bool,(uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(poolFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: poolSelectors
        });

        // CommunityPowerFacet functions
        bytes4[] memory powerSelectors = new bytes4[](6);
        powerSelectors[0] = CommunityPowerFacet.activateMemberInStrategy.selector;
        powerSelectors[1] = CommunityPowerFacet.deactivateMemberInStrategy.selector;
        powerSelectors[2] = CommunityPowerFacet.increasePower.selector;
        powerSelectors[3] = CommunityPowerFacet.decreasePower.selector;
        powerSelectors[4] = CommunityPowerFacet.getMemberPowerInStrategy.selector;
        powerSelectors[5] = CommunityPowerFacet.getMemberStakedAmount.selector;
        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(powerFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: powerSelectors
        });

        // CommunityStrategyFacet functions
        bytes4[] memory strategySelectors = new bytes4[](5);
        strategySelectors[0] = CommunityStrategyFacet.addStrategyByPoolId.selector;
        strategySelectors[1] = CommunityStrategyFacet.addStrategy.selector;
        strategySelectors[2] = CommunityStrategyFacet.removeStrategyByPoolId.selector;
        strategySelectors[3] = CommunityStrategyFacet.removeStrategy.selector;
        strategySelectors[4] = CommunityStrategyFacet.rejectPool.selector;
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(strategyFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: strategySelectors
        });

        // DiamondLoupeFacet functions - all 5 selectors including supportsInterface
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        cuts[5] = IDiamond.FacetCut({
            facetAddress: address(loupeFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: loupeSelectors
        });

        return cuts;
    }

    /**
     * @notice Write the Safe Transaction Builder JSON payload to file
     * @param transactionsJson JSON array of transactions
     * @param safeOwner Safe owner address
     * @param networkJson Network configuration JSON
     */
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
            '"name":"RegistryCommunity Diamond Pattern Upgrade",',
            '"description":"Upgrades RegistryCommunity contracts to diamond pattern with 5 facets (Admin, Member, Pool, Power, Strategy)",',
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

        // Ensure folder exists and write file
        vm.createDir("transaction-builder", true);
        string memory path = string.concat(
            vm.projectRoot(),
            "/pkg/contracts/transaction-builder/",
            CURRENT_NETWORK,
            "-community-diamond-upgrade-payload.json"
        );

        vm.writeFile(path, payload);
        console2.log("  File: %s", path);
    }

    /**
     * @notice Remove the last character from a string (used to remove trailing comma)
     * @param input The string to trim
     * @return Trimmed string
     */
    function _removeLastChar(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        require(inputBytes.length > 0, "String is empty");
        // Create a new bytes array with one less length
        bytes memory trimmedBytes = new bytes(inputBytes.length - 1);
        for (uint256 i = 0; i < inputBytes.length - 1; i++) {
            trimmedBytes[i] = inputBytes[i];
        }
        return string(trimmedBytes);
    }

    /**
     * @notice Create a Safe Transaction Builder JSON object for a single transaction
     * @param to Target contract address
     * @param data Encoded calldata
     * @return JSON string representing the transaction
     */
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

    /**
     * @notice Convert address to lowercase hex string with 0x prefix
     * @param _addr Address to convert
     * @return Hex string representation
     */
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

    /**
     * @notice Convert bytes to lowercase hex string with 0x prefix
     * @param _bytes Bytes to convert
     * @return Hex string representation
     */
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
