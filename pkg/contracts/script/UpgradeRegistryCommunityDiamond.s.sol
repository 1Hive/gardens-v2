// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {CommunityDiamondConfiguratorBase} from "../test/helpers/CommunityDiamondConfigurator.sol";

/**
 * @title UpgradeRegistryCommunityDiamond
 * @notice Upgrades RegistryCommunity contracts to diamond pattern with facets
 * @dev Can broadcast upgrades directly or generate Safe transaction payloads via a flag
 */
contract UpgradeRegistryCommunityDiamond is BaseMultiChain, CommunityDiamondConfiguratorBase {
    using stdJson for string;

    bool internal directBroadcastOverride;

    // Deployed facet addresses
    CommunityAdminFacet public adminFacet;
    CommunityMemberFacet public memberFacet;
    CommunityPauseFacet public pauseFacet;
    CommunityPoolFacet public poolFacet;
    CommunityPowerFacet public powerFacet;
    CommunityStrategyFacet public strategyFacet;
    DiamondLoupeFacet public loupeFacet;

    function runCurrentNetwork(string memory networkJson) public override {
        // Auto-detect direct broadcast mode based on network config
        // Testnets with "no-safe": true will use direct broadcast
        // Production networks will generate Safe Transaction Builder JSON
        bool directBroadcast = directBroadcastOverride || networkJson.readBool(getKeyNetwork(".no-safe"));

        // 1. Deploy new implementation and facets
        address communityImplementation = address(new RegistryCommunity());

        adminFacet = new CommunityAdminFacet();

        memberFacet = new CommunityMemberFacet();

        pauseFacet = new CommunityPauseFacet();

        poolFacet = new CommunityPoolFacet();

        powerFacet = new CommunityPowerFacet();

        strategyFacet = new CommunityStrategyFacet();

        loupeFacet = new DiamondLoupeFacet();

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactory registryFactory = RegistryFactory(payable(address(registryFactoryProxy)));

        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        IDiamond.FacetCut[] memory cuts = _buildAllFacetCuts();

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

        if (!directBroadcast) {
        }
    }

    function _executeDirectUpgrades(
        RegistryFactory registryFactory,
        address registryFactoryProxy,
        address[] memory registryCommunityProxies,
        address communityImplementation,
        IDiamond.FacetCut[] memory cuts
    ) internal {
        registryFactory.setRegistryCommunityTemplate(communityImplementation);

        RegistryCommunityDiamondInit initContract = new RegistryCommunityDiamondInit();

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity community = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            community.upgradeTo(communityImplementation);
            community.diamondCut(cuts, address(initContract), abi.encodeCall(RegistryCommunityDiamondInit.init, ()));
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
        string memory json = string(abi.encodePacked("["));
        {
            bytes memory setTemplate =
                abi.encodeWithSelector(registryFactory.setRegistryCommunityTemplate.selector, communityImplementation);
            json = string(abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, setTemplate), ","));
        }

        RegistryCommunityDiamondInit initContract = new RegistryCommunityDiamondInit();

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

        }

        json = string(abi.encodePacked(_removeLastChar(json), "]"));

        _writePayloadFile(json, safeOwner, networkJson);

    }

    /**
     * @notice Build all facet cuts including DiamondLoupeFacet (7 total)
     */
    function _buildAllFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts =
            _buildFacetCuts(adminFacet, memberFacet, pauseFacet, poolFacet, powerFacet, strategyFacet);
        cuts = new IDiamond.FacetCut[](7);
        for (uint256 i = 0; i < 6; i++) {
            cuts[i] = baseCuts[i];
        }
        cuts[6] = _buildLoupeFacetCut(loupeFacet);
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
            '"description":"Upgrades RegistryCommunity contracts to diamond pattern with 6 facets (Admin, Member, Pause, Pool, Power, Strategy)",',
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
