// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {Proposal, ProposalStatus, ProposalType} from "../ICVStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CVYDSFacet
 * @notice Facet handling Yield Distribution pool harvest logic
 */
contract CVYDSFacet is CVStrategyBaseFacet {
    using SafeERC20 for IERC20;

    event YieldHarvested(address indexed caller, uint256 harvestedAmount, uint256 proposalCount);
    event YieldDistributed(uint256 indexed proposalId, address indexed beneficiary, uint256 amount);

    function harvestYDS() external {
        _checkOnlyInitialized();

        if (proposalType != ProposalType.YieldDistribution) {
            revert();
        }

        if (address(cvVault) == address(0)) {
            revert();
        }

        uint256 totalConviction;
        uint256 activeCount;
        uint256 proposalsLength = proposalCounter;

        uint256[] memory proposalIds = new uint256[](proposalsLength);
        uint256[] memory convictions = new uint256[](proposalsLength);

        for (uint256 i = 1; i <= proposalsLength; i++) {
            Proposal storage p = proposals[i];
            if (p.proposalStatus != ProposalStatus.Active) {
                continue;
            }
            _calculateAndSetConviction(p, p.stakedAmount);
            if (p.convictionLast == 0) {
                continue;
            }

            proposalIds[activeCount] = i;
            convictions[activeCount] = p.convictionLast;
            totalConviction += p.convictionLast;
            activeCount++;
        }

        if (activeCount == 0 || totalConviction == 0) {
            return;
        }

        uint256 harvestedAmount = cvVault.harvest(address(this));
        if (harvestedAmount == 0) {
            return;
        }

        address token = allo.getPool(poolId).token;
        uint256 distributed;
        for (uint256 j = 0; j < activeCount; j++) {
            uint256 proposalId = proposalIds[j];
            Proposal storage proposal = proposals[proposalId];
            uint256 share = (harvestedAmount * convictions[j]) / totalConviction;

            if (j == activeCount - 1 && harvestedAmount > distributed) {
                share = harvestedAmount - distributed;
            }

            if (share == 0) {
                continue;
            }

            distributed += share;
            _transfer(token, proposal.beneficiary, share);
            emit YieldDistributed(proposalId, proposal.beneficiary, share);
        }

        emit YieldHarvested(msg.sender, harvestedAmount, activeCount);
    }

    function _transfer(address token, address to, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        if (token == NATIVE_TOKEN) {
            (bool success,) = payable(to).call{value: amount}("");
            require(success, "Native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
