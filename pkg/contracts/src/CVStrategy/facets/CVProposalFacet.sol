// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyStorage} from "../CVStrategyStorage.sol";
import {ProposalType, CreateProposal, Proposal, ProposalStatus} from "../ICVStrategy.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVProposalFacet
 * @notice Facet containing proposal management functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategyV0_0
 *      CRITICAL: Storage layout is inherited from CVStrategyStorage base contract
 */
contract CVProposalFacet is CVStrategyStorage {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event ProposalCreated(uint256 poolId, uint256 proposalId);
    event ProposalCancelled(uint256 proposalId);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );

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

    function checkSenderIsMember(address _sender) internal {
        if (!registryCommunity.isMember(_sender)) {
            revert();
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function registerRecipient(bytes memory _data, address _sender) external payable returns (address) {
        _checkOnlyAllo();
        _checkOnlyInitialized();
        checkSenderIsMember(_sender);
        registryCommunity.onlyStrategyEnabled(address(this));

        _data;
        CreateProposal memory proposal = abi.decode(_data, (CreateProposal));

        if (proposalType == ProposalType.Funding) {
            IAllo _allo = IAllo(address(allo));
            if (proposal.requestedToken != _allo.getPool(proposal.poolId).token) {
                revert();
            }
        }

        if (
            address(arbitrableConfigs[currentArbitrableConfigVersion].arbitrator) != address(0)
                && msg.value < arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
        ) {
            revert();
        }

        uint256 proposalId = ++proposalCounter;
        Proposal storage p = proposals[proposalId];

        p.proposalId = proposalId;
        p.submitter = _sender;
        p.beneficiary = proposal.beneficiary;
        p.requestedToken = proposal.requestedToken;
        p.requestedAmount = proposal.amountRequested;
        p.proposalStatus = ProposalStatus.Active;
        p.blockLast = block.number;
        p.convictionLast = 0;
        p.metadata = proposal.metadata;
        p.arbitrableConfigVersion = currentArbitrableConfigVersion;
        collateralVault.depositCollateral{value: msg.value}(proposalId, p.submitter);

        emit ProposalCreated(poolId, proposalId);
        return address(uint160(proposalId));
    }

    function cancelProposal(uint256 proposalId) external {
        if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
            revert();
        }

        if (proposals[proposalId].submitter != msg.sender) {
            revert();
        }

        collateralVault.withdrawCollateral(
            proposalId,
            proposals[proposalId].submitter,
            arbitrableConfigs[proposals[proposalId].arbitrableConfigVersion].submitterCollateralAmount
        );

        proposals[proposalId].proposalStatus = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId);
    }
}
