// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyStorage} from "../CVStrategyStorage.sol";
import {Proposal} from "../ICVStrategy.sol";
import {PowerManagementUtils} from "../PowerManagementUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVPowerFacet
 * @notice Facet containing power management functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategyV0_0
 *      CRITICAL: Storage layout is inherited from CVStrategyStorage base contract
 */
contract CVPowerFacet is CVStrategyStorage {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event PowerDecreased(address member, uint256 tokensUnStaked, uint256 pointsToDecrease);
    event PointsDeactivated(address member);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function onlyRegistryCommunity() internal view {
        if (msg.sender != address(registryCommunity)) {
            revert();
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function decreasePower(address _member, uint256 _amountToUnstake) external returns (uint256) {
        onlyRegistryCommunity();

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

    function deactivatePoints(address _member) external {
        onlyRegistryCommunity();
        _deactivatePoints(_member);
    }

    function _deactivatePoints(address _member) internal {
        totalPointsActivated -= registryCommunity.getMemberPowerInStrategy(_member, address(this));
        registryCommunity.deactivateMemberInStrategy(_member, address(this));
        // remove support from all proposals
        withdraw(_member);
        emit PointsDeactivated(_member);
    }

    function withdraw(address _member) internal {
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

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function proposalExists(uint256 _proposalID) internal view returns (bool) {
        return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
    }

    function _calculateAndSetConviction(Proposal storage _proposal, uint256 _oldStaked) internal {
        (uint256 conviction, uint256 blockNumber) = _checkBlockAndCalculateConviction(_proposal, _oldStaked);
        if (conviction == 0 && blockNumber == 0) {
            return;
        }
        _proposal.blockLast = blockNumber;
        _proposal.convictionLast = conviction;
    }

    function _checkBlockAndCalculateConviction(Proposal storage _proposal, uint256 _oldStaked)
        internal
        view
        returns (uint256 conviction, uint256 blockNumber)
    {
        blockNumber = block.number;
        assert(_proposal.blockLast <= blockNumber);
        if (_proposal.blockLast == blockNumber) {
            return (0, 0); // Conviction already stored
        }
        // calculateConviction and store it
        conviction = _calculateConviction(
            blockNumber - _proposal.blockLast, _proposal.convictionLast, _oldStaked, cvParams.decay
        );
    }

    function _calculateConviction(uint256 _timePassed, uint256 _lastConviction, uint256 _oldAmount, uint256 decay)
        internal
        pure
        returns (uint256)
    {
        uint256 t = _timePassed;
        uint256 atTWO_128 = _abdk64x64pow(decay, t);

        int128 aN = _abdk64x64(atTWO_128);
        int128 newAmount = _abdk64x64(_oldAmount);
        int128 conviction = _abdk64x64(_lastConviction);

        int128 convictionTerm = _abdk64x64mul(conviction, aN);
        int128 stakeTerm;
        {
            int128 amountTerm = _abdk64x64mul(newAmount, _abdk64x64(1 << 64));
            int128 secondTerm = _abdk64x64sub(_abdk64x64(1 << 64), aN);
            stakeTerm = _abdk64x64div(amountTerm, secondTerm);
        }

        return _abdk64x64ToUInt(stakeTerm + convictionTerm);
    }

    // ABDK Math helper functions (simplified)
    function _abdk64x64(uint256 x) internal pure returns (int128) {
        return int128(int256(x << 64));
    }

    function _abdk64x64ToUInt(int128 x) internal pure returns (uint256) {
        return uint256(uint128(x >> 64));
    }

    function _abdk64x64mul(int128 x, int128 y) internal pure returns (int128) {
        int256 result = (int256(x) * int256(y)) >> 64;
        return int128(result);
    }

    function _abdk64x64div(int128 x, int128 y) internal pure returns (int128) {
        int256 result = (int256(x) << 64) / int256(y);
        return int128(result);
    }

    function _abdk64x64sub(int128 x, int128 y) internal pure returns (int128) {
        return x - y;
    }

    function _abdk64x64pow(uint256 base, uint256 exp) internal pure returns (uint256) {
        if (exp == 0) return 1 << 64;
        uint256 result = 1 << 64;
        uint256 b = base;
        while (exp > 0) {
            if (exp & 1 == 1) {
                result = (result * b) >> 64;
            }
            b = (b * b) >> 64;
            exp >>= 1;
        }
        return result;
    }
}
