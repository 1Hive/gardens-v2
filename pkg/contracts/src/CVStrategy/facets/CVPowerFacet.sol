// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {CVSyncPowerStorage} from "../CVSyncPowerStorage.sol";
import {Proposal, PointSystem} from "../ICVStrategy.sol";
import {PowerManagementUtils} from "../PowerManagementUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVPowerFacet
 * @notice Facet containing power management functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVPowerFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;

    error UserCannotExecuteAction(address sender); // 0xf634e7ce

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event PowerIncreased(address member, uint256 tokensStaked, uint256 pointsToIncrease);
    event PowerDecreased(address member, uint256 tokensUnStaked, uint256 pointsToDecrease);
    event PointsDeactivated(address member);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    // Sig: 0x814516ad
    function activatePoints() external {
        if (!_canExecuteAction(msg.sender)) {
            revert UserCannotExecuteAction(msg.sender);
        }
        registryCommunity.activateMemberInStrategy(msg.sender, address(this));
        uint256 currentPower = votingPowerRegistry.getMemberPowerInStrategy(msg.sender, address(this));
        totalPointsActivated += currentPower;

        CVSyncPowerStorage.Layout storage syncLayout = CVSyncPowerStorage.layout();
        syncLayout.syncedPower[msg.sender] = currentPower;
        syncLayout.hasSyncedPower[msg.sender] = true;
    }

    // Sig: 0x782aadff
    function increasePower(address _member, uint256 _amountToStake) external onlyRegistryCommunity returns (uint256) {
        if (!_canExecuteAction(_member)) {
            revert UserCannotExecuteAction(_member);
        }
        uint256 currentPower = votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));
        uint256 pointsToIncrease;

        if (pointSystem == PointSystem.Custom) {
            uint256 previousPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
            pointsToIncrease = currentPower > previousPower ? currentPower - previousPower : 0;
        } else {
            pointsToIncrease = PowerManagementUtils.increasePower(
                votingPowerRegistry, _member, _amountToStake, pointSystem, pointConfig.maxAmount
            );
        }

        bool isActivated = registryCommunity.memberActivatedInStrategies(_member, address(this));
        if (isActivated) {
            totalPointsActivated += pointsToIncrease;
        }

        CVSyncPowerStorage.Layout storage syncLayout = CVSyncPowerStorage.layout();
        syncLayout.syncedPower[_member] = currentPower;
        syncLayout.hasSyncedPower[_member] = true;

        emit PowerIncreased(_member, _amountToStake, pointsToIncrease);
        return pointsToIncrease;
    }

    // Sig: 0x2ed04b2b
    function decreasePower(address _member, uint256 _amountToUnstake) external onlyRegistryCommunity returns (uint256) {
        uint256 currentPower = votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));
        uint256 pointsToDecrease;

        if (pointSystem == PointSystem.Custom) {
            uint256 previousPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
            pointsToDecrease = previousPower > currentPower ? previousPower - currentPower : 0;
        } else {
            pointsToDecrease = PowerManagementUtils.decreasePower(
                votingPowerRegistry, _member, _amountToUnstake, pointSystem, pointConfig.maxAmount
            );
        }

        uint256 voterStake = totalVoterStakePct[_member];
        uint256 unusedPower;
        {
            unusedPower = currentPower > voterStake ? currentPower - voterStake : 0;
        }
        if (unusedPower < pointsToDecrease && voterStake > 0) {
            uint256 balancingRatio = ((pointsToDecrease - unusedPower) << 128) / voterStake;
            for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
                _rebalanceProposalStake(_member, voterStakedProposals[_member][i], balancingRatio);
            }
        }
        totalPointsActivated -= pointsToDecrease;

        CVSyncPowerStorage.Layout storage syncLayout = CVSyncPowerStorage.layout();
        syncLayout.syncedPower[_member] = currentPower;
        syncLayout.hasSyncedPower[_member] = true;

        emit PowerDecreased(_member, _amountToUnstake, pointsToDecrease);

        return pointsToDecrease;
    }

    // Sig: 0x1ddf1e23
    function deactivatePoints() external {
        _deactivatePoints(msg.sender);
    }

    // Sig: 0x6453d9c4
    function deactivatePoints(address _member) external onlyRegistryCommunity {
        _deactivatePoints(_member);
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function _deactivatePoints(address _member) internal {
        totalPointsActivated -= votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));
        registryCommunity.deactivateMemberInStrategy(_member, address(this));

        CVSyncPowerStorage.Layout storage syncLayout = CVSyncPowerStorage.layout();
        syncLayout.syncedPower[_member] = 0;
        syncLayout.hasSyncedPower[_member] = false;

        // remove support from all proposals
        _withdraw(_member);
        emit PointsDeactivated(_member);
    }

    function _withdraw(address _member) internal {
        // remove all proposals from the member
        for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
            uint256 proposalId = voterStakedProposals[_member][i];
            Proposal storage proposal = proposals[proposalId];
            if (proposalExists(proposalId)) {
                uint256 stakedPoints = proposal.voterStakedPoints[_member];
                proposal.voterStakedPoints[_member] = 0;
                proposal.stakedAmount -= stakedPoints;
                totalStaked -= stakedPoints;
                _calculateAndSetConviction(proposal, stakedPoints);
                emit SupportAdded(_member, proposalId, 0, proposal.stakedAmount, proposal.convictionLast);
            }
        }
        totalVoterStakePct[_member] = 0;
    }

    function _rebalanceProposalStake(address _member, uint256 _proposalId, uint256 _balancingRatio) internal {
        Proposal storage proposal = proposals[_proposalId];
        uint256 stakedPoints = proposal.voterStakedPoints[_member];
        uint256 newStakedPoints = stakedPoints - ((stakedPoints * _balancingRatio + (1 << 127)) >> 128);
        uint256 stakeDelta = stakedPoints - newStakedPoints;
        uint256 oldStake = proposal.stakedAmount;

        proposal.stakedAmount -= stakeDelta;
        proposal.voterStakedPoints[_member] = newStakedPoints;
        totalStaked -= stakeDelta;
        totalVoterStakePct[_member] -= stakeDelta;
        _calculateAndSetConviction(proposal, oldStake);

        emit SupportAdded(_member, _proposalId, newStakedPoints, proposal.stakedAmount, proposal.convictionLast);
    }
}
