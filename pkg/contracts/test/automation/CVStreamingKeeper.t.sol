// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {CVStreamingKeeper, ICVStrategy, ProposalType} from "../../src/automation/CVStreamingKeeper.sol";

contract MockStrategy is ICVStrategy {
    ProposalType internal _proposalType;
    uint256 internal _decay;

    constructor(ProposalType proposalType_, uint256 decay_) {
        _proposalType = proposalType_;
        _decay = decay_;
    }

    function proposalType() external view returns (ProposalType) {
        return _proposalType;
    }

    function rebalanceYieldStreams() external {}

    function batchEvaluateStreams() external {}

    function getConvictionDecay() external view returns (uint256) {
        return _decay;
    }

    function setDecay(uint256 decay_) external {
        _decay = decay_;
    }
}

contract MockYDSStrategy {
    uint256 public lastReport;

    function report() external returns (uint256 profit, uint256 loss) {
        lastReport = block.timestamp;
        return (profit, loss);
    }
}

contract CVStreamingKeeperTest is Test {
    uint256 internal constant DEFAULT_DECAY = 9_965_853;

    function testSyncIntervalsUsesDecayParameter() public {
        MockStrategy strategy = new MockStrategy(ProposalType.Funding, DEFAULT_DECAY);
        MockYDSStrategy yds = new MockYDSStrategy();
        CVStreamingKeeper keeper =
            new CVStreamingKeeper(address(strategy), address(yds), 1 days, 12 hours, 3 hours);

        // Increase memory (decay closer to 1) -> expect longer intervals (close to max clamp)
        strategy.setDecay(9_995_000);
        keeper.syncIntervalsWithConviction();
        (uint256 report,,) = keeper.getIntervals();
        uint256 expectedBase = keeper.calculateOptimalInterval(9_995_000);
        (, uint256 base, uint256 min) = keeper.getIntervals();
        assertEq(base, expectedBase, "base interval should track decay-derived value");
        assertEq(min, expectedBase / 4 >= 900 ? expectedBase / 4 : 900, "min interval should be quarter (>=15m)");
        assertEq(report, 1 days, "report interval unchanged");

        // Reduce decay (faster conviction decay) -> interval should shrink to lower bound
        strategy.setDecay(8_000_000);
        keeper.syncIntervalsWithConviction();
        (, base, min) = keeper.getIntervals();
        uint256 expectedFast = keeper.calculateOptimalInterval(8_000_000);
        assertEq(base, expectedFast, "base interval should shrink with lower decay");
        assertEq(min, expectedFast / 4 >= 900 ? expectedFast / 4 : 900, "min interval scales with base");
    }

    function testCalculateOptimalIntervalClampsExtremes() public {
        MockStrategy strategy = new MockStrategy(ProposalType.Funding, DEFAULT_DECAY);
        MockYDSStrategy yds = new MockYDSStrategy();
        CVStreamingKeeper keeper =
            new CVStreamingKeeper(address(strategy), address(yds), 1 days, 12 hours, 3 hours);

        uint256 maxInterval = keeper.calculateOptimalInterval(10_000_000);
        assertEq(maxInterval, 24 hours, "decay at denominator should clamp to max interval");

        uint256 minInterval = keeper.calculateOptimalInterval(1_000_000);
        assertEq(minInterval, 1 hours, "low decay should clamp to 1 hour minimum");
    }
}

