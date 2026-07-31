// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/console2.sol";
import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {ProposalType} from "../src/CVStrategy/ICVStrategy.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";

contract ReplaceStreamingFacet is BaseMultiChain {
    string internal constant CV_STREAMING_ARTIFACT = "src/CVStrategy/facets/CVStreamingFacet.sol:CVStreamingFacet";

    function runCurrentNetwork(string memory) public override {
        address strategy = vm.envAddress("TARGET_STRATEGY");
        require(strategy.code.length != 0, "target strategy has no code");
        require(
            CVStrategy(payable(strategy)).proposalType() == ProposalType.Streaming,
            "target strategy is not streaming"
        );

        address streamingFacet = _getOrDeployStreamingFacet();
        bytes4[] memory selectors = _streamingSelectors();

        if (!_allSelectorsResolveTo(strategy, streamingFacet, selectors)) {
            IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
            cuts[0] = IDiamond.FacetCut({
                facetAddress: streamingFacet,
                action: IDiamond.FacetCutAction.Auto,
                functionSelectors: selectors
            });
            IDiamondCut(strategy).diamondCut(cuts, address(0), "");
        }

        require(_allSelectorsResolveTo(strategy, streamingFacet, selectors), "streaming facet cut incomplete");
        console2.log("Streaming strategy updated", strategy);
        console2.log("CVStreamingFacet", streamingFacet);
    }

    function _getOrDeployStreamingFacet() internal returns (address streamingFacet) {
        streamingFacet = _readAddressOrZero(".FACETS.CV_STREAMING");
        bytes32 expectedCodeHash = _deployedCodeHash(CV_STREAMING_ARTIFACT);
        bool needsRedeploy = streamingFacet == address(0) || streamingFacet.code.length == 0
            || _addressCodeHash(streamingFacet, CV_STREAMING_ARTIFACT) != expectedCodeHash;

        if (!needsRedeploy) {
            console2.log("CVStreamingFacet already matches local bytecode", streamingFacet);
            return streamingFacet;
        }

        streamingFacet = address(new CVStreamingFacet());
        _writeNetworkAddress(".FACETS.CV_STREAMING", streamingFacet);
        console2.log("Deployed CVStreamingFacet", streamingFacet);
    }

    function _allSelectorsResolveTo(address strategy, address facet, bytes4[] memory selectors)
        internal
        view
        returns (bool)
    {
        for (uint256 i = 0; i < selectors.length; i++) {
            if (IDiamondLoupe(strategy).facetAddress(selectors[i]) != facet) return false;
        }
        return true;
    }

    function _streamingSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](6);
        selectors[0] = CVStreamingFacet.rebalance.selector;
        selectors[1] = CVStreamingFacet.stopEscrowStream.selector;
        selectors[2] = CVStreamingFacet.setAuthorizedRebalanceCaller.selector;
        selectors[3] = CVStreamingFacet.isAuthorizedRebalanceCaller.selector;
        selectors[4] = CVStreamingFacet.wrapIfNeeded.selector;
        selectors[5] = CVStreamingFacet.getPoolThresholdPoints.selector;
    }
}
