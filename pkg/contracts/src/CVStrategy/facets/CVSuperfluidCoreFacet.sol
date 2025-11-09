// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVSuperfluidCoreFacet
 * @notice Core Superfluid streaming primitives for Gardens conviction voting
 * @dev Provides low-level stream management using Superfluid GDA (General Distribution Agreement)
 * 
 * Key Concepts:
 * - GDA (General Distribution Agreement): Superfluid pool that distributes incoming flow
 * - Units: Proportional share of GDA's total flow (10000 units = 100%)
 * - Streams: Continuous token flows to beneficiaries based on their unit allocation
 * 
 * Integration with Octant YDS:
 * - YDS strategy mints donation shares to GDA address
 * - This facet manages GDA unit distribution to proposal beneficiaries
 * - Conviction voting determines unit allocation (proportional or threshold-based)
 */
contract CVSuperfluidCoreFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event StreamStarted(
        uint256 indexed proposalId,
        address indexed beneficiary,
        uint128 units,
        uint256 timestamp
    );

    event StreamUpdated(
        uint256 indexed proposalId,
        address indexed beneficiary,
        uint128 oldUnits,
        uint128 newUnits,
        uint256 timestamp
    );

    event StreamStopped(
        uint256 indexed proposalId,
        address indexed beneficiary,
        uint256 timestamp
    );

    event GDAInitialized(
        uint256 indexed poolId,
        address indexed gda,
        address indexed superToken
    );

    event StreamingEnabled(bool enabled);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    // Errors now defined in CVStrategyBaseFacet for shared access

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initialize Superfluid GDA for this pool
     * @dev Council-only function to connect strategy to Superfluid distribution pool
     * @param gda Address of Superfluid GDA (General Distribution Agreement)
     */
    function initializeGDA(address gda) external {
        onlyCouncilSafe();
        _checkOnlyInitialized();
        
        if (gda == address(0)) revert GDANotConfigured();
        
        // Store GDA address
        superfluidGDA = gda;
        
        // Connect this strategy to the GDA
        if (address(superfluidToken) != address(0)) {
            bool success = superfluidToken.connectPool(ISuperfluidPool(gda));
            if (!success) {
                revert SuperfluidOperationFailed("connectPool");
            }
        }
        
        emit GDAInitialized(poolId, gda, address(superfluidToken));
    }

    /**
     * @notice Enable or disable streaming feature
     * @param enabled Whether streaming should be active
     */
    function setStreamingEnabled(bool enabled) external {
        onlyCouncilSafe();
        streamingEnabled = enabled;
        emit StreamingEnabled(enabled);
    }

    /*//////////////////////////////////////////////////////////////
                        STREAM MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Start streaming to a proposal beneficiary
     * @dev Connects beneficiary to GDA with specified unit allocation
     * @param proposalId Proposal receiving the stream
     * @param beneficiary Address to receive token stream
     * @param units Flow units (proportional share of total flow, 10000 = 100%)
     */
    function startStream(
        uint256 proposalId,
        address beneficiary,
        uint128 units
    ) external {
        _checkOnlyInitialized();
        
        if (!streamingEnabled) revert StreamingNotEnabled();
        if (units == 0) revert InvalidUnits();
        if (superfluidGDA == address(0)) revert GDANotConfigured();
        
        StreamState storage stream = proposalStreams[proposalId];
        if (stream.isActive) revert StreamAlreadyActive(proposalId);
        
        // Connect beneficiary to GDA with specified units
        ISuperfluidPool pool = ISuperfluidPool(superfluidGDA);
        try pool.updateMemberUnits(beneficiary, units) returns (bool success) {
            require(success, "updateMemberUnits failed");
            // Update stream state
            stream.isActive = true;
            stream.flowUnits = units;
            stream.lastUpdateBlock = block.number;
            stream.beneficiary = beneficiary;
            
            emit StreamStarted(proposalId, beneficiary, units, block.timestamp);
        } catch {
            revert SuperfluidOperationFailed("distributeToMemberWithPool");
        }
    }

    /**
     * @notice Update existing stream units
     * @dev Adjusts beneficiary's share of GDA flow
     * @param proposalId Proposal to update
     * @param newUnits New unit allocation
     */
    function updateStream(uint256 proposalId, uint128 newUnits) external {
        _checkOnlyInitialized();
        
        StreamState storage stream = proposalStreams[proposalId];
        if (!stream.isActive) revert StreamNotActive(proposalId);
        
        uint128 oldUnits = stream.flowUnits;
        if (oldUnits == newUnits) {
            return; // No change needed
        }
        
        // Update units in GDA
        ISuperfluidPool pool = ISuperfluidPool(superfluidGDA);
        try pool.updateMemberUnits(stream.beneficiary, newUnits) returns (bool success) {
            require(success, "updateMemberUnits failed");
            stream.flowUnits = newUnits;
            stream.lastUpdateBlock = block.number;
            
            emit StreamUpdated(proposalId, stream.beneficiary, oldUnits, newUnits, block.timestamp);
        } catch {
            revert SuperfluidOperationFailed("updateStream");
        }
    }

    /**
     * @notice Stop stream to a proposal
     * @dev Sets beneficiary's GDA units to zero, halting their flow
     * @param proposalId Proposal to stop streaming to
     */
    function stopStream(uint256 proposalId) external {
        _checkOnlyInitialized();
        
        StreamState storage stream = proposalStreams[proposalId];
        if (!stream.isActive) revert StreamNotActive(proposalId);
        
        address beneficiary = stream.beneficiary;
        
        // Set units to 0 to stop flow
        ISuperfluidPool pool = ISuperfluidPool(superfluidGDA);
        try pool.updateMemberUnits(beneficiary, 0) returns (bool success) {
            require(success, "updateMemberUnits failed");
            stream.isActive = false;
            stream.flowUnits = 0;
            stream.lastUpdateBlock = block.number;
            
            emit StreamStopped(proposalId, beneficiary, block.timestamp);
        } catch {
            revert SuperfluidOperationFailed("stopStream");
        }
    }

    /**
     * @notice Emergency stop all active streams
     * @dev Council-only safety function
     */
    function emergencyStopAllStreams() external {
        onlyCouncilSafe();
        
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (proposalStreams[i].isActive) {
                // Use internal call to avoid external checks
                _stopStreamInternal(i);
            }
        }
    }

    /**
     * @notice Internal stream stop (bypasses checks for emergency use)
     */
    function _stopStreamInternal(uint256 proposalId) internal {
        StreamState storage stream = proposalStreams[proposalId];
        
        // Best effort stop - don't revert on failure during emergency
        ISuperfluidPool pool = ISuperfluidPool(superfluidGDA);
        try pool.updateMemberUnits(stream.beneficiary, 0) returns (bool) {
            stream.isActive = false;
            stream.flowUnits = 0;
            stream.lastUpdateBlock = block.number;
            
            emit StreamStopped(proposalId, stream.beneficiary, block.timestamp);
        } catch {
            // Log but don't revert during emergency
        }
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get stream state for a proposal
     * @param proposalId Proposal ID
     * @return isActive Whether stream is currently flowing
     * @return flowUnits Current GDA units allocated
     * @return lastUpdateBlock Last block stream was modified
     * @return beneficiary Address receiving the stream
     */
    function getStreamState(uint256 proposalId)
        external
        view
        returns (
            bool isActive,
            uint128 flowUnits,
            uint256 lastUpdateBlock,
            address beneficiary
        )
    {
        StreamState storage stream = proposalStreams[proposalId];
        return (
            stream.isActive,
            stream.flowUnits,
            stream.lastUpdateBlock,
            stream.beneficiary
        );
    }

    /**
     * @notice Check if a proposal is currently streaming
     * @param proposalId Proposal ID
     * @return bool True if stream is active
     */
    function isStreamActive(uint256 proposalId) external view returns (bool) {
        return proposalStreams[proposalId].isActive;
    }

    /**
     * @notice Get GDA address for this pool
     * @return address GDA address (or zero if not configured)
     */
    function getGDA() external view returns (address) {
        return superfluidGDA;
    }

    /**
     * @notice Calculate GDA units from basis points
     * @dev Helper for converting percentages to Superfluid units
     * @param shareBps Share in basis points (10000 = 100%)
     * @param totalUnits Total available units
     * @return uint128 Calculated units
     */
    function calculateUnits(uint256 shareBps, uint128 totalUnits)
        public
        pure
        returns (uint128)
    {
        if (shareBps > 10000) revert InvalidUnits();
        return uint128((uint256(totalUnits) * shareBps) / 10000);
    }

    /**
     * @notice Get count of active streams
     * @return count Number of currently active streams
     */
    function getActiveStreamCount() external view returns (uint256 count) {
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (proposalStreams[i].isActive) {
                count++;
            }
        }
    }
}

