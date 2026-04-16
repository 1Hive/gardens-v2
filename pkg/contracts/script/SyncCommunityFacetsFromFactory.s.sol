// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";

contract SyncCommunityFacetsFromFactory is BaseMultiChain {
    using stdJson for string;

    uint256 internal constant EXPECTED_COMMUNITY_FACET_COUNT = 7;

    function run(string memory network) public virtual override {
        delete pendingNetworkWrites;

        require(bytes(network).length != 0, "network is required");
        CURRENT_NETWORK = network;

        string memory json = getNetworkJson();
        chainId = json.readUint(getKeyNetwork(".chainId"));
        chainName = json.readString(getKeyNetwork(".name"));

        runCurrentNetwork(json);
        _flushPendingNetworkWrites();
    }

    function runCurrentNetwork(string memory networkJson) public override {
        address factoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        require(factoryProxy != address(0), "registry factory proxy missing");
        require(factoryProxy.code.length > 0, "registry factory proxy has no code");

        (IDiamondCut.FacetCut[] memory communityCuts,,) =
            RegistryFactory(payable(factoryProxy)).getCommunityFacets();
        require(communityCuts.length == EXPECTED_COMMUNITY_FACET_COUNT, "community cut count mismatch");

        for (uint256 i = 0; i < communityCuts.length; i++) {
            require(communityCuts[i].facetAddress != address(0), "community facet missing");
            require(communityCuts[i].functionSelectors.length > 0, "community selectors missing");
        }

        _writeCanonicalFacetsObject(networkJson, communityCuts);
    }

    function _writeCanonicalFacetsObject(string memory networkJson, IDiamondCut.FacetCut[] memory communityCuts) internal {
        address diamondLoupe = communityCuts[0].facetAddress;
        address strategyDiamondLoupe = _readAddressOrZero(".FACETS.STRATEGY_DIAMOND_LOUPE");

        string memory facetsObject = "facets";
        string memory json = vm.serializeAddress(facetsObject, "DIAMOND_LOUPE", diamondLoupe);
        json = vm.serializeAddress(facetsObject, "CV_ADMIN", networkJson.readAddress(getKeyNetwork(".FACETS.CV_ADMIN")));
        json =
            vm.serializeAddress(facetsObject, "CV_ALLOCATION", networkJson.readAddress(getKeyNetwork(".FACETS.CV_ALLOCATION")));
        json = vm.serializeAddress(facetsObject, "CV_DISPUTE", networkJson.readAddress(getKeyNetwork(".FACETS.CV_DISPUTE")));
        json = vm.serializeAddress(facetsObject, "CV_PAUSE", networkJson.readAddress(getKeyNetwork(".FACETS.CV_PAUSE")));
        json = vm.serializeAddress(facetsObject, "CV_POWER", networkJson.readAddress(getKeyNetwork(".FACETS.CV_POWER")));
        json =
            vm.serializeAddress(facetsObject, "CV_PROPOSAL", networkJson.readAddress(getKeyNetwork(".FACETS.CV_PROPOSAL")));
        json =
            vm.serializeAddress(facetsObject, "CV_SYNC_POWER", networkJson.readAddress(getKeyNetwork(".FACETS.CV_SYNC_POWER")));
        json =
            vm.serializeAddress(facetsObject, "CV_STREAMING", networkJson.readAddress(getKeyNetwork(".FACETS.CV_STREAMING")));
        json = vm.serializeAddress(facetsObject, "COMMUNITY_ADMIN", communityCuts[1].facetAddress);
        json = vm.serializeAddress(facetsObject, "COMMUNITY_MEMBER", communityCuts[2].facetAddress);
        json = vm.serializeAddress(facetsObject, "COMMUNITY_PAUSE", communityCuts[3].facetAddress);
        json = vm.serializeAddress(facetsObject, "COMMUNITY_POOL", communityCuts[4].facetAddress);
        json = vm.serializeAddress(facetsObject, "COMMUNITY_POWER", communityCuts[5].facetAddress);
        json = vm.serializeAddress(facetsObject, "COMMUNITY_STRATEGY", communityCuts[6].facetAddress);
        if (strategyDiamondLoupe != address(0)) {
            json = vm.serializeAddress(facetsObject, "STRATEGY_DIAMOND_LOUPE", strategyDiamondLoupe);
        }
        json = vm.serializeAddress(facetsObject, "COMMUNITY_DIAMOND_LOUPE", diamondLoupe);

        if (!_shouldPersistNetworkWrites()) {
            return;
        }

        string memory path = _networksJsonPath();
        string memory tmpPath = string.concat(path, ".__FACETS__.tmp");
        string memory command = string.concat(
            "jq '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | .FACETS) = ",
            json,
            "' '",
            path,
            "' > '",
            tmpPath,
            "' && mv '",
            tmpPath,
            "' '",
            path,
            "'"
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        vm.ffi(inputs);
    }
}
