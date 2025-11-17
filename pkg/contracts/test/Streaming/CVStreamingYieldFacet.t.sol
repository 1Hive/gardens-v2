// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {CVStreamingYieldFacet} from "../../src/CVStrategy/facets/CVStreamingYieldFacet.sol";

contract CVStreamingYieldFacetHarness is CVStreamingYieldFacet {
    event StopStreamCalled(uint256 indexed proposalId);

    function setProposalCounter(uint256 count) external {
        proposalCounter = count;
    }

    function setStreamActive(uint256 proposalId, bool active) external {
        StreamState storage stream = proposalStreams[proposalId];
        stream.isActive = active;
    }

    function callStopInactiveStreams(uint256 activeCount, uint256[] calldata activeIds) external {
        _stopInactiveStreams(activeCount, activeIds);
    }

    function streamIsActive(uint256 proposalId) external view returns (bool) {
        return proposalStreams[proposalId].isActive;
    }

    // Minimal core facet stubs used by the parent implementation
    function stopStream(uint256 proposalId) external {
        StreamState storage stream = proposalStreams[proposalId];
        if (stream.isActive) {
            stream.isActive = false;
            emit StopStreamCalled(proposalId);
        }
    }

    function startStream(uint256, address, uint128) external {}
    function updateStream(uint256, uint128) external {}
}

contract CVStreamingYieldFacetTest is Test {
    CVStreamingYieldFacetHarness internal facet;

    function setUp() public {
        facet = new CVStreamingYieldFacetHarness();
        facet.setProposalCounter(5);
        facet.setStreamActive(2, true);
        facet.setStreamActive(4, true);
    }

    function testStopInactiveStreamsUsesConstantLookup() public {
        uint256[] memory activeIds = new uint256[](1);
        activeIds[0] = 2;

        facet.callStopInactiveStreams(1, activeIds);

        assertTrue(facet.streamIsActive(2), "active proposal should remain streaming");
        assertFalse(facet.streamIsActive(4), "inactive proposal should be stopped");
    }
}

