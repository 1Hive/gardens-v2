// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {CVSyncPowerStorage} from "../CVSyncPowerStorage.sol";
import {Proposal} from "../ICVStrategy.sol";

/**
 * @title CVSyncPowerFacet
 * @notice Syncs voting power when NFT ownership changes (mint/revoke)
 * @dev Called by external modules (e.g., Green Goods HatsModule) to keep
 *      conviction accurate when voting power changes outside the staking flow.
 *
 *      This is the core integration point for NFT-gated conviction voting:
 *      when a Hat is revoked, the HatsModule calls syncPower() to rebalance
 *      the member's support across all proposals they've voted on.
 *
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet.
 *      Uses namespaced storage (CVSyncPowerStorage) for sync-specific state
 *      to avoid consuming __gap slots.
 */
contract CVSyncPowerFacet is CVStrategyBaseFacet {
    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/

    error NotAuthorizedSyncCaller(address caller);

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/

    event PowerSynced(address indexed member, uint256 oldPower, uint256 newPower);
    event MemberPowerRevoked(address indexed member, uint256 powerRemoved);
    event AuthorizedSyncCallerUpdated(address indexed caller, bool authorized);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );

    /*|--------------------------------------------|*/
    /*|              ADMIN FUNCTIONS               |*/
    /*|--------------------------------------------|*/

    /// @notice Authorize or deauthorize a caller for syncPower
    /// @dev Only callable by council safe or contract owner
    /// @param _caller The address to authorize (e.g., Green Goods HatsModule)
    /// @param _authorized Whether to authorize or deauthorize
    function setAuthorizedSyncCaller(address _caller, bool _authorized) external {
        onlyCouncilSafe();
        CVSyncPowerStorage.layout().authorizedSyncCallers[_caller] = _authorized;
        emit AuthorizedSyncCallerUpdated(_caller, _authorized);
    }

    /// @notice Check if an address is authorized to call syncPower
    function isAuthorizedSyncCaller(address _caller) external view returns (bool) {
        return CVSyncPowerStorage.layout().authorizedSyncCallers[_caller];
    }

    /*|--------------------------------------------|*/
    /*|              SYNC FUNCTIONS                |*/
    /*|--------------------------------------------|*/

    /// @notice Sync a member's voting power from the power registry
    /// @dev Called when NFT ownership changes. Recomputes power and adjusts
    ///      conviction on all proposals the member has staked on.
    /// @param _member The member whose power changed
    function syncPower(address _member) external {
        if (!CVSyncPowerStorage.layout().authorizedSyncCallers[msg.sender]) {
            revert NotAuthorizedSyncCaller(msg.sender);
        }

        _syncPowerInternal(_member);
    }

    /// @notice Batch sync power for multiple members
    /// @dev Useful when a role change affects multiple members simultaneously
    /// @param _members Array of member addresses to sync
    function batchSyncPower(address[] calldata _members) external {
        if (!CVSyncPowerStorage.layout().authorizedSyncCallers[msg.sender]) {
            revert NotAuthorizedSyncCaller(msg.sender);
        }

        for (uint256 i = 0; i < _members.length; i++) {
            _syncPowerInternal(_members[i]);
        }
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function _syncPowerInternal(address _member) internal {
        CVSyncPowerStorage.Layout storage syncLayout = CVSyncPowerStorage.layout();
        // Use strategy-local baseline first; fallback to registry cache for first sync.
        uint256 oldPower = syncLayout.hasSyncedPower[_member]
            ? syncLayout.syncedPower[_member]
            : registryCommunity.getMemberPowerInStrategy(_member, address(this));
        // Read live power from voting power registry
        uint256 newPower = votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));

        // Keep baseline fresh even when power is unchanged.
        if (newPower == oldPower) {
            syncLayout.syncedPower[_member] = newPower;
            syncLayout.hasSyncedPower[_member] = true;
            return;
        }

        if (newPower < oldPower) {
            uint256 decrease = oldPower - newPower;
            _handlePowerDecrease(_member, decrease, oldPower);
            emit MemberPowerRevoked(_member, decrease);
        } else {
            uint256 increase = newPower - oldPower;
            _handlePowerIncrease(_member, increase);
        }

        syncLayout.syncedPower[_member] = newPower;
        syncLayout.hasSyncedPower[_member] = true;
        emit PowerSynced(_member, oldPower, newPower);
    }

    /// @dev Handle power decrease — rebalance proposals proportionally
    ///      Mirrors the logic in CVPowerFacet.decreasePower()
    function _handlePowerDecrease(address _member, uint256 _decrease, uint256 _oldPower) internal {
        uint256 voterStake = totalVoterStakePct[_member];

        // Calculate unused (unallocated) power
        uint256 memberPower = _oldPower;
        uint256 unusedPower = memberPower > voterStake ? memberPower - voterStake : 0;

        if (unusedPower < _decrease && voterStake > 0) {
            // Must reduce conviction on active proposals
            uint256 reductionNeeded = _decrease - unusedPower;
            uint256 balancingRatio = (reductionNeeded << 128) / voterStake;

            for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
                _rebalanceProposalStake(_member, voterStakedProposals[_member][i], balancingRatio);
            }
        }

        totalPointsActivated -= _decrease;
    }

    /// @dev Handle power increase — just add to activated points
    function _handlePowerIncrease(address _member, uint256 _increase) internal {
        bool isActivated = registryCommunity.memberActivatedInStrategies(_member, address(this));
        if (isActivated) {
            totalPointsActivated += _increase;
        }
    }

    function _rebalanceProposalStake(address _member, uint256 _proposalId, uint256 _balancingRatio) internal {
        Proposal storage proposal = proposals[_proposalId];
        uint256 stakedPoints = proposal.voterStakedPoints[_member];
        uint256 newStakedPoints = stakedPoints - ((stakedPoints * _balancingRatio + (1 << 127)) >> 128);
        uint256 stakeDelta = stakedPoints - newStakedPoints;
        uint256 oldStake = proposal.stakedAmount;

        proposal.stakedAmount -= stakeDelta;
        proposal.voterStakedPoints[_member] = newStakedPoints;
        totalStaked -= stakeDelta;
        totalVoterStakePct[_member] -= stakeDelta;
        _calculateAndSetConviction(proposal, oldStake);

        emit SupportAdded(_member, _proposalId, newStakedPoints, proposal.stakedAmount, proposal.convictionLast);
    }
}
