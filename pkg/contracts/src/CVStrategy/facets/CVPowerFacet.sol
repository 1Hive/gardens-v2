// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {Proposal} from "../ICVStrategy.sol";
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

    function activatePoints() external {
        if (!_canExecuteAction(msg.sender)) {
            revert UserCannotExecuteAction(msg.sender);
        }
        registryCommunity.activateMemberInStrategy(msg.sender, address(this));
        totalPointsActivated += registryCommunity.getMemberPowerInStrategy(msg.sender, address(this));
    }

    function increasePower(address _member, uint256 _amountToStake) external onlyRegistryCommunity returns (uint256) {
        if (!_canExecuteAction(_member)) {
            revert UserCannotExecuteAction(_member);
        }
        uint256 pointsToIncrease = PowerManagementUtils.increasePower(
            registryCommunity, _member, _amountToStake, pointSystem, pointConfig.maxAmount
        );

        bool isActivated = registryCommunity.memberActivatedInStrategies(_member, address(this));
        if (isActivated) {
            totalPointsActivated += pointsToIncrease;
        }
        emit PowerIncreased(_member, _amountToStake, pointsToIncrease);
        return pointsToIncrease;
    }

    function decreasePower(address _member, uint256 _amountToUnstake) external onlyRegistryCommunity returns (uint256) {
        uint256 pointsToDecrease = PowerManagementUtils.decreasePower(
            registryCommunity, _member, _amountToUnstake, pointSystem, pointConfig.maxAmount
        );

        uint256 voterStake = totalVoterStakePct[_member];
        uint256 unusedPower;
        {
            uint256 memberPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
            unusedPower = memberPower > voterStake ? memberPower - voterStake : 0;
        }
        if (unusedPower < pointsToDecrease) {
            uint256 balancingRatio = ((pointsToDecrease - unusedPower) << 128) / voterStake;
            for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
                uint256 proposalId = voterStakedProposals[_member][i];
                Proposal storage proposal = proposals[proposalId];
                uint256 stakedPoints = proposal.voterStakedPoints[_member];
                uint256 newStakedPoints;
                newStakedPoints = stakedPoints - ((stakedPoints * balancingRatio + (1 << 127)) >> 128);
                {
                    uint256 oldStake = proposal.stakedAmount;
                    proposal.stakedAmount -= stakedPoints - newStakedPoints;
                    proposal.voterStakedPoints[_member] = newStakedPoints;
                    totalStaked -= stakedPoints - newStakedPoints;
                    totalVoterStakePct[_member] -= stakedPoints - newStakedPoints;
                    _calculateAndSetConviction(proposal, oldStake);
                }
                emit SupportAdded(_member, proposalId, newStakedPoints, proposal.stakedAmount, proposal.convictionLast);
            }
        }
        totalPointsActivated -= pointsToDecrease;
        emit PowerDecreased(_member, _amountToUnstake, pointsToDecrease);

        return pointsToDecrease;
    }

    function deactivatePoints() external {
        _deactivatePoints(msg.sender);
    }

    function deactivatePoints(address _member) external onlyRegistryCommunity {
        _deactivatePoints(_member);
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function _deactivatePoints(address _member) internal {
        totalPointsActivated -= registryCommunity.getMemberPowerInStrategy(_member, address(this));
        registryCommunity.deactivateMemberInStrategy(_member, address(this));
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
}
