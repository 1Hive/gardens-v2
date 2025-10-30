// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {IArbitrator} from "../../interfaces/IArbitrator.sol";
import {Proposal, ProposalStatus, ArbitrableConfig} from "../ICVStrategy.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVDisputeFacet
 * @notice Facet containing dispute-related functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategyV0_0
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVDisputeFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;

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
    
    function disputeProposal(uint256 proposalId, string calldata context, bytes calldata _extraData)
        external
        payable
        returns (uint256 disputeId)
    {
        checkSenderIsMember(msg.sender);
        Proposal storage proposal = proposals[proposalId];
        ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

        if (proposal.proposalStatus != ProposalStatus.Active) {
            revert();
        }
        if (msg.value < arbitrableConfig.challengerCollateralAmount) {
            revert();
        }

        // if the lastDisputeCompletion is less than DISPUTE_COOLDOWN_SEC, we should revert
        if (
            proposal.lastDisputeCompletion != 0
                && proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC > block.timestamp
        ) {
            revert();
        }

        uint256 arbitrationFee = msg.value - arbitrableConfig.challengerCollateralAmount;

        collateralVault.depositCollateral{value: arbitrableConfig.challengerCollateralAmount}(proposalId, msg.sender);

        disputeId = arbitrableConfig.arbitrator.createDispute{value: arbitrationFee}(RULING_OPTIONS, _extraData);

        proposal.proposalStatus = ProposalStatus.Disputed;
        proposal.disputeInfo.disputeId = disputeId;
        proposal.disputeInfo.disputeTimestamp = block.timestamp;
        proposal.disputeInfo.challenger = msg.sender;
        disputeIdToProposalId[disputeId] = proposalId;

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

    function rule(uint256 _disputeID, uint256 _ruling) external {
        uint256 proposalId = disputeIdToProposalId[_disputeID];
        Proposal storage proposal = proposals[proposalId];
        ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

        if (proposal.proposalStatus != ProposalStatus.Disputed) {
            revert();
        }

        bool isTimeOut = block.timestamp > proposal.disputeInfo.disputeTimestamp + arbitrableConfig.defaultRulingTimeout;

        if (!isTimeOut && msg.sender != address(arbitrableConfig.arbitrator)) {
            revert();
        }

        if (isTimeOut || _ruling == 0) {
            if (arbitrableConfig.defaultRuling == 0) {
                revert();
            }
            if (arbitrableConfig.defaultRuling == 1) {
                proposal.proposalStatus = ProposalStatus.Active;
            }
            if (arbitrableConfig.defaultRuling == 2) {
                proposal.proposalStatus = ProposalStatus.Rejected;
                collateralVault.withdrawCollateral(
                    proposalId, proposal.submitter, arbitrableConfig.submitterCollateralAmount
                );
            }
            collateralVault.withdrawCollateral(
                proposalId, proposal.disputeInfo.challenger, arbitrableConfig.challengerCollateralAmount
            );
        } else if (_ruling == 1) {
            proposal.proposalStatus = ProposalStatus.Active;
            collateralVault.withdrawCollateralFor(
                proposalId,
                proposal.disputeInfo.challenger,
                address(registryCommunity.councilSafe()),
                arbitrableConfig.challengerCollateralAmount
            );
        } else if (_ruling == 2) {
            proposal.proposalStatus = ProposalStatus.Rejected;
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
}
