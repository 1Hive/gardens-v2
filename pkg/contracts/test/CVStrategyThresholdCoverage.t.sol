// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {ProposalStatus} from "../src/CVStrategy/ICVStrategy.sol";
import {CVParams} from "../src/CVStrategy/ICVStrategy.sol";
import {ConvictionsUtils} from "../src/CVStrategy/ConvictionsUtils.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVStrategyHarness} from "./helpers/CVStrategyHelpers.sol";

contract CVStrategyThresholdCoverage is Test {
    CVStrategyHarness internal strategy;
    address internal member = makeAddr("member");

    function setUp() public {
        strategy = new CVStrategyHarness();
    }

    function test_standaloneStrategy_timeWeightedThresholdHelpers() public {
        strategy.setProposal(1, member, 0, ProposalStatus.Active, block.number, 0);
        uint256 decay = 9_000_000;
        strategy.setCvParams(CVParams({maxRatio: 0, weight: 0, decay: decay, minThresholdPoints: 0}));
        strategy.setTotalPointsActivatedWithCheckpoint(100);
        strategy.exposedInitializeThresholdSnapshot(1);
        (uint256 updatedAtBlock, uint256 thresholdSnapshot) = strategy.getProposalThresholdState(1);
        assertEq(updatedAtBlock, block.number);
        assertEq(thresholdSnapshot, 100);

        strategy.setTotalPointsActivatedWithCheckpoint(0);
        assertEq(strategy.exposedGetThresholdPoints(1), 100);
        vm.roll(block.number + 1);
        assertEq(strategy.exposedGetThresholdPoints(1), ConvictionsUtils.weightedAverage(100, 0, 1, decay));

        strategy.setProposal(3, member, 0, ProposalStatus.Active, block.number, 0);
        strategy.exposedSetThresholdSnapshot(3);
        assertEq(strategy.exposedGetThresholdPoints(3), 0);

        strategy.setTotalPointsActivatedWithCheckpoint(21);
        strategy.exposedSetThresholdSnapshot(3);
        assertEq(strategy.exposedGetThresholdPoints(3), 21);

        strategy.setProposal(4, member, 0, ProposalStatus.Active, block.number, 0);
        strategy.exposedInitializeThresholdSnapshot(4);
        strategy.exposedSetThresholdSnapshot(4);
        (, thresholdSnapshot) = strategy.getProposalThresholdState(4);
        assertEq(thresholdSnapshot, 21);

        strategy.exposedRebaselineThresholdSnapshot(3);
        (, thresholdSnapshot) = strategy.getProposalThresholdState(3);
        assertEq(thresholdSnapshot, 21);

        strategy.exposedRebaselineThresholdSnapshot(4);
        (updatedAtBlock, thresholdSnapshot) = strategy.getProposalThresholdState(4);
        assertEq(updatedAtBlock, block.number);
        assertEq(thresholdSnapshot, 21);
    }

    function test_reinitializeV2MigrateThresholdSnapshots_bulkInitializesExistingProposals() public {
        CVStrategyHarness localStrategy = _newInitializedStrategy(address(this));
        localStrategy.setTotalPointsActivated(77);
        localStrategy.setProposal(1, member, 0, ProposalStatus.Active, block.number, 0);
        localStrategy.setProposal(3, member, 0, ProposalStatus.Executed, block.number, 0);

        vm.roll(100);
        _upgradeAndMigrate(localStrategy);

        (uint256 firstUpdatedAt, uint256 firstSnapshot) = localStrategy.getProposalThresholdState(1);
        (uint256 missingUpdatedAt, uint256 missingSnapshot) = localStrategy.getProposalThresholdState(2);
        (uint256 thirdUpdatedAt, uint256 thirdSnapshot) = localStrategy.getProposalThresholdState(3);
        assertEq(firstUpdatedAt, block.number);
        assertEq(firstSnapshot, 77);
        assertEq(missingUpdatedAt, 0);
        assertEq(missingSnapshot, 0);
        assertEq(thirdUpdatedAt, block.number);
        assertEq(thirdSnapshot, 77);
    }

    function test_reinitializeV2MigrateThresholdSnapshots_onlyOwnerAndOnce() public {
        address migrationOwner = makeAddr("migrationOwner");
        CVStrategyHarness localStrategy = _newInitializedStrategy(migrationOwner);
        CVStrategyHarness nextImplementation = new CVStrategyHarness();

        vm.prank(member);
        vm.expectRevert();
        localStrategy.upgradeToAndCall(
            address(nextImplementation),
            abi.encodeWithSelector(CVStrategy.reinitializeV2MigrateThresholdSnapshots.selector)
        );

        vm.prank(migrationOwner);
        localStrategy.upgradeToAndCall(
            address(nextImplementation),
            abi.encodeWithSelector(CVStrategy.reinitializeV2MigrateThresholdSnapshots.selector)
        );

        vm.prank(migrationOwner);
        vm.expectRevert();
        localStrategy.reinitializeV2MigrateThresholdSnapshots();
    }

    function _newInitializedStrategy(address migrationOwner) internal returns (CVStrategyHarness) {
        CVStrategyHarness implementation = new CVStrategyHarness();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(CVStrategy.init.selector, address(0xA110), address(0), migrationOwner)
        );
        return CVStrategyHarness(payable(address(proxy)));
    }

    function _upgradeAndMigrate(CVStrategyHarness localStrategy) internal {
        CVStrategyHarness nextImplementation = new CVStrategyHarness();
        localStrategy.upgradeToAndCall(
            address(nextImplementation),
            abi.encodeWithSelector(CVStrategy.reinitializeV2MigrateThresholdSnapshots.selector)
        );
    }
}
