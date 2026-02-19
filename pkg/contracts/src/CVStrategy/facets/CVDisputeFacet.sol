// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {CVStreamingStorage} from "../CVStreamingStorage.sol";
import {StreamingEscrow} from "../StreamingEscrow.sol";
import {IArbitrator} from "../../interfaces/IArbitrator.sol";
import {Proposal, ProposalStatus, ProposalType, ArbitrableConfig} from "../ICVStrategy.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVDisputeFacet
 * @notice Facet containing dispute-related functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVDisputeFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error ProposalStatusInvalid(uint256 proposalId, ProposalStatus currentStatus); // 0xbcc5dcb1
    error ChallengerCollateralTooLow(uint256 sent, uint256 required); // 0x453ac5fd
    error DisputeCooldownActive(uint256 proposalId, uint256 secondsRemaining); // 0xc84ca6af
    error OnlyArbitrator(address sender, address arbitrator); // 0x84844502
    error DefaultRulingNotConfigured(uint256 proposalId); // 0x1b330288

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event ProposalDisputed(
        IArbitrator arbitrator,
        uint256 proposalId,
        uint256 disputeId,
        address challenger,
        string context,
        uint256 timestamp
    );
    event Ruling(IArbitrator indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling);

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    // Sig: 0xb41596ec
    function disputeProposal(uint256 proposalId, string calldata context, bytes calldata _extraData)
        external
        payable
        returns (uint256 disputeId)
    {
        checkSenderIsMember(msg.sender);
        Proposal storage proposal = proposals[proposalId];
        ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

        if (proposal.proposalStatus != ProposalStatus.Active) {
            revert ProposalStatusInvalid(proposalId, proposal.proposalStatus);
        }
        if (msg.value < arbitrableConfig.challengerCollateralAmount) {
            revert ChallengerCollateralTooLow(msg.value, arbitrableConfig.challengerCollateralAmount);
        }

        // if the lastDisputeCompletion is less than DISPUTE_COOLDOWN_SEC, we should revert
        if (
            proposal.lastDisputeCompletion != 0
                && proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC > block.timestamp
        ) {
            revert DisputeCooldownActive(
                proposalId, proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC - block.timestamp
            );
        }

        uint256 arbitrationFee = msg.value - arbitrableConfig.challengerCollateralAmount;

        collateralVault.depositCollateral{value: arbitrableConfig.challengerCollateralAmount}(proposalId, msg.sender);

        disputeId = arbitrableConfig.arbitrator.createDispute{value: arbitrationFee}(RULING_OPTIONS, _extraData);

        proposal.proposalStatus = ProposalStatus.Disputed;
        proposal.disputeInfo.disputeId = disputeId;
        proposal.disputeInfo.disputeTimestamp = block.timestamp;
        proposal.disputeInfo.challenger = msg.sender;
        disputeIdToProposalId[disputeId] = proposalId;

        if (proposalType == ProposalType.Streaming) {
            address escrow = CVStreamingStorage.layout().proposalEscrow[proposalId];
            if (escrow != address(0)) {
                StreamingEscrow(escrow).setDisputed(true);
            }
        }

        disputeCount++;

        emit ProposalDisputed(
            arbitrableConfig.arbitrator,
            proposalId,
            disputeId,
            msg.sender,
            context,
            proposal.disputeInfo.disputeTimestamp
        );
    }

    // Sig: 0x311a6c56
    function rule(uint256 _disputeID, uint256 _ruling) external {
        uint256 proposalId = disputeIdToProposalId[_disputeID];
        Proposal storage proposal = proposals[proposalId];
        ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

        if (proposal.proposalStatus != ProposalStatus.Disputed) {
            revert ProposalStatusInvalid(proposalId, proposal.proposalStatus);
        }

        bool isTimeOut = block.timestamp > proposal.disputeInfo.disputeTimestamp + arbitrableConfig.defaultRulingTimeout;

        if (!isTimeOut && msg.sender != address(arbitrableConfig.arbitrator)) {
            revert OnlyArbitrator(msg.sender, address(arbitrableConfig.arbitrator));
        }

        if (isTimeOut || _ruling == 0) {
            if (arbitrableConfig.defaultRuling == 0) {
                revert DefaultRulingNotConfigured(proposalId);
            }
            if (arbitrableConfig.defaultRuling == 1) {
                proposal.proposalStatus = ProposalStatus.Active;
                _handleStreamingResolution(proposalId, true);
            }
            if (arbitrableConfig.defaultRuling == 2) {
                proposal.proposalStatus = ProposalStatus.Rejected;
                _handleStreamingResolution(proposalId, false);
                collateralVault.withdrawCollateral(
                    proposalId, proposal.submitter, arbitrableConfig.submitterCollateralAmount
                );
            }
            collateralVault.withdrawCollateral(
                proposalId, proposal.disputeInfo.challenger, arbitrableConfig.challengerCollateralAmount
            );
        } else if (_ruling == 1) {
            proposal.proposalStatus = ProposalStatus.Active;
            _handleStreamingResolution(proposalId, true);
            collateralVault.withdrawCollateralFor(
                proposalId,
                proposal.disputeInfo.challenger,
                address(registryCommunity.councilSafe()),
                arbitrableConfig.challengerCollateralAmount
            );
        } else if (_ruling == 2) {
            proposal.proposalStatus = ProposalStatus.Rejected;
            _handleStreamingResolution(proposalId, false);
            collateralVault.withdrawCollateral(
                proposalId, proposal.disputeInfo.challenger, arbitrableConfig.challengerCollateralAmount
            );
            collateralVault.withdrawCollateralFor(
                proposalId,
                proposal.submitter,
                address(registryCommunity.councilSafe()),
                arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount / 2
            );
            collateralVault.withdrawCollateralFor(
                proposalId,
                proposal.submitter,
                proposal.disputeInfo.challenger,
                arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount / 2
            );
        }

        disputeCount--;
        proposal.lastDisputeCompletion = block.timestamp;
        emit Ruling(arbitrableConfig.arbitrator, _disputeID, _ruling);
    }

    function _handleStreamingResolution(uint256 proposalId, bool active) internal {
        if (proposalType != ProposalType.Streaming) {
            return;
        }
        address escrow = CVStreamingStorage.layout().proposalEscrow[proposalId];
        if (escrow == address(0)) {
            return;
        }
        if (active) {
            StreamingEscrow(escrow).setDisputed(false);
            StreamingEscrow(escrow).drainToBeneficiary();
        } else {
            StreamingEscrow(escrow).drainToStrategy();
            CVStreamingStorage.layout().proposalEscrow[proposalId] = address(0);
        }
    }
}
