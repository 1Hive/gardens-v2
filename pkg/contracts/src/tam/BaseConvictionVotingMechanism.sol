// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IVotingPowerRegistry} from "../interfaces/IVotingPowerRegistry.sol";
import {ConvictionsUtils} from "../CVStrategy/ConvictionsUtils.sol";
import {PointSystem, PointSystemConfig} from "../CVStrategy/ICVStrategy.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title BaseConvictionVotingMechanism
 * @notice Minimal proxy for Conviction Voting TAM with onlySelf-gated hooks
 * @dev Storage lives HERE, logic delegates to ConvictionVotingTAM implementation
 * 
 * Yearn V3 Pattern (from Octant TAM):
 * - This contract holds all STATE
 * - Delegatecalls ConvictionVotingTAM for lifecycle methods
 * - Exposes HOOK WRAPPERS with onlySelf modifier
 * - Hooks callable ONLY via delegatecall (prevents external manipulation)
 * 
 * Hook Functions (Policy Injection Points):
 * - beforeSignupHook: Check member eligibility
 * - getVotingPowerHook: Calculate power from deposit (1:1, capped, quadratic)
 * - processVoteHook: Apply voting cost (linear for conviction)
 * - hasQuorumHook: Check conviction threshold
 * - requestCustomDistributionHook: Start Superfluid stream instead of shares
 */
