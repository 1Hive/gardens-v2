// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {CVStreamingFundingFacet} from "../../src/CVStrategy/facets/CVStreamingFundingFacet.sol";
import {Proposal, ProposalStatus, ProposalType, CVParams} from "../../src/CVStrategy/ICVStrategy.sol";

contract CVStreamingFundingFacetHarness is CVStreamingFundingFacet {
    uint256 internal poolBalance;

    event StartStreamCalled(uint256 indexed proposalId, address beneficiary, uint128 units);
    event StopStreamCalled(uint256 indexed proposalId);
    event UpdateStreamCalled(uint256 indexed proposalId, uint128 newUnits);

    function setPoolBalance(uint256 amount) external {
        poolBalance = amount;
    }

    function setStreamingEnabled(bool enabled) external {
        streamingEnabled = enabled;
    }

    function setProposalType(ProposalType proposalType_) external {
        proposalType = proposalType_;
    }

    function setTotalPointsActivated(uint256 amount) external {
        totalPointsActivated = amount;
    }

    function setCVParams(CVParams memory params) external {
        cvParams = params;
    }

    function seedProposal(
        uint256 proposalId,
        uint256 requestedAmount,
        uint256 stakedAmount,
        uint256 conviction,
        address beneficiary,
        ProposalStatus status
    ) external {
        Proposal storage p = proposals[proposalId];
        p.proposalId = proposalId;
        p.requestedAmount = requestedAmount;
        p.stakedAmount = stakedAmount;
        p.convictionLast = conviction;
        p.beneficiary = beneficiary;
        p.submitter = address(0xBEEF);
        p.proposalStatus = status;
        p.blockLast = block.number - 1;
        proposalCounter = proposalId > proposalCounter ? proposalId : proposalCounter;
    }

    function setStreamState(
        uint256 proposalId,
        bool isActive,
        uint128 flowUnits,
        uint256 lastEvalBlock
    ) external {
        StreamState storage stream = proposalStreams[proposalId];
        stream.isActive = isActive;
        stream.flowUnits = flowUnits;
        stream.lastEvalBlock = lastEvalBlock;
    }

    function getStreamState(uint256 proposalId)
        external
        view
        returns (bool isActive, uint128 flowUnits, uint256 lastEvalBlock)
    {
        StreamState storage stream = proposalStreams[proposalId];
        return (stream.isActive, stream.flowUnits, stream.lastEvalBlock);
    }

    function maybeEvaluate(uint256 proposalId) external {
        _maybeEvaluateProposalStream(proposalId);
    }

    function getPoolAmount() internal view override returns (uint256) {
        return poolBalance;
    }

    // Stubs to satisfy delegatecall usage in facet
    function startStream(uint256 proposalId, address beneficiary, uint128 units) external {
        StreamState storage stream = proposalStreams[proposalId];
        stream.isActive = true;
        stream.flowUnits = units;
        stream.beneficiary = beneficiary;
        stream.lastUpdateBlock = block.number;
        emit StartStreamCalled(proposalId, beneficiary, units);
    }

    function stopStream(uint256 proposalId) external {
        StreamState storage stream = proposalStreams[proposalId];
        stream.isActive = false;
        stream.flowUnits = 0;
        stream.lastUpdateBlock = block.number;
        emit StopStreamCalled(proposalId);
    }

    function updateStream(uint256 proposalId, uint128 units) external {
        StreamState storage stream = proposalStreams[proposalId];
        stream.flowUnits = units;
        stream.lastUpdateBlock = block.number;
        emit UpdateStreamCalled(proposalId, units);
    }
}

contract CVStreamingFundingFacetTest is Test {
    CVStreamingFundingFacetHarness internal facet;

    function setUp() public {
        facet = new CVStreamingFundingFacetHarness();
        facet.setStreamingEnabled(true);
        facet.setProposalType(ProposalType.Funding);
        facet.setTotalPointsActivated(1e18);
        facet.setPoolBalance(1_000 ether);
        facet.setCVParams(
            CVParams({
                maxRatio: 5_000_000, // 50%
                weight: 2_500_000,
                decay: 9_965_853,
                minThresholdPoints: 1e18
            })
        );

        facet.seedProposal({
            proposalId: 1,
            requestedAmount: 100 ether,
            stakedAmount: 10 ether,
            conviction: 1e21,
            beneficiary: address(0x1234),
            status: ProposalStatus.Active
        });

        facet.setStreamState(1, false, 0, block.number);
    }

    function testInlineEvaluationThrottleRespectsCooldown() public {
        (,, uint256 lastEvalBefore) = facet.getStreamState(1);
        facet.maybeEvaluate(1);
        (,, uint256 lastEvalAfterImmediate) = facet.getStreamState(1);
        assertEq(lastEvalAfterImmediate, lastEvalBefore, "should skip evaluation within throttle window");

        vm.roll(block.number + 10);
        facet.maybeEvaluate(1);
        (,, uint256 lastEvalAfterDelay) = facet.getStreamState(1);
        assertEq(lastEvalAfterDelay, block.number, "should evaluate once throttle window elapsed");
    }
}

