// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {ProposalType, CreateProposal, Proposal, ProposalStatus} from "../ICVStrategy.sol";
import {IAllo, Metadata} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVProposalFacet
 * @notice Facet containing proposal management functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVProposalFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error ProposalNotActive(uint256 proposalId, ProposalStatus currentStatus);
    error UnexpectedRequestToken(address requestedToken, address poolToken);
    error ArbitratorNotSet(address arbitrator);
    error InsufficientCollateral(uint256 sent, uint256 required);

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event ProposalCreated(uint256 poolId, uint256 proposalId);
    event ProposalCancelled(uint256 proposalId);
    event ProposalEdited(uint256 proposalId, Metadata metadata, address beneficiary, uint256 requestedAmount);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );

    uint256 public constant ONE_HOUR = 3600;

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
            address poolToken = address(_allo.getPool(proposal.poolId).token);
            if (proposal.requestedToken != poolToken) {
                revert UnexpectedRequestToken(proposal.requestedToken, poolToken);
            }
        }

        if (address(arbitrableConfigs[currentArbitrableConfigVersion].arbitrator) != address(0)) {
            revert ArbitratorNotSet(address(arbitrableConfigs[currentArbitrableConfigVersion].arbitrator));
        }

        if (msg.value < arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount) {
            revert InsufficientCollateral(
                msg.value, arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
            );
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
        p.creationTimestamp = block.timestamp;
        p.convictionLast = 0;
        p.metadata = proposal.metadata;
        p.arbitrableConfigVersion = currentArbitrableConfigVersion;
        collateralVault.depositCollateral{value: msg.value}(proposalId, p.submitter);

        emit ProposalCreated(poolId, proposalId);
        // casting proposalId to address is safe - standard pattern for unique addresses
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(uint160(proposalId));
    }

    function cancelProposal(uint256 proposalId) external {
        if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
            revert ProposalNotActive(proposalId, proposals[proposalId].proposalStatus);
        }

        if (proposals[proposalId].submitter != msg.sender) {
            revert OnlySubmitter(proposalId, proposals[proposalId].submitter, msg.sender);
        }

        collateralVault.withdrawCollateral(
            proposalId,
            proposals[proposalId].submitter,
            arbitrableConfigs[proposals[proposalId].arbitrableConfigVersion].submitterCollateralAmount
        );

        proposals[proposalId].proposalStatus = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    function editProposal(
        uint256 _proposalId,
        Metadata memory _metadata,
        address _beneficiary,
        uint256 _requestedAmount
    ) external {
        //
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.proposalStatus != ProposalStatus.Active) {
            revert ProposalNotActive(_proposalId, proposal.proposalStatus);
        }

        if (proposal.submitter != msg.sender) {
            revert OnlySubmitter(_proposalId, proposal.submitter, msg.sender);
        }

        if (
            (proposal.beneficiary != _beneficiary || proposal.requestedAmount != _requestedAmount)
                && block.timestamp - proposal.creationTimestamp > ONE_HOUR
        ) {
            proposal.beneficiary = _beneficiary;
            proposal.requestedAmount = _requestedAmount;
        }

        if (compareStringsByHash(proposal.metadata.pointer, _metadata.pointer) && proposal.convictionLast == 0) {
            proposal.metadata.pointer = _metadata.pointer;
        }
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function compareStringsByHash(string memory _first, string memory _second) internal pure returns (bool) {
        // Convert both strings to bytes and hash them using abi.encodePacked
        bytes32 hash1 = keccak256(abi.encodePacked(_first));
        bytes32 hash2 = keccak256(abi.encodePacked(_second));

        // Compare the hashes
        return hash1 == hash2;
    }
}