contract BaseConvictionVotingMechanism {
    using SuperTokenV1Library for ISuperToken;
    using ConvictionsUtils for uint256;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlySelf();

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    // Implementation address (immutable)
    address public immutable implementation;
    
    // TAM core state (must match ConvictionVotingTAM.sol)
    address public owner;
    address public management;
    IERC20 public asset;
    
    // Gardens-specific configuration
    IVotingPowerRegistry public registryCommunity;
    PointSystem public pointSystem;
    PointSystemConfig public pointConfig;
    ISuperToken public superToken;
    address public superfluidGDA;
    
    // Conviction parameters (from Gardens CVParams)
    uint256 public decay;
    uint256 public weight;
    uint256 public maxRatio;
    uint256 public minThresholdPoints;
    uint256 public totalPointsActivated;
    
    // Proposal tracking (simplified - full struct in ConvictionVotingTAM)
    mapping(uint256 => uint256) public proposalRequestedAmount;
    mapping(uint256 => address) public proposalRecipient;
    mapping(uint256 => uint256) public proposalSupport;
    mapping(uint256 => uint256) public proposalConviction;
    mapping(uint256 => uint256) public proposalLastBlock;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _implementation) {
        if (_implementation == address(0)) revert();
        implementation = _implementation;
    }

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initialize TAM with conviction voting parameters
     * @param _asset Funding token
     * @param _registryCommunity Gardens registry
     * @param _decay Conviction decay parameter
     * @param _weight Conviction weight parameter
     * @param _maxRatio Max ratio parameter
     * @param _minThresholdPoints Min threshold parameter
     * @param _pointSystem Voting power system
     * @param _pointConfig Point system configuration
     * @param _superToken Superfluid super token
     */
    function initialize(
        IERC20 _asset,
        address _registryCommunity,
        uint256 _decay,
        uint256 _weight,
        uint256 _maxRatio,
        uint256 _minThresholdPoints,
        PointSystem _pointSystem,
        PointSystemConfig memory _pointConfig,
        ISuperToken _superToken
    ) external {
        // Store configuration
        registryCommunity = IVotingPowerRegistry(_registryCommunity);
        decay = _decay;
        weight = _weight;
        maxRatio = _maxRatio;
        minThresholdPoints = _minThresholdPoints;
        pointSystem = _pointSystem;
        pointConfig = _pointConfig;
        superToken = _superToken;
        
        // Delegate to implementation for rest of initialization
        _delegate();
    }

    /*//////////////////////////////////////////////////////////////
                        HOOK WRAPPERS (onlySelf)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Hook wrapper: Check user eligibility
     * @dev onlySelf ensures only callable via delegatecall from implementation
     */
    function beforeSignupHook(address user, uint256 deposit) external {
        if (msg.sender != address(this)) revert OnlySelf();
        
        // Policy: User must be Gardens community member
        require(registryCommunity.isMember(user), "Not a community member");
    }

    /**
     * @notice Hook wrapper: Calculate voting power
     * @dev onlySelf ensures only callable via delegatecall
     */
    function getVotingPowerHook(uint256 deposit) external returns (uint256) {
        if (msg.sender != address(this)) revert OnlySelf();
        
        // Policy: Apply Gardens point system
        if (pointSystem == PointSystem.Unlimited) {
            return deposit;
        } else if (pointSystem == PointSystem.Fixed) {
            return pointConfig.maxAmount;
        } else if (pointSystem == PointSystem.Capped) {
            return deposit > pointConfig.maxAmount ? pointConfig.maxAmount : deposit;
        } else if (pointSystem == PointSystem.Quadratic) {
            return Math.sqrt(deposit * 1e18) / 1e9; // Scale for precision
        }
        return deposit;
    }

    /**
     * @notice Hook wrapper: Process vote and return new power
     * @dev onlySelf ensures only callable via delegatecall
     */
    function processVoteHook(
        address voter,
        uint256 proposalId,
        uint256 voteWeight,
        uint256 currentPower
    ) external returns (uint256 newPower) {
        if (msg.sender != address(this)) revert OnlySelf();
        
        // Policy: Linear cost (not quadratic like QF)
        // User allocates 'voteWeight' power to proposal
        require(currentPower >= voteWeight, "Insufficient power");
        
        return currentPower - voteWeight;
    }

    /**
     * @notice Hook wrapper: Check if proposal meets threshold
     * @dev onlySelf ensures only callable via delegatecall
     */
    function hasQuorumHook(uint256 proposalId) external view returns (bool) {
        if (msg.sender != address(this)) revert OnlySelf();
        
        // Policy: Conviction threshold (from Gardens formula)
        uint256 conviction = _calculateCurrentConviction(proposalId);
        uint256 threshold = _calculateThreshold(proposalId);
        
        return conviction >= threshold;
    }

    /**
     * @notice Hook wrapper: Request custom distribution (streaming)
     * @dev onlySelf ensures only callable via delegatecall
     */
    function requestCustomDistributionHook(address recipient, uint256 support)
        external
        returns (bool useCustom, uint256 transferred)
    {
        if (msg.sender != address(this)) revert OnlySelf();
        
        // Policy: Start Superfluid stream instead of minting shares
        if (address(superToken) != address(0) && superfluidGDA != address(0)) {
            // Calculate units based on support
            uint128 units = uint128((support * 10000) / totalPointsActivated);
            
            // Start stream via Superfluid
            ISuperfluidPool pool = ISuperfluidPool(superfluidGDA);
            try pool.updateMemberUnits(recipient, units) returns (bool success) {
                require(success, "updateMemberUnits failed");
                // Custom distribution successful
                return (true, 0); // No instant transfer, all streaming
            } catch {
                // Fall back to shares
                return (false, 0);
            }
        }
        
        // Default: Use share minting
        return (false, 0);
    }

    /*//////////////////////////////////////////////////////////////
                        CONVICTION CALCULATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate current conviction for proposal
     * @dev Uses Gardens conviction formula
     */
    function _calculateCurrentConviction(uint256 proposalId) internal view returns (uint256) {
        uint256 support = proposalSupport[proposalId];
        uint256 lastConv = proposalConviction[proposalId];
        uint256 blockLast = proposalLastBlock[proposalId];
        
        if (blockLast == 0) return 0;
        
        return ConvictionsUtils.calculateConviction(
            block.number - blockLast,
            lastConv,
            support,
            decay
        );
    }

    /**
     * @notice Calculate threshold for proposal
     * @dev Uses Gardens threshold formula
     */
    function _calculateThreshold(uint256 proposalId) internal view returns (uint256) {
        uint256 requestedAmount = proposalRequestedAmount[proposalId];
        
        if (requestedAmount == 0) return 0;
        
        uint256 poolAmount = asset.balanceOf(address(this));
        
        return ConvictionsUtils.calculateThreshold(
            requestedAmount,
            poolAmount,
            totalPointsActivated,
            decay,
            weight,
            maxRatio,
            minThresholdPoints
        );
    }

    /*//////////////////////////////////////////////////////////////
                            FALLBACK (DELEGATECALL)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Fallback delegates to implementation
     * @dev All calls not matched by proxy go to implementation via delegatecall
     */
    fallback() external payable {
        _delegate();
    }

    receive() external payable {
        _delegate();
    }

    /**
     * @notice Internal delegation to implementation
     */
    function _delegate() internal {
        address impl = implementation;
        
        assembly {
            // Copy calldata to memory
            calldatacopy(0, 0, calldatasize())
            
            // Delegatecall to implementation
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            
            // Copy return data
            returndatacopy(0, 0, returndatasize())
            
            // Return or revert
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getConviction(uint256 proposalId) external view returns (uint256) {
        return _calculateCurrentConviction(proposalId);
    }

    function getThreshold(uint256 proposalId) external view returns (uint256) {
        return _calculateThreshold(proposalId);
    }
}

