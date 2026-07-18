// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {ProposalStatus} from "../src/CVStrategy/ICVStrategy.sol";
import {CVStrategyHarness} from "./helpers/CVStrategyHelpers.sol";

contract CVStrategyThresholdCoverage is Test {
    CVStrategyHarness internal strategy;
    address internal member = makeAddr("member");

    function setUp() public {
        strategy = new CVStrategyHarness();
    }

    function test_standaloneStrategy_timeWeightedThresholdHelpers() public {
        strategy.setProposal(1, member, 0, ProposalStatus.Active, block.number, 0);

        strategy.setTotalPointsActivatedWithCheckpoint(10);
        (uint256 accumulator, uint256 lastBlock) = strategy.getAccumulatorState();
        assertEq(accumulator, 0);
        assertEq(lastBlock, block.number);

        strategy.exposedCheckpointActivePointsAccumulator();
        (accumulator, lastBlock) = strategy.getAccumulatorState();
        assertEq(accumulator, 0);
        assertEq(lastBlock, block.number);

        vm.roll(block.number + 4);
        assertEq(strategy.exposedCurrentActivePointsAccumulator(), 40);

        strategy.exposedCheckpointActivePointsAccumulator();
        (accumulator, lastBlock) = strategy.getAccumulatorState();
        assertEq(accumulator, 40);
        assertEq(lastBlock, block.number);

        strategy.exposedInitializeThresholdSnapshot(1);
        (uint256 creationBlock, uint256 thresholdSnapshot) = strategy.getProposalCreationAndThreshold(1);
        assertEq(creationBlock, block.number);
        assertEq(thresholdSnapshot, 40);
        assertEq(strategy.exposedGetThresholdPoints(1), 10);

        vm.roll(block.number + 2);
        assertEq(strategy.exposedGetThresholdPoints(1), 10);

        strategy.setTotalPointsActivatedWithCheckpoint(0);
        strategy.setProposal(2, member, 0, ProposalStatus.Active, block.number, 0);
        strategy.exposedInitializeThresholdSnapshot(2);
        vm.roll(block.number + 1);
        assertEq(strategy.exposedGetThresholdPoints(2), 0);

        strategy.setProposal(3, member, 0, ProposalStatus.Active, block.number, 0);
        strategy.exposedSetThresholdSnapshot(3);
        assertEq(strategy.exposedGetThresholdPoints(3), 0);

        strategy.setTotalPointsActivatedWithCheckpoint(21);
        strategy.exposedSetThresholdSnapshot(3);
        assertEq(strategy.exposedGetThresholdPoints(3), 21);

        strategy.setProposal(4, member, 0, ProposalStatus.Active, block.number, 0);
        strategy.exposedInitializeThresholdSnapshot(4);
        strategy.exposedSetThresholdSnapshot(4);
        (, thresholdSnapshot) = strategy.getProposalCreationAndThreshold(4);
        assertEq(thresholdSnapshot, strategy.exposedCurrentActivePointsAccumulator());

        strategy.exposedRebaselineThresholdSnapshot(3);
        (, thresholdSnapshot) = strategy.getProposalCreationAndThreshold(3);
        assertEq(thresholdSnapshot, 0);

        strategy.exposedRebaselineThresholdSnapshot(4);
        (creationBlock, thresholdSnapshot) = strategy.getProposalCreationAndThreshold(4);
        assertEq(creationBlock, block.number);
        assertEq(thresholdSnapshot, strategy.exposedCurrentActivePointsAccumulator());
    }
}
