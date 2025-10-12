// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunityV0_0} from "../RegistryCommunity/RegistryCommunityV0_0.sol";
import {ICollateralVault} from "../interfaces/ICollateralVault.sol";
import {ISybilScorer} from "../ISybilScorer.sol";
import {ProposalType, PointSystem, Proposal, PointSystemConfig, ArbitrableConfig, CVParams} from "./ICVStrategy.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVStrategyStorage
 * @notice Base contract containing all storage variables for CVStrategy and its facets
 * @dev CRITICAL: This contract defines the storage layout for the Diamond pattern.
 *      All contracts that inherit from this MUST maintain the exact same storage layout.
 *
 *      Storage Layout (EIP-1967 + Custom):
 *      - Slots 0-50:   Initializable (inherited from Initializable pattern)
 *      - Slots 51-100: OwnableUpgradeable (inherited from Ownable pattern)
 *      - Slots 101-105: BaseStrategyUpgradeable (Allo v2 base strategy)
 *      - Slots 106+:   CVStrategy custom storage
 *
 *      IMPORTANT: When adding new storage variables, always add them at the END to maintain
 *      upgrade compatibility. Never reorder, remove, or insert variables in the middle.
 *
 *      WARNING: All contracts must inherit from CVStrategyStorage FIRST in their inheritance list
 *      to ensure correct storage layout. Example:
 *      ✅ contract AllocationFacet is CVStrategyStorage { ... }
 *      ❌ contract AllocationFacet is SomeOther, CVStrategyStorage { ... } // WRONG ORDER!
 */
abstract contract CVStrategyStorage {
    /*|--------------------------------------------|*/
    /*|        INHERITED STORAGE LAYOUT            |*/
    /*|  Slots 0-50: Initializable                |*/
    /*|--------------------------------------------|*/

    /// @dev Indicates that the contract has been initialized
    uint8 internal _initialized;

    /// @dev Indicates that the contract is in the process of being initialized
    bool internal _initializing;

    /// @dev Reserved storage space to allow for layout changes in upgrades (50 slots)
    uint256[50] private __gap_init;

    /*|--------------------------------------------|*/
    /*|  Slots 51-100: OwnableUpgradeable          |*/
    /*|--------------------------------------------|*/

    /// @dev Owner of the contract (Ownable pattern)
    address internal _owner;

    /// @dev Reserved storage space to allow for layout changes in upgrades (49 slots)
    uint256[49] private __gap_ownable;

    /*|--------------------------------------------|*/
    /*|  Slots 101-105: BaseStrategyUpgradeable    |*/
    /*|--------------------------------------------|*/

    /// @dev The Allo contract address
    IAllo internal allo;

    /// @dev The unique identifier for the strategy
    bytes32 internal strategyId;

    /// @dev Whether the pool is active
    bool internal poolActive;

    /// @dev The pool ID
    uint256 internal poolId;

    /// @dev The current pool amount
    uint256 internal poolAmount;

    /*|--------------------------------------------|*/
    /*|  Slots 106+: CVStrategy Custom Storage     |*/
    /*|--------------------------------------------|*/

    /// @notice Template address for cloning CollateralVault instances
    /// @dev Slot 106
    address internal collateralVaultTemplate;

    /// @dev Used to suppress Solidity warnings - Slot 107
    uint256 internal surpressStateMutabilityWarning;

    /// @notice Nonce for creating unique clone addresses - Slot 108
    uint256 public cloneNonce;

    /// @notice Counter for dispute IDs - Slot 109
    uint64 public disputeCount;

    /// @notice Counter for proposal IDs - Slot 110
    uint256 public proposalCounter;

    /// @notice Current version of arbitrable configuration - Slot 111
    uint256 public currentArbitrableConfigVersion;

    /// @notice Total points staked across all proposals - Slot 112
    uint256 public totalStaked;

    /// @notice Total voting power activated in this strategy - Slot 113
    uint256 public totalPointsActivated;

    /// @notice Conviction Voting parameters (decay, weight, maxRatio, minThresholdPoints)
    /// @dev Slots 114-117
    CVParams public cvParams;

    /// @notice Type of proposals (Funding or Signaling) - Slot 118
    ProposalType public proposalType;

    /// @notice Voting power calculation system (Unlimited, Fixed, Capped, Quadratic) - Slot 119
    PointSystem public pointSystem;

    /// @notice Configuration for point system (e.g., max amount for Capped)
    /// @dev Slot 120+
    PointSystemConfig public pointConfig;

    /// @notice Reference to the Registry Community contract
    /// @dev Slot 121+
    RegistryCommunityV0_0 public registryCommunity;

    /// @notice Collateral vault for storing proposal collateral
    /// @dev Slot 122+
    ICollateralVault public collateralVault;

    /// @notice Sybil resistance scorer contract
    /// @dev Slot 123+
    ISybilScorer public sybilScorer;

    /// @notice Mapping of proposal ID to Proposal struct
    /// @dev Slot 124+
    mapping(uint256 => Proposal) public proposals;

    /// @notice Mapping of voter address to total staked percentage
    /// @dev Slot 125+
    mapping(address => uint256) public totalVoterStakePct;

    /// @notice Mapping of voter address to array of proposal IDs they've staked on
    /// @dev Slot 126+
    mapping(address => uint256[]) public voterStakedProposals;

    /// @notice Mapping of dispute ID to proposal ID
    /// @dev Slot 127+
    mapping(uint256 => uint256) public disputeIdToProposalId;

    /// @notice Mapping of arbitrable config version to ArbitrableConfig
    /// @dev Slot 128+
    mapping(uint256 => ArbitrableConfig) public arbitrableConfigs;

    /// @notice Superfluid super token address for streaming payments
    /// @dev Slot 129+
    ISuperToken public superfluidToken;

    /// @dev Reserved storage space to allow for layout changes in the future
    /// @dev This gap is at the end of storage to allow adding new variables without shifting slots
    uint256[49] private __gap;
}
