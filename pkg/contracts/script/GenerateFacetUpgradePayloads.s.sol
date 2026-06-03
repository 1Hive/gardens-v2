// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UpgradeCVMultichainBase.s.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVSyncPowerFacet} from "../src/CVStrategy/facets/CVSyncPowerFacet.sol";
import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";

contract GenerateFacetUpgradePayloads is UpgradeCVMultichainBase {
    using stdJson for string;

    struct JsonWriter {
        string path;
        bool hasEntries;
        uint256 transactionCount;
    }

    function run(string memory network) public override {
        delete pendingNetworkWrites;

        if (bytes(network).length != 0) {
            CURRENT_NETWORK = network;
        }

        string memory json = getNetworkJson();
        chainId = json.readUint(getKeyNetwork(".chainId"));
        chainName = json.readString(getKeyNetwork(".name"));
        SENDER = _senderFromEnv();

        runCurrentNetwork(json);
    }

    function runCurrentNetwork(string memory networkJson) public override {
        FacetCuts memory facetCuts = _buildFacetCutsFromConfiguredAddresses();
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address safeOwner = ProxyOwner(proxyOwner).mainOwner();

        address communityInit = _getOrDeployCommunityDiamondInit();
        bytes memory communityInitCalldata = abi.encodeCall(RegistryCommunityDiamondInit.init, ());
        address strategyInit = _getOrDeployStrategyDiamondInit();
        bytes memory strategyInitCalldata = abi.encodeCall(CVStrategyDiamondInit.init, ());

        JsonWriter memory writer = _initPayloadWriter(safeOwner, networkJson);

        writer = _appendFactoryFacetTransactions(
            writer,
            registryFactoryProxy,
            facetCuts.communityCuts,
            communityInit,
            communityInitCalldata,
            facetCuts.cvCuts,
            strategyInit,
            strategyInitCalldata
        );

        writer = _appendCommunityTransactions(
            writer,
            networkJson,
            facetCuts.communityCuts,
            communityInit,
            communityInitCalldata
        );

        writer = _appendStrategyTransactions(
            writer,
            networkJson,
            facetCuts.cvCuts,
            strategyInit,
            strategyInitCalldata
        );

        _finalizePayloadWriter(writer);
    }

    function _buildFacetCutsFromConfiguredAddresses() internal returns (FacetCuts memory cuts) {
        DiamondLoupeFacet loupeFacet =
            DiamondLoupeFacet(_requireConfiguredFacet(".FACETS.DIAMOND_LOUPE"));

        cuts.cvCuts = _buildCVFacetCuts(
            CVAdminFacet(_requireConfiguredFacet(".FACETS.CV_ADMIN")),
            CVAllocationFacet(_requireConfiguredFacet(".FACETS.CV_ALLOCATION")),
            CVDisputeFacet(_requireConfiguredFacet(".FACETS.CV_DISPUTE")),
            CVPauseFacet(_requireConfiguredFacet(".FACETS.CV_PAUSE")),
            CVPowerFacet(_requireConfiguredFacet(".FACETS.CV_POWER")),
            CVProposalFacet(_requireConfiguredFacet(".FACETS.CV_PROPOSAL")),
            CVSyncPowerFacet(_requireConfiguredFacet(".FACETS.CV_SYNC_POWER")),
            CVStreamingFacet(_requireConfiguredFacet(".FACETS.CV_STREAMING")),
            loupeFacet
        );

        cuts.communityCuts = _buildCommunityFacetCuts(
            CommunityAdminFacet(_requireConfiguredFacet(".FACETS.COMMUNITY_ADMIN")),
            CommunityMemberFacet(_requireConfiguredFacet(".FACETS.COMMUNITY_MEMBER")),
            CommunityPauseFacet(_requireConfiguredFacet(".FACETS.COMMUNITY_PAUSE")),
            CommunityPoolFacet(_requireConfiguredFacet(".FACETS.COMMUNITY_POOL")),
            CommunityPowerFacet(_requireConfiguredFacet(".FACETS.COMMUNITY_POWER")),
            CommunityStrategyFacet(_requireConfiguredFacet(".FACETS.COMMUNITY_STRATEGY")),
            loupeFacet
        );
    }

    function _requireConfiguredFacet(string memory key) internal returns (address facet) {
        facet = _readAddressOrZero(key);
        require(facet != address(0), "missing configured facet");
        require(facet.code.length != 0, "configured facet has no code");
    }

    function _appendFactoryFacetTransactions(
        JsonWriter memory writer,
        address registryFactoryProxy,
        IDiamond.FacetCut[] memory communityCuts,
        address communityInit,
        bytes memory communityInitCalldata,
        IDiamond.FacetCut[] memory cvCuts,
        address strategyInit,
        bytes memory strategyInitCalldata
    ) internal returns (JsonWriter memory) {
        RegistryFactory registryFactory = RegistryFactory(payable(registryFactoryProxy));

        if (!_factoryFacetStateMatches(registryFactory, true, communityCuts, communityInit, communityInitCalldata)) {
            writer = _appendTransaction(
                writer,
                _createTransactionJson(
                    registryFactoryProxy,
                    abi.encodeWithSelector(
                        RegistryFactory.setCommunityFacets.selector,
                        communityCuts,
                        communityInit,
                        communityInitCalldata
                    )
                )
            );
        }

        if (!_factoryFacetStateMatches(registryFactory, false, cvCuts, strategyInit, strategyInitCalldata)) {
            writer = _appendTransaction(
                writer,
                _createTransactionJson(
                    registryFactoryProxy,
                    abi.encodeWithSelector(
                        RegistryFactory.setStrategyFacets.selector,
                        cvCuts,
                        strategyInit,
                        strategyInitCalldata
                    )
                )
            );
        }

        return writer;
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

    function _appendCommunityTransactions(
        JsonWriter memory writer,
        string memory networkJson,
        IDiamond.FacetCut[] memory communityCuts,
        address communityInit,
        bytes memory communityInitCalldata
    ) internal returns (JsonWriter memory) {
        address[] memory proxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < proxies.length; i++) {
            IDiamond.FacetCut[] memory allCuts = _mergeFacetCuts(
                _buildStaleSelectorRemovalCuts(proxies[i], communityCuts),
                _buildChangedFacetCuts(proxies[i], communityCuts)
            );
            if (allCuts.length == 0) continue;

            writer = _appendTransaction(
                writer,
                _createTransactionJson(
                    proxies[i],
                    abi.encodeWithSelector(
                        RegistryCommunity.diamondCut.selector,
                        allCuts,
                        communityInit,
                        communityInitCalldata
                    )
                )
            );
        }
        return writer;
    }

    function _appendStrategyTransactions(
        JsonWriter memory writer,
        string memory networkJson,
        IDiamond.FacetCut[] memory cvCuts,
        address strategyInit,
        bytes memory strategyInitCalldata
    ) internal returns (JsonWriter memory) {
        address[] memory proxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < proxies.length; i++) {
            IDiamond.FacetCut[] memory allCuts = _mergeFacetCuts(
                _buildStaleSelectorRemovalCuts(proxies[i], cvCuts),
                _buildChangedFacetCuts(proxies[i], cvCuts)
            );
            if (allCuts.length == 0) continue;

            writer = _appendTransaction(
                writer,
                _createTransactionJson(
                    proxies[i],
                    abi.encodeWithSelector(CVStrategy.diamondCut.selector, allCuts, strategyInit, strategyInitCalldata)
                )
            );
        }
        return writer;
    }

    function _initPayloadWriter(address safeOwner, string memory networkJson)
        internal
        returns (JsonWriter memory writer)
    {
        vm.createDir("transaction-builder", true);
        writer.path = string.concat(
            vm.projectRoot(),
            "/pkg/contracts/transaction-builder/",
            _serviceChainName(CURRENT_NETWORK),
            "-facet-upgrade-payload.json"
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
            '"name":"Facet Upgrade: CVStrategy + RegistryCommunity",',
            '"description":"Updates configured RegistryFactory facet cuts and applies changed diamond facets to existing RegistryCommunity and CVStrategy proxies.",',
            '"txBuilderVersion":"1.18.0",',
            '"createdFromSafeAddress":"',
            _addressToString(safeOwner),
            '",',
            '"createdFromOwnerAddress":"',
            _addressToString(SENDER),
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
        writer.transactionCount++;
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
                _bytesToHex(data),
                '","operation":0,"contractMethod":{"inputs":[],"name":"","payable":false},"contractInputsValues":{}}'
            )
        );
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

    function _serviceChainName(string memory network) internal pure returns (string memory) {
        if (_stringEq(network, "ethereum")) return "mainnet";
        return network;
    }

    function _stringEq(string memory left, string memory right) internal pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
