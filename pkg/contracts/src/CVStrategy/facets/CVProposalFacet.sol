// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {CVStreamingStorage, CVStreamingBase} from "../CVStreamingStorage.sol";
import {StreamingEscrowFactory} from "../StreamingEscrowFactory.sol";
import {StreamingEscrow} from "../StreamingEscrow.sol";
import {IRegistryFactory} from "../../IRegistryFactory.sol";
import {ProposalType, CreateProposal, Proposal, ProposalStatus} from "../ICVStrategy.sol";
import {IAllo, Metadata} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CVProposalFacet
 * @notice Facet containing proposal management functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVProposalFacet is CVStrategyBaseFacet, CVStreamingBase {
    using SuperTokenV1Library for ISuperToken;
    using Strings for string;

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error ProposalNotActive(uint256 proposalId, uint8 currentStatus); // 0x14b469ec
    error UnexpectedRequestToken(address requestedToken, address poolToken); // 0x24bb70b8
    error ArbitratorNotSet(); // 0x25a25805
    error InsufficientCollateral(uint256 sent, uint256 required); // 0xb07e3bc4
    error BeneficiaryEditTimeout(
        uint256 proposalId, address currentBeneficiary, address newBeneficiary, uint256 creationTimestamp
    ); // 0xd209029d
    error MetadataEditTimeout(
        uint256 proposalId, string currentMetadata, string newMetadata, uint256 creationTimestamp
    ); // 0x7195b4df
    error CannotEditRequestedAmountWithActiveSupport(uint256 proposalId, uint256 currentAmount, uint256 newAmount); // 0xb5018617
    error StreamingEscrowFactoryNotSet(); // 0x1dd8d4b9
    error UpdateMemberUnitsFailed(address member, uint128 units);

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event ProposalCreated(uint256 poolId, uint256 proposalId);
    event ProposalCancelled(uint256 proposalId);
    event ProposalEdited(uint256 proposalId, Metadata metadata, address beneficiary, uint256 requestedAmount);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );

    uint256 public constant ONE_HOUR = 3600; // seconds

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    // Sig: 0x2bbe0cae
    function registerRecipient(bytes memory _data, address _sender)
        external
        payable
        onlyAllo
        onlyInitialized
        returns (address)
    {
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

        if (address(arbitrableConfigs[currentArbitrableConfigVersion].arbitrator) == address(0)) {
            revert ArbitratorNotSet();
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

        // Streaming proposal handling
        if (proposalType == ProposalType.Streaming) {
            address factory = IRegistryFactory(registryCommunity.registryFactory()).getStreamingEscrowFactory();
            if (factory == address(0)) {
                revert StreamingEscrowFactoryNotSet();
            }
            address escrow = StreamingEscrowFactory(factory)
                .deployEscrow(superfluidToken, superfluidGDA, p.beneficiary, address(this));
            setStreamingEscrow(proposalId, escrow);

            // Add a member to the GDA pool with 0 units initially
            if (!superfluidGDA.updateMemberUnits(address(escrow), 0)) {
                revert UpdateMemberUnitsFailed(address(escrow), 0);
            }
        }

        emit ProposalCreated(poolId, proposalId);
        // casting proposalId to address is safe - standard pattern for unique addresses
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(uint160(proposalId));
    }

    // Sig: 0xe0a8f6f5
    function cancelProposal(uint256 proposalId) external {
        if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
            revert ProposalNotActive(proposalId, uint8(proposals[proposalId].proposalStatus));
        }

        if (proposals[proposalId].submitter != msg.sender) {
            revert OnlySubmitter(proposalId, proposals[proposalId].submitter, msg.sender);
        }

        proposals[proposalId].proposalStatus = ProposalStatus.Cancelled;

        collateralVault.withdrawCollateral(
            proposalId,
            proposals[proposalId].submitter,
            arbitrableConfigs[proposals[proposalId].arbitrableConfigVersion].submitterCollateralAmount
        );

        // Streaming proposal handling
        if (proposalType == ProposalType.Streaming) {
            address escrow = streamingEscrow(proposalId);
            // Remove member from the GDA pool
            address member = escrow == address(0) ? proposals[proposalId].beneficiary : escrow;
            if (!superfluidGDA.updateMemberUnits(member, 0)) {
                revert UpdateMemberUnitsFailed(member, 0);
            }
            if (escrow != address(0)) {
                setStreamingEscrow(proposalId, address(0));
            }
        }

        emit ProposalCancelled(proposalId);
    }

    // Sig: 0x141e3b38
    function editProposal(
        uint256 _proposalId,
        Metadata memory _metadata,
        address _beneficiary,
        uint256 _requestedAmount
    ) external {
        //
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.proposalStatus != ProposalStatus.Active) {
            revert ProposalNotActive(_proposalId, uint8(proposal.proposalStatus));
        }

        if (proposal.submitter != msg.sender) {
            revert OnlySubmitter(_proposalId, proposal.submitter, msg.sender);
        }

        if ((proposal.requestedAmount != _requestedAmount)) {
            if (proposal.convictionLast != 0) {
                revert CannotEditRequestedAmountWithActiveSupport(
                    _proposalId, proposal.requestedAmount, _requestedAmount
                );
            }
            proposal.requestedAmount = _requestedAmount;
        }

        // 1763099258 - 1763007730  = 91528 > 3600
        bool timeout = block.timestamp - proposal.creationTimestamp > ONE_HOUR;
        bool beneficiaryChanged = proposal.beneficiary != _beneficiary;
        bool metadataChanged = !proposal.metadata.pointer.equal(_metadata.pointer);

        if (beneficiaryChanged) {
            if (timeout) {
                revert BeneficiaryEditTimeout(
                    _proposalId, proposal.beneficiary, _beneficiary, proposal.creationTimestamp
                );
            }
            proposal.beneficiary = _beneficiary;
        }

        if (metadataChanged) {
            if (timeout) {
                revert MetadataEditTimeout(
                    _proposalId, proposal.metadata.pointer, _metadata.pointer, proposal.creationTimestamp
                );
            }

            proposal.metadata.pointer = _metadata.pointer;
        }

        // Streaming proposal handling
        if (beneficiaryChanged && proposalType == ProposalType.Streaming) {
            address escrow = streamingEscrow(_proposalId);
            if (escrow != address(0)) {
                StreamingEscrow(escrow).setBeneficiary(_beneficiary);
            }
        }

        emit ProposalEdited(_proposalId, _metadata, _beneficiary, _requestedAmount);
    }
}
