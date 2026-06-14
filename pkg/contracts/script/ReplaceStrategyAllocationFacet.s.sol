// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";

contract ReplaceStrategyAllocationFacet is Script {
    using stdJson for string;

    function run(string memory network) public {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/pkg/contracts/config/networks.json"));
        string memory networkKey = string.concat("$.networks[?(@.name=='", network, "')]");
        address allocationFacet = json.readAddress(string.concat(networkKey, ".FACETS.CV_ALLOCATION"));
        address[] memory strategies = json.readAddressArray(string.concat(networkKey, ".PROXIES.CV_STRATEGIES"));
        uint256 startIndex = _bounded(vm.envOr("STRATEGY_START_INDEX", uint256(0)), strategies.length);
        uint256 endIndex = _bounded(vm.envOr("STRATEGY_END_INDEX", strategies.length), strategies.length);

        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = CVAllocationFacet.allocate.selector;
        selectors[1] = CVAllocationFacet.distribute.selector;
        selectors[2] = CVAllocationFacet.getPoolAmount.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: allocationFacet, action: IDiamond.FacetCutAction.Replace, functionSelectors: selectors
        });

        vm.startBroadcast();
        for (uint256 i = startIndex; i < endIndex; i++) {
            address strategy = strategies[i];
            if (IDiamondLoupe(strategy).facetAddress(CVAllocationFacet.allocate.selector) != allocationFacet) {
                IDiamondCut(strategy).diamondCut(cuts, address(0), "");
            }
        }
        vm.stopBroadcast();
    }

    function _bounded(uint256 value, uint256 length) internal pure returns (uint256) {
        return value > length ? length : value;
    }
}
