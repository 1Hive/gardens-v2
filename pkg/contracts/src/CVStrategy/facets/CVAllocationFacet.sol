// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyStorage} from "../CVStrategyStorage.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ProposalType, ProposalStatus, ProposalSupport, Proposal} from "../ICVStrategy.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVAllocationFacet
 * @notice Facet containing allocation and distribution functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategyV0_0
 *      CRITICAL: Storage layout is inherited from CVStrategyStorage base contract
 */
contract CVAllocationFacet is CVStrategyStorage {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              CONSTANTS                     |*/
    /*|--------------------------------------------|*/
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

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
    error UserNotInRegistry();
    error UserIsInactive();
    error UserCannotExecuteAction();
    error ProposalNotInList(uint256 _proposalId);
    error ProposalNotActive(uint256 _proposalId);
    error ProposalDataIsEmpty();
    error PoolIsEmpty();
    error PoolAmountNotEnough(uint256 _proposalId, uint256 _requestedAmount, uint256 _poolAmount);
    error ConvictionUnderMinimumThreshold();
    error AmountOverMaxRatio();
    error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance);
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result);
    error ProposalInvalidForAllocation(uint256 _proposalId, ProposalStatus _proposalStatus);
    error OnlyCommunityAllowed();

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function _checkOnlyAllo() internal view {
        if (msg.sender != address(allo)) {
            revert();
        }
    }

    function _checkOnlyInitialized() internal view {
        if (poolId == 0) {
            revert();
        }
    }

    function checkSenderIsMember(address _sender) internal view {
        if (!registryCommunity.isMember(_sender)) {
            revert();
        }
    }

    function _canExecuteAction(address _user) internal view returns (bool) {
        if (address(sybilScorer) == address(0)) {
            bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
            if (registryCommunity.hasRole(allowlistRole, address(0))) {
                return true;
            } else {
                return registryCommunity.hasRole(allowlistRole, _user);
            }
        }
        return sybilScorer.canExecuteAction(_user, address(this));
    }

    function _checkProposalAllocationValidity(uint256 _proposalId, int256 deltaSupport) internal view {
        Proposal storage p = proposals[_proposalId];
        if (
            deltaSupport > 0
                && (
                    p.proposalStatus == ProposalStatus.Inactive || p.proposalStatus == ProposalStatus.Cancelled
                        || p.proposalStatus == ProposalStatus.Executed || p.proposalStatus == ProposalStatus.Rejected
                )
        ) {
            revert();
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function allocate(bytes memory _data, address _sender) external payable {
        _checkOnlyAllo();
        _checkOnlyInitialized();

        ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        for (uint256 i = 0; i < pv.length; i++) {
            _checkProposalAllocationValidity(pv[i].proposalId, pv[i].deltaSupport);
        }
        checkSenderIsMember(_sender);

        if (!registryCommunity.memberActivatedInStrategies(_sender, address(this))) {
            revert();
        }
        {
            int256 deltaSupportSum = 0;
            bool canAddSupport = _canExecuteAction(_sender);
            for (uint256 i = 0; i < pv.length; i++) {
                // check if pv index i exist
                if (!canAddSupport && pv[i].deltaSupport > 0) {
                    revert();
                }
                if (pv[i].proposalId == 0) {
                    //@todo: check better way to do that.
                    continue;
                }
                uint256 proposalId = pv[i].proposalId;
                if (!proposalExists(proposalId)) {
                    revert();
                }
                deltaSupportSum += pv[i].deltaSupport;
            }
            uint256 newTotalVotingSupport = _applyDelta(totalVoterStakePct[_sender], deltaSupportSum);
            uint256 participantBalance = registryCommunity.getMemberPowerInStrategy(_sender, address(this));
            // Check that the sum of support is not greater than the participant balance
            if (newTotalVotingSupport > participantBalance) {
                revert();
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
                        // revert ProposalSupportDuplicated(proposalId, j);
                        break; // TODO: Uncommented when contract size fixed with diamond
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

    function distribute(address[] memory, /*_recipientIds */ bytes memory _data, address /*_sender */ ) external {
        _checkOnlyAllo();
        _checkOnlyInitialized();

        if (_data.length <= 0) {
            revert();
        }

        if (getPoolAmount() <= 0) {
            revert();
        }

        uint256 proposalId = abi.decode(_data, (uint256));

        // Unwrap supertoken if needed
        if (address(superfluidToken) != address(0)) {
            if (
                ERC20(proposals[proposalId].requestedToken).balanceOf(address(this))
                    < proposals[proposalId].requestedAmount
            ) {
                superfluidToken.downgrade(superfluidToken.balanceOf(address(this))); // Unwrap all available
            }
        }

        if (proposalType == ProposalType.Funding) {
            if (proposals[proposalId].proposalId != proposalId && proposalId != 0) {
                revert();
            }

            if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
                revert();
            }

            if (proposals[proposalId].requestedAmount > getPoolAmount()) {
                revert();
            }

            if (_isOverMaxRatio(proposals[proposalId].requestedAmount)) {
                revert();
            }

            uint256 convictionLast = updateProposalConviction(proposalId);

            uint256 threshold = ConvictionsUtils.calculateThreshold(
                proposals[proposalId].requestedAmount,
                getPoolAmount(),
                totalPointsActivated,
                cvParams.decay,
                cvParams.weight,
                cvParams.maxRatio,
                cvParams.minThresholdPoints
            );

            // <= for when threshold being zero
            if (convictionLast <= threshold && proposals[proposalId].requestedAmount > 0) {
                revert();
            }

            _transferAmount(
                allo.getPool(poolId).token, proposals[proposalId].beneficiary, proposals[proposalId].requestedAmount
            );

            proposals[proposalId].proposalStatus = ProposalStatus.Executed;
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

    function proposalExists(uint256 _proposalID) internal view returns (bool) {
        return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
    }

    function _isOverMaxRatio(uint256 _requestedAmount) internal view returns (bool isOverMaxRatio) {
        isOverMaxRatio = cvParams.maxRatio * getPoolAmount() <= _requestedAmount * ConvictionsUtils.D;
    }

    function _applyDelta(uint256 _support, int256 _delta) internal pure returns (uint256) {
        int256 result = int256(_support) + _delta;

        if (result < 0) {
            revert();
        }
        return uint256(result);
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
        conviction = ConvictionsUtils.calculateConviction(
            blockNumber - _proposal.blockLast, // we assert it doesn't overflow above
            _proposal.convictionLast,
            _oldStaked,
            cvParams.decay
        );
    }

    function updateProposalConviction(uint256 proposalId) internal returns (uint256) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.proposalId != proposalId) {
            revert();
        }

        _calculateAndSetConviction(proposal, proposal.stakedAmount);
        return proposal.convictionLast;
    }

    function getPoolAmount() internal view returns (uint256) {
        address token = allo.getPool(poolId).token;

        if (token == NATIVE) {
            return address(this).balance;
        }

        uint256 base = ERC20(token).balanceOf(address(this));
        uint256 sf = address(superfluidToken) == address(0) ? 0 : superfluidToken.balanceOf(address(this));

        uint8 d = ERC20(token).decimals();
        if (d < 18) {
            sf /= 10 ** (18 - d); // downscale 18 -> d
        } else if (d > 18) {
            sf *= 10 ** (d - 18); // upscale 18 -> d  (unlikely)
        }
        return base + sf;
    }

    function _transferAmount(address _token, address _to, uint256 _amount) internal {
        if (_token == NATIVE) {
            (bool success,) = payable(_to).call{value: _amount}("");
            require(success, "Native transfer failed");
        } else {
            ERC20(_token).transfer(_to, _amount);
        }
    }
}
