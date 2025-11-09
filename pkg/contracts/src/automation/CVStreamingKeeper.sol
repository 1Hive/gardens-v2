// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {AutomationCompatibleInterface} from "../interfaces/IAutomation.sol";
import {IYDSStrategy} from "../interfaces/IYDSStrategy.sol";
import {ProposalType} from "../CVStrategy/ICVStrategy.sol";

/**
 * @title CVStreamingKeeper
 * @notice Chainlink Automation keeper for Gardens streaming functionality
 * @dev Automates two critical functions:
 *      1. YDS report() - generates donation shares from yield
 *      2. Stream rebalancing - updates GDA unit distribution
 * 
 * Integration:
 * - Keeper checks if actions needed based on intervals
 * - Chainlink network calls performUpkeep() when checkUpkeep returns true
 * - Both YDS and streaming operations executed in single upkeep
 * 
 * Configuration:
 * - reportInterval: How often to report YDS (e.g., 24 hours)
 * - rebalanceInterval: How often to rebalance streams (e.g., 1 hour)
 */
contract CVStreamingKeeper is AutomationCompatibleInterface {

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyOwner();
    error ZeroAddress();
    error InvalidInterval();

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice CVStrategy contract with streaming facets
    ICVStrategy public strategy;

    /// @notice YDS strategy to report
    IYDSStrategy public ydsStrategy;

    /// @notice How often to call report() on YDS (e.g., 86400 for 24h)
    uint256 public reportInterval;

    /// @notice Base rebalance interval (calculated from conviction half-life)
    uint256 public baseRebalanceInterval;
    
    /// @notice Minimum interval between rebalances (rate limit)
    uint256 public minRebalanceInterval;

    /// @notice Last timestamp report() was called
    uint256 public lastReport;

    /// @notice Last timestamp streams were rebalanced
    uint256 public lastRebalance;

    /// @notice Owner who can update configuration
    address public owner;

    /// @notice Whether keeper is active
    bool public keeperActive;
    
    /// @notice Whether immediate rebalance was requested
    bool public immediateRebalanceRequested;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event YDSReported(uint256 timestamp, uint256 profit, uint256 loss);
    event StreamsRebalanced(uint256 timestamp, ProposalType poolType);
    event ConfigurationUpdated(
        uint256 reportInterval,
        uint256 baseRebalanceInterval,
        uint256 minRebalanceInterval
    );
    event ImmediateRebalanceRequested(uint256 timestamp, string reason);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event KeeperActiveSet(bool active);

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _strategy,
        address _ydsStrategy,
        uint256 _reportInterval,
        uint256 _baseRebalanceInterval,
        uint256 _minRebalanceInterval
    ) {
        if (_strategy == address(0) || _ydsStrategy == address(0)) revert ZeroAddress();
        if (_reportInterval == 0 || _baseRebalanceInterval == 0) revert InvalidInterval();
        if (_minRebalanceInterval == 0 || _minRebalanceInterval > _baseRebalanceInterval) revert InvalidInterval();
        
        strategy = ICVStrategy(_strategy);
        ydsStrategy = IYDSStrategy(_ydsStrategy);
        reportInterval = _reportInterval;
        baseRebalanceInterval = _baseRebalanceInterval;
        minRebalanceInterval = _minRebalanceInterval;
        owner = msg.sender;
        keeperActive = true;
        
        // Initialize timestamps
        lastReport = block.timestamp;
        lastRebalance = block.timestamp;
    }

    /*//////////////////////////////////////////////////////////////
                        CHAINLINK AUTOMATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if upkeep is needed
     * @dev Called by Chainlink network off-chain
     * @return upkeepNeeded True if any action needed
     * @return performData Encoded data indicating what actions to perform
     */
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        if (!keeperActive) {
            return (false, "");
        }
        
        bool needsReport = (block.timestamp - lastReport) >= reportInterval;
        
        // Check base interval OR immediate request (with rate limit)
        bool baseIntervalElapsed = (block.timestamp - lastRebalance) >= baseRebalanceInterval;
        bool rateLimitOk = (block.timestamp - lastRebalance) >= minRebalanceInterval;
        bool needsRebalance = (baseIntervalElapsed || immediateRebalanceRequested) && rateLimitOk;
        
        upkeepNeeded = needsReport || needsRebalance;
        performData = abi.encode(needsReport, needsRebalance);
    }

    /**
     * @notice Perform upkeep - execute needed actions
     * @dev Called by Chainlink network when checkUpkeep returns true
     * @param performData Encoded booleans indicating which actions to perform
     */
    function performUpkeep(bytes calldata performData) external override {
        (bool needsReport, bool needsRebalance) = abi.decode(performData, (bool, bool));
        
        // Action 1: Report YDS (generates donation shares)
        if (needsReport && (block.timestamp - lastReport) >= reportInterval) {
            try ydsStrategy.report() returns (uint256 profit, uint256 loss) {
                lastReport = block.timestamp;
                emit YDSReported(block.timestamp, profit, loss);
            } catch {
                // Log but don't revert - try again next time
            }
        }
        
        // Action 2: Rebalance streams (uses donation shares)
        bool rateLimitOk = (block.timestamp - lastRebalance) >= minRebalanceInterval;
        if (needsRebalance && rateLimitOk) {
            ProposalType poolType = strategy.proposalType();
            
            if (poolType == ProposalType.YieldDistribution) {
                // Proportional streaming
                try strategy.rebalanceYieldStreams() {
                    lastRebalance = block.timestamp;
                    immediateRebalanceRequested = false;  // Reset flag
                    emit StreamsRebalanced(block.timestamp, poolType);
                } catch {
                    // Log but don't revert
                }
            } else if (poolType == ProposalType.Funding || poolType == ProposalType.Streaming) {
                // Threshold-based streaming
                try strategy.batchEvaluateStreams() {
                    lastRebalance = block.timestamp;
                    immediateRebalanceRequested = false;  // Reset flag
                    emit StreamsRebalanced(block.timestamp, poolType);
                } catch {
                    // Log but don't revert
                }
            }
        }
    }
    
    /**
     * @notice Request immediate rebalance (bypasses base interval, respects rate limit)
     * @dev Can be called by anyone when significant conviction changes occur
     */
    function requestImmediateRebalance() external {
        immediateRebalanceRequested = true;
        emit ImmediateRebalanceRequested(block.timestamp, "Manual trigger");
    }

    /*//////////////////////////////////////////////////////////////
                            CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Update keeper intervals
     * @param _reportInterval New report interval
     * @param _baseRebalanceInterval New base rebalance interval
     * @param _minRebalanceInterval New minimum rebalance interval (rate limit)
     */
    function setIntervals(
        uint256 _reportInterval,
        uint256 _baseRebalanceInterval,
        uint256 _minRebalanceInterval
    ) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (_reportInterval == 0 || _baseRebalanceInterval == 0) revert InvalidInterval();
        if (_minRebalanceInterval == 0 || _minRebalanceInterval > _baseRebalanceInterval) revert InvalidInterval();
        
        reportInterval = _reportInterval;
        baseRebalanceInterval = _baseRebalanceInterval;
        minRebalanceInterval = _minRebalanceInterval;
        
        emit ConfigurationUpdated(_reportInterval, _baseRebalanceInterval, _minRebalanceInterval);
    }
    
    /**
     * @notice Calculate optimal rebalance interval based on conviction half-life
     * @param decay Conviction decay parameter (e.g., 9965853 for 7 days)
     * @return interval Optimal interval in seconds for 5% conviction change
     * 
     * @dev Formula: For n% change, t = ln(1-n/100) / ln(decay/D) * blockTime
     *      For 5% change with 7-day half-life: ~12 hours
     *      For 10% change: ~6 hours
     */
    function calculateOptimalInterval(uint256 decay) 
        public pure returns (uint256 interval) 
    {
        // Approximate calculation for 5% conviction change
        // For decay = 9965853 (7-day half-life):
        // Half-life ≈ 50400 blocks ≈ 7 days @ 12s/block
        // 5% change ≈ 0.074 * half-life ≈ 3732 blocks ≈ 12.4 hours
        
        uint256 D = 10000000;
        uint256 rate = D - decay;
        
        // Approximate half-life in blocks: ln(2) / ln(D / (D-rate))
        // For standard params: ~50400 blocks
        uint256 halfLifeBlocks = 50400;  // Can be made more precise
        
        // 5% conviction change ≈ 7.4% of half-life
        uint256 blocksFor5Percent = (halfLifeBlocks * 74) / 1000;
        
        // Convert to seconds (12s per block on Arbitrum)
        interval = blocksFor5Percent * 12;
        
        // Return in reasonable range (1-24 hours)
        if (interval < 3600) interval = 3600;  // Min 1 hour
        if (interval > 86400) interval = 86400;  // Max 24 hours
    }

    /**
     * @notice Enable or disable keeper
     * @param active Whether keeper should be active
     */
    function setKeeperActive(bool active) external {
        if (msg.sender != owner) revert OnlyOwner();
        keeperActive = active;
        emit KeeperActiveSet(active);
    }

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (newOwner == address(0)) revert ZeroAddress();
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get time until next report
     * @return uint256 Seconds until next report (0 if overdue)
     */
    function timeUntilNextReport() external view returns (uint256) {
        uint256 elapsed = block.timestamp - lastReport;
        if (elapsed >= reportInterval) return 0;
        return reportInterval - elapsed;
    }

    /**
     * @notice Get time until next rebalance
     * @return uint256 Seconds until next rebalance (0 if overdue or immediate requested)
     */
    function timeUntilNextRebalance() external view returns (uint256) {
        if (immediateRebalanceRequested) return 0;  // Immediate needed
        
        uint256 elapsed = block.timestamp - lastRebalance;
        if (elapsed >= baseRebalanceInterval) return 0;
        return baseRebalanceInterval - elapsed;
    }

    /**
     * @notice Get keeper status
     * @return active Whether keeper is active
     * @return needsReport Whether YDS report is needed
     * @return needsRebalance Whether stream rebalance is needed
     */
    function getKeeperStatus()
        external
        view
        returns (
            bool active,
            bool needsReport,
            bool needsRebalance
        )
    {
        active = keeperActive;
        needsReport = (block.timestamp - lastReport) >= reportInterval;
        
        bool baseElapsed = (block.timestamp - lastRebalance) >= baseRebalanceInterval;
        bool rateLimitOk = (block.timestamp - lastRebalance) >= minRebalanceInterval;
        needsRebalance = (baseElapsed || immediateRebalanceRequested) && rateLimitOk;
    }
    
    /**
     * @notice Get current interval configuration
     * @return report Report interval in seconds
     * @return base Base rebalance interval in seconds
     * @return min Minimum rebalance interval (rate limit) in seconds
     */
    function getIntervals() 
        external view returns (uint256 report, uint256 base, uint256 min) 
    {
        return (reportInterval, baseRebalanceInterval, minRebalanceInterval);
    }
}

/**
 * @notice Minimal interface for CVStrategy streaming functions
 */
interface ICVStrategy {
    function proposalType() external view returns (ProposalType);
    function rebalanceYieldStreams() external;
    function batchEvaluateStreams() external;
}

