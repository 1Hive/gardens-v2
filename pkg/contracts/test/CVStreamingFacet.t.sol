// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {CVStreamingStorage, CVStreamingBase} from "../src/CVStrategy/CVStreamingStorage.sol";

contract CVStreamingFacetHarness is CVStreamingFacet {
    bool internal shouldStart;

    function setCooldown(uint256 cooldown) external {
        setRebalanceCooldown(cooldown);
    }

    function setLastRebalance(uint256 ts) external {
        setLastRebalanceAt(ts);
    }

    function getLastRebalance() external view returns (uint256) {
        return CVStreamingStorage.layout().lastRebalanceAt;
    }

    function setShouldStartStream(bool value) external {
        shouldStart = value;
    }

    function _shouldStartStream() internal view override returns (bool) {
        return shouldStart;
    }

    function exposedBaseShouldStartStream() external view returns (bool) {
        return super._shouldStartStream();
    }

    function setStreamingEscrowExternal(uint256 proposalId, address escrow) external {
        setStreamingEscrow(proposalId, escrow);
    }

    function getStreamingEscrowExternal(uint256 proposalId) external view returns (address) {
        return streamingEscrow(proposalId);
    }
}

contract CVStreamingFacetTest is Test {
    CVStreamingFacetHarness internal facet;

    function setUp() public {
        facet = new CVStreamingFacetHarness();
    }

    function test_rebalance_updates_timestamp() public {
        uint256 nowTs = block.timestamp + 10;
        vm.warp(nowTs);
        facet.rebalance();
        assertEq(facet.getLastRebalance(), nowTs);
    }

    function test_rebalance_reverts_when_cooldown_active() public {
        uint256 nowTs = block.timestamp + 10;
        facet.setCooldown(100);
        facet.setLastRebalance(nowTs);

        vm.warp(nowTs + 1);
        vm.expectRevert(abi.encodeWithSelector(CVStreamingBase.RebalanceCooldownActive.selector, 99));
        facet.rebalance();
    }

    function test_rebalance_starts_stream_when_enabled() public {
        facet.setShouldStartStream(true);
        facet.rebalance();
        assertGt(facet.getLastRebalance(), 0);
    }

    function test_shouldStartStream_base_returns_false() public {
        assertFalse(facet.exposedBaseShouldStartStream());
    }

    function test_streamingEscrow_set_get() public {
        address escrow = address(0xBEEF);
        facet.setStreamingEscrowExternal(1, escrow);
        assertEq(facet.getStreamingEscrowExternal(1), escrow);
    }
}
