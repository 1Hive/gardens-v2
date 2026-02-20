// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ProposalType, ProposalStatus, ProposalSupport, Proposal} from "../ICVStrategy.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVAllocationFacet
 * @notice Facet containing allocation and distribution functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVAllocationFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;
    using SafeERC20 for IERC20;

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event Distributed(uint256 proposalId, address beneficiary, uint256 amount);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error UserIsInactive(address user); // 0x9edf9ee6
    error UserCannotExecuteAction(address user); // 0xeee56a60
    error ProposalNotInList(uint256 proposalId); // 0xc1d17bef
    error ProposalNotActive(uint256 proposalId, uint8 currentStatus); // 0x14b469ec
    error ProposalDataIsEmpty(uint256 inputLength); // 0x07ab773f
    error PoolIsEmpty(uint256 poolAmount); // 0xf458e27c
    error PoolAmountNotEnough(uint256 proposalId, uint256 requestedAmount, uint256 poolAmount); // 0x5863b0b6
    error ConvictionUnderMinimumThreshold(uint256 conviction, uint256 threshold, uint256 requestedAmount); // 0x7ac83e3d
    error AmountOverMaxRatio(uint256 requestedAmount, uint256 maxAllowed, uint256 poolAmount); // 0x3e4bb863
    error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance); // 0xd64182fe
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result); // 0x3bbc7142
    error ProposalInvalidForAllocation(uint256 _proposalId, ProposalStatus _proposalStatus); // 0x9c3f44fe
    error NativeTransferFailed(address recipient, uint256 amount); // 0xa5b05eec
    error ProposalSupportDuplicated(uint256 _proposalId, uint256 index); //0xadebb154

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function _checkProposalAllocationValidity(uint256 _proposalId, int256 deltaSupport) internal view {
        Proposal storage p = proposals[_proposalId];
        if (
            deltaSupport > 0
                && (p.proposalStatus == ProposalStatus.Inactive
                    || p.proposalStatus == ProposalStatus.Cancelled
                    || p.proposalStatus == ProposalStatus.Executed
                    || p.proposalStatus == ProposalStatus.Rejected)
        ) {
            revert ProposalInvalidForAllocation(_proposalId, p.proposalStatus);
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    // Sig: 0xef2920fc
    function allocate(bytes memory _data, address _sender) external payable onlyAllo onlyInitialized {
        ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        for (uint256 i = 0; i < pv.length; i++) {
            _checkProposalAllocationValidity(pv[i].proposalId, pv[i].deltaSupport);
        }
        checkSenderIsMember(_sender);

        if (!registryCommunity.memberActivatedInStrategies(_sender, address(this))) {
            revert UserIsInactive(_sender);
        }
        {
            int256 deltaSupportSum = 0;
            bool canAddSupport = _canExecuteAction(_sender);
            for (uint256 i = 0; i < pv.length; i++) {
                // check if pv index i exist
                if (!canAddSupport && pv[i].deltaSupport > 0) {
                    revert UserCannotExecuteAction(_sender);
                }
                // Unreachable code because of _checkAllocationValidity
                // if (pv[i].proposalId == 0) {
                //     //@todo: check better way to do that.
                //     continue;
                // }
                // uint256 proposalId = pv[i].proposalId;
                // if (!proposalExists(proposalId)) {
                //     revert ProposalNotInList(proposalId);
                // }
                deltaSupportSum += pv[i].deltaSupport;
            }
            uint256 newTotalVotingSupport = _applyDelta(totalVoterStakePct[_sender], deltaSupportSum);
            uint256 participantBalance = votingPowerRegistry.getMemberPowerInStrategy(_sender, address(this));
            // Check that the sum of support is not greater than the participant balance
            if (newTotalVotingSupport > participantBalance) {
                revert NotEnoughPointsToSupport(newTotalVotingSupport, participantBalance);
            }

            totalVoterStakePct[_sender] = newTotalVotingSupport;
        }

        uint256[] memory proposalsIds;
        for (uint256 i = 0; i < pv.length; i++) {
            uint256 proposalId = pv[i].proposalId;
            // add proposalid to the list if not exist
            if (proposalsIds.length == 0) {
                proposalsIds = new uint256[](1);
                proposalsIds[0] = proposalId; // 0 => 1
            } else {
                bool exist = false;
                for (uint256 j = 0; j < proposalsIds.length; j++) {
                    // 1
                    if (proposalsIds[j] == proposalId) {
                        exist = true;
                        revert ProposalSupportDuplicated(proposalId, j);
                    }
                }
                if (!exist) {
                    uint256[] memory temp = new uint256[](proposalsIds.length + 1);
                    for (uint256 j = 0; j < proposalsIds.length; j++) {
                        temp[j] = proposalsIds[j];
                    }
                    temp[proposalsIds.length] = proposalId;
                    proposalsIds = temp;
                }
            }
            int256 delta = pv[i].deltaSupport;

            Proposal storage proposal = proposals[proposalId];

            uint256 previousStakedAmount = proposal.stakedAmount;

            uint256 previousStakedPoints = proposal.voterStakedPoints[_sender];

            uint256 stakedPoints = _applyDelta(previousStakedPoints, delta);

            proposal.voterStakedPoints[_sender] = stakedPoints;

            bool hasProposal = false;
            for (uint256 k = 0; k < voterStakedProposals[_sender].length; k++) {
                if (voterStakedProposals[_sender][k] == proposal.proposalId) {
                    hasProposal = true;
                    break;
                }
            }
            if (!hasProposal) {
                voterStakedProposals[_sender].push(proposal.proposalId);
            }
            if (previousStakedPoints <= stakedPoints) {
                totalStaked += stakedPoints - previousStakedPoints;
                proposal.stakedAmount += stakedPoints - previousStakedPoints;
            } else {
                totalStaked -= previousStakedPoints - stakedPoints;
                proposal.stakedAmount -= previousStakedPoints - stakedPoints;
            }
            if (proposal.blockLast == 0) {
                proposal.blockLast = block.number;
            } else {
                _calculateAndSetConviction(proposal, previousStakedAmount);
                emit SupportAdded(_sender, proposalId, stakedPoints, proposal.stakedAmount, proposal.convictionLast);
            }
        }
    }

    // Sig: 0x0a6f0ee9
    function distribute(
        address[] memory,
        /*_recipientIds */
        bytes memory _data,
        address /*_sender */
    )
        external
        onlyAllo
        onlyInitialized
    {
        if (_data.length <= 0) {
            revert ProposalDataIsEmpty(_data.length);
        }

        uint256 poolAmount = getPoolAmount();
        if (poolAmount == 0) {
            revert PoolIsEmpty(poolAmount);
        }

        uint256 proposalId = abi.decode(_data, (uint256));

        // Unwrap supertoken if needed
        if (address(superfluidToken) != address(0)) {
            if (
                IERC20(proposals[proposalId].requestedToken).balanceOf(address(this))
                    < proposals[proposalId].requestedAmount
            ) {
                superfluidToken.downgrade(superfluidToken.balanceOf(address(this))); // Unwrap all available
            }
        }

        if (proposalType == ProposalType.Funding) {
            if (proposals[proposalId].proposalId != proposalId && proposalId != 0) {
                revert ProposalNotInList(proposalId);
            }

            if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
                revert ProposalNotActive(proposalId, uint8(proposals[proposalId].proposalStatus));
            }

            if (proposals[proposalId].requestedAmount > poolAmount) {
                revert PoolAmountNotEnough(proposalId, proposals[proposalId].requestedAmount, poolAmount);
            }

            if (_isOverMaxRatio(proposals[proposalId].requestedAmount)) {
                uint256 maxAllowed = (cvParams.maxRatio * poolAmount) / ConvictionsUtils.D;
                revert AmountOverMaxRatio(proposals[proposalId].requestedAmount, maxAllowed, poolAmount);
            }

            uint256 convictionLast = updateProposalConviction(proposalId);

            uint256 threshold = ConvictionsUtils.calculateThreshold(
                proposals[proposalId].requestedAmount,
                poolAmount,
                totalPointsActivated,
                cvParams.decay,
                cvParams.weight,
                cvParams.maxRatio,
                cvParams.minThresholdPoints
            );

            // <= for when threshold being zero
            if (convictionLast <= threshold && proposals[proposalId].requestedAmount > 0) {
                revert ConvictionUnderMinimumThreshold(convictionLast, threshold, proposals[proposalId].requestedAmount);
            }

            proposals[proposalId].proposalStatus = ProposalStatus.Executed;
            _transferAmount(
                allo.getPool(poolId).token, proposals[proposalId].beneficiary, proposals[proposalId].requestedAmount
            );
            collateralVault.withdrawCollateral(
                proposalId,
                proposals[proposalId].submitter,
                arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
            );

            emit Distributed(proposalId, proposals[proposalId].beneficiary, proposals[proposalId].requestedAmount);
        }
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function _isOverMaxRatio(uint256 _requestedAmount) internal view returns (bool isOverMaxRatio) {
        isOverMaxRatio = cvParams.maxRatio * getPoolAmount() <= _requestedAmount * ConvictionsUtils.D;
    }

    function _applyDelta(uint256 _support, int256 _delta) internal pure returns (uint256) {
        // casting to 'int256' is safe because we're converting unsigned to signed for arithmetic
        // forge-lint: disable-next-line(unsafe-typecast)
        int256 result = int256(_support) + _delta;

        if (result < 0) {
            revert SupportUnderflow(_support, _delta, result);
        }
        // casting to 'uint256' is safe because we checked result >= 0
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(result);
    }

    function updateProposalConviction(uint256 proposalId) internal returns (uint256) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.proposalId != proposalId) {
            revert ProposalNotInList(proposalId);
        }

        _calculateAndSetConviction(proposal, proposal.stakedAmount);
        return proposal.convictionLast;
    }

    function getPoolAmount() internal view override returns (uint256) {
        address token = allo.getPool(poolId).token;

        if (token == NATIVE_TOKEN) {
            return address(this).balance;
        }

        uint256 base = IERC20(token).balanceOf(address(this));
        uint256 sf = address(superfluidToken) == address(0) ? 0 : superfluidToken.balanceOf(address(this));

        uint8 d = IERC20Metadata(token).decimals();
        if (d < 18) {
            sf /= 10 ** (18 - d); // downscale 18 -> d
        } else if (d > 18) {
            sf *= 10 ** (d - 18); // upscale 18 -> d  (unlikely)
        }
        return base + sf;
    }

    function _transferAmount(address _token, address _to, uint256 _amount) internal {
        if (_token == NATIVE_TOKEN) {
            (bool success,) = payable(_to).call{value: _amount}("");
            if (!success) {
                revert NativeTransferFailed(_to, _amount);
            }
        } else {
            SafeERC20.safeTransfer(IERC20(_token), _to, _amount);
        }
    }
}
