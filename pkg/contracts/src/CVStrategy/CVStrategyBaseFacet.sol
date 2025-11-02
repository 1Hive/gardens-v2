// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IVotingPowerRegistry} from "../interfaces/IVotingPowerRegistry.sol";
import {ICollateralVault} from "../interfaces/ICollateralVault.sol";
import {ISybilScorer} from "../ISybilScorer.sol";
import {ProposalType, PointSystem, Proposal, PointSystemConfig, ArbitrableConfig, CVParams} from "./ICVStrategy.sol";
import {ConvictionsUtils} from "./ConvictionsUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVStrategyBaseFacet
 * @notice Base contract for all CVStrategy facets, providing shared storage layout and helper functions
 * @dev CRITICAL: This contract defines the storage layout for CVStrategy and its facets.
 *      All facets MUST inherit from this contract to maintain consistent storage layout.
 *
 *      Storage Layout (must match CVStrategy):
 *      - Slots 0-50:   Initializable (from BaseStrategyUpgradeable in main contract)
 *      - Slots 51-100: OwnableUpgradeable (from BaseStrategyUpgradeable in main contract)
 *      - Slots 101-105: BaseStrategyUpgradeable (allo, strategyId, poolActive, poolId, poolAmount)
 *      - Slots 106+:   CVStrategy custom storage (defined below)
 *
 *      When facets are called via delegatecall from CVStrategy, they execute in the
 *      main contract's storage context and access these exact storage slots.
 *
 *      IMPORTANT: This is an abstract contract that only provides storage layout - it does NOT
 *      inherit from BaseStrategyUpgradeable to avoid requiring implementation of abstract methods.
 */
abstract contract CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;
    using ConvictionsUtils for uint256;

    /*|--------------------------------------------|*/
    /*|              CONSTANTS                     |*/
    /*|--------------------------------------------|*/
    uint256 public constant RULING_OPTIONS = 3;
    uint256 public constant DISPUTE_COOLDOWN_SEC = 2 hours;

    /// @notice Native token address (defined here to avoid import conflicts with allo-v2)
    address internal constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /*|--------------------------------------------|*/
    /*|      INHERITED STORAGE LAYOUT              |*/
    /*|  (Must match BaseStrategyUpgradeable)      |*/
    /*|--------------------------------------------|*/

    /// @dev Slots 0-50: Initializable (from BaseStrategyUpgradeable)
    uint8 internal _initialized;
    bool internal _initializing;
    uint256[50] private __gap_init;

    /// @dev Slots 51-100: OwnableUpgradeable (from BaseStrategyUpgradeable)
    address internal _owner;
    uint256[49] private __gap_ownable;

    /// @dev Slots 101-105: BaseStrategyUpgradeable
    IAllo internal allo;
    bytes32 internal strategyId;
    bool internal poolActive;
    uint256 internal poolId;
    uint256 internal poolAmount;

    /*|--------------------------------------------|*/
    /*|       CVSTRATEGY CUSTOM STORAGE            |*/
    /*|              (Slots 106+)                  |*/
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
    IVotingPowerRegistry public registryCommunity;

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

    /*|--------------------------------------------|*/
    /*|         SHARED HELPER FUNCTIONS            |*/
    /*|--------------------------------------------|*/

    /**
     * @notice Get the owner of the contract
     * @dev Accesses the _owner storage variable from OwnableUpgradeable layout
     */
    function owner() internal view returns (address) {
        return _owner;
    }

    /**
     * @notice Check if sender is a registered member in the registry community
     * @param _sender Address to check
     */
    function checkSenderIsMember(address _sender) internal {
        if (!registryCommunity.isMember(_sender)) {
            revert();
        }
    }

    /**
     * @notice Ensure only the registry community can call this function
     */
    function onlyRegistryCommunity() internal view {
        if (msg.sender != address(registryCommunity)) {
            revert();
        }
    }

    /**
     * @notice Ensure only council safe or contract owner can call this function
     */
    function onlyCouncilSafe() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
            revert();
        }
    }

    /**
     * @notice Ensure only council safe or member who can execute actions can call
     */
    function onlyCouncilSafeOrMember() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && false == _canExecuteAction(msg.sender)) {
            revert();
        }
    }

    /**
     * @notice Check if a user can execute actions (based on allowlist or sybil scorer)
     * @param _user User address to check
     * @return bool True if user can execute actions
     */
    function _canExecuteAction(address _user) internal view returns (bool) {
        if (address(sybilScorer) == address(0)) {
            bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
            if (registryCommunity.hasRole(allowlistRole, address(0))) {
                return true;
            } else {
                return registryCommunity.hasRole(allowlistRole, _user);
            }
        }
        return sybilScorer.canExecuteAction(_user, address(this));
    }

    /**
     * @notice Ensure only Allo contract can call this function
     */
    function _checkOnlyAllo() internal view {
        if (msg.sender != address(allo)) {
            revert();
        }
    }

    /**
     * @notice Ensure the pool has been initialized (poolId != 0)
     */
    function _checkOnlyInitialized() internal view {
        if (poolId == 0) {
            revert();
        }
    }

    /**
     * @notice Check if a proposal exists
     * @param _proposalID Proposal ID to check
     * @return bool True if proposal exists and has a valid submitter
     */
    function proposalExists(uint256 _proposalID) internal view returns (bool) {
        return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
    }

    /**
     * @notice Calculate and store conviction for a proposal
     * @param _proposal Proposal storage reference
     * @param _oldStaked Previous staked amount
     */
    function _calculateAndSetConviction(Proposal storage _proposal, uint256 _oldStaked) internal {
        (uint256 conviction, uint256 blockNumber) = _checkBlockAndCalculateConviction(_proposal, _oldStaked);
        if (conviction == 0 && blockNumber == 0) {
            return;
        }
        _proposal.blockLast = blockNumber;
        _proposal.convictionLast = conviction;
    }

    /**
     * @notice Calculate conviction if block has changed since last update
     * @param _proposal Proposal storage reference
     * @param _oldStaked Previous staked amount
     * @return conviction Calculated conviction
     * @return blockNumber Current block number
     */
    function _checkBlockAndCalculateConviction(Proposal storage _proposal, uint256 _oldStaked)
        internal
        view
        returns (uint256 conviction, uint256 blockNumber)
    {
        blockNumber = block.number;
        assert(_proposal.blockLast <= blockNumber);
        if (_proposal.blockLast == blockNumber) {
            return (0, 0); // Conviction already stored
        }
        // Calculate conviction using utility library
        conviction = ConvictionsUtils.calculateConviction(
            blockNumber - _proposal.blockLast, // time passed in blocks
            _proposal.convictionLast,
            _oldStaked,
            cvParams.decay
        );
    }
}
