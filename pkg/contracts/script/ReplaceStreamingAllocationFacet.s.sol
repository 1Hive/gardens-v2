// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/console2.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {ProposalType} from "../src/CVStrategy/ICVStrategy.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";

contract ReplaceStreamingAllocationFacet is BaseMultiChain {
    using stdJson for string;

    string internal constant CV_ALLOCATION_ARTIFACT = "src/CVStrategy/facets/CVAllocationFacet.sol:CVAllocationFacet";

    function runCurrentNetwork(string memory networkJson) public override {
        address allocationFacet = _getOrDeployAllocationFacet();

        if (!vm.envOr("SKIP_FACTORY_SYNC", false)) {
            _syncFactoryStrategyAllocationFacet(networkJson, allocationFacet);
        }

        if (!vm.envOr("SKIP_STRATEGY_SYNC", false)) {
            _replaceStreamingStrategies(networkJson, allocationFacet);
        }
    }

    function _getOrDeployAllocationFacet() internal returns (address allocationFacet) {
        allocationFacet = _readAddressOrZero(".FACETS.CV_ALLOCATION");
        bytes32 expectedCodeHash = _deployedCodeHash(CV_ALLOCATION_ARTIFACT);
        bool needsRedeploy = allocationFacet == address(0) || allocationFacet.code.length == 0
            || _addressCodeHash(allocationFacet, CV_ALLOCATION_ARTIFACT) != expectedCodeHash;

        if (!needsRedeploy) {
            console2.log("CVAllocationFacet already matches local bytecode", allocationFacet);
            return allocationFacet;
        }

        allocationFacet = address(new CVAllocationFacet());
        _writeNetworkAddress(".FACETS.CV_ALLOCATION", allocationFacet);
        console2.log("Deployed patched CVAllocationFacet", allocationFacet);
    }

    function _syncFactoryStrategyAllocationFacet(string memory networkJson, address allocationFacet) internal {
        address factoryAddress = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactory registryFactory = RegistryFactory(payable(factoryAddress));
        (IDiamond.FacetCut[] memory strategyCuts, address strategyInit, bytes memory strategyInitCalldata) =
            registryFactory.getStrategyFacets();

        for (uint256 i = 0; i < strategyCuts.length; i++) {
            if (!_isAllocationFacetCut(strategyCuts[i])) continue;

            if (strategyCuts[i].facetAddress == allocationFacet) {
                console2.log("Factory strategy allocation facet already synced", allocationFacet);
                return;
            }

            try registryFactory.upsertStrategyFacetCut(
                i, allocationFacet, strategyCuts[i].action, strategyCuts[i].functionSelectors
            ) {}
            catch {
                strategyCuts[i].facetAddress = allocationFacet;
                registryFactory.setStrategyFacets(strategyCuts, strategyInit, strategyInitCalldata);
            }
            console2.log("Synced factory strategy allocation facet", allocationFacet);
            return;
        }

        revert("factory allocation facet cut not found");
    }

    function _replaceStreamingStrategies(string memory networkJson, address allocationFacet) internal {
        address[] memory strategies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        uint256 startIndex = _bounded(vm.envOr("STRATEGY_START_INDEX", uint256(0)), strategies.length);
        uint256 endIndex = _bounded(vm.envOr("STRATEGY_END_INDEX", strategies.length), strategies.length);
        IDiamond.FacetCut[] memory cuts = _allocationReplacementCut(allocationFacet);
        uint256 updated = 0;
        uint256 skippedNonStreaming = 0;
        uint256 skippedAlreadyCurrent = 0;

        for (uint256 i = startIndex; i < endIndex; i++) {
            address strategy = strategies[i];

            if (CVStrategy(payable(strategy)).proposalType() != ProposalType.Streaming) {
                skippedNonStreaming++;
                continue;
            }

            if (IDiamondLoupe(strategy).facetAddress(CVAllocationFacet.distribute.selector) == allocationFacet) {
                skippedAlreadyCurrent++;
                continue;
            }

            IDiamondCut(strategy).diamondCut(cuts, address(0), "");
            updated++;
            console2.log("Updated streaming strategy allocation facet", strategy);
        }

        console2.log("Streaming strategy allocation updates", updated);
        console2.log("Skipped non-streaming strategies", skippedNonStreaming);
        console2.log("Skipped already-current streaming strategies", skippedAlreadyCurrent);
    }

    function _allocationReplacementCut(address allocationFacet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = CVAllocationFacet.allocate.selector;
        selectors[1] = CVAllocationFacet.distribute.selector;
        selectors[2] = CVAllocationFacet.getPoolAmount.selector;

        cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: allocationFacet, action: IDiamond.FacetCutAction.Replace, functionSelectors: selectors
        });
    }

    function _isAllocationFacetCut(IDiamond.FacetCut memory cut) internal pure returns (bool) {
        return _cutHasSelector(cut, CVAllocationFacet.allocate.selector)
            && _cutHasSelector(cut, CVAllocationFacet.distribute.selector)
            && _cutHasSelector(cut, CVAllocationFacet.getPoolAmount.selector);
    }

    function _cutHasSelector(IDiamond.FacetCut memory cut, bytes4 selector) internal pure returns (bool) {
        for (uint256 i = 0; i < cut.functionSelectors.length; i++) {
            if (cut.functionSelectors[i] == selector) return true;
        }
        return false;
    }

    function _bounded(uint256 value, uint256 length) internal pure returns (uint256) {
        return value > length ? length : value;
    }
}
