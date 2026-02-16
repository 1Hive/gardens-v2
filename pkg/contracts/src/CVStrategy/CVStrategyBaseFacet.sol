// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {RegistryCommunity} from "../RegistryCommunity/RegistryCommunity.sol";
import {ICollateralVault} from "../interfaces/ICollateralVault.sol";
import {ISybilScorer} from "../ISybilScorer.sol";
import {ProposalType, PointSystem, Proposal, PointSystemConfig, ArbitrableConfig, CVParams} from "./ICVStrategy.sol";
import {ConvictionsUtils} from "./ConvictionsUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import {LibDiamond} from "@src/diamonds/libraries/LibDiamond.sol";
import {IPauseController} from "../interfaces/IPauseController.sol";
import {IVotingPowerRegistry} from "../interfaces/IVotingPowerRegistry.sol";
import {LibPauseStorage} from "../pausing/LibPauseStorage.sol";

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
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error OnlyInitialized(uint256 poolId);
    error OnlyRegistryCommunity(address sender, address registry);
    error OnlyAllo(address sender, address allo);
    error OnlyMember(address wallet, address community);
    error OnlyCouncilSafe(address sender, address councilSafe, address owner);
    error OnlyCouncilSafeOrMember(address sender, address councilSafe);
    error ProposalDoesNotExist(uint256 proposalID);
    error OnlyActiveProposal(uint256 proposalId);
    error OnlySubmitter(uint256 proposalId, address submitter, address sender);
    error StrategyPaused(address controller);
    error StrategySelectorPaused(bytes4 selector, address controller);

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
    // slither-disable-next-line uninitialized-state
    IAllo internal allo;
    bytes32 internal strategyId;
    bool internal poolActive;
    // slither-disable-next-line uninitialized-state
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
    // slither-disable-next-line uninitialized-state
    uint256 public currentArbitrableConfigVersion;

    /// @notice Total points staked across all proposals - Slot 112
    uint256 public totalStaked;

    /// @notice Total voting power activated in this strategy - Slot 113
    // slither-disable-next-line uninitialized-state
    uint256 public totalPointsActivated;

    /// @notice Conviction Voting parameters (decay, weight, maxRatio, minThresholdPoints)
    /// @dev Slots 114-117
    // slither-disable-next-line uninitialized-state
    CVParams public cvParams;

    /// @notice Type of proposals (Funding or Signaling) - Slot 118
    // slither-disable-next-line uninitialized-state
    ProposalType public proposalType;

    /// @notice Voting power calculation system (Unlimited, Fixed, Capped, Quadratic) - Slot 119
    // slither-disable-next-line uninitialized-state
    PointSystem public pointSystem;

    /// @notice Configuration for point system (e.g., max amount for Capped)
    /// @dev Slot 120+
    // slither-disable-next-line uninitialized-state
    PointSystemConfig public pointConfig;

    /// @notice Reference to the Registry Community contract
    /// @dev Slot 121+
    // slither-disable-next-line uninitialized-state
    RegistryCommunity public registryCommunity;

    /// @notice Collateral vault for storing proposal collateral
    /// @dev Slot 122+
    // slither-disable-next-line uninitialized-state
    ICollateralVault public collateralVault;

    /// @notice Sybil resistance scorer contract
    /// @dev Slot 123+
    // slither-disable-next-line uninitialized-state
    ISybilScorer public sybilScorer;

    /// @notice Mapping of proposal ID to Proposal struct
    /// @dev Slot 124+
    mapping(uint256 => Proposal) public proposals;

    /// @notice Mapping of voter address to total staked percentage
    /// @dev Slot 125+
    mapping(address => uint256) public totalVoterStakePct;

    /// @notice Mapping of voter address to array of proposal IDs they've staked on
    /// @dev Slot 126+
    // slither-disable-next-line uninitialized-state
    mapping(address => uint256[]) public voterStakedProposals;

    /// @notice Mapping of dispute ID to proposal ID
    /// @dev Slot 127+
    mapping(uint256 => uint256) public disputeIdToProposalId;

    /// @notice Mapping of arbitrable config version to ArbitrableConfig
    /// @dev Slot 128+
    // slither-disable-next-line uninitialized-state
    mapping(uint256 => ArbitrableConfig) public arbitrableConfigs;

    /// @notice Superfluid super token address for streaming payments
    /// @dev Slot 129+
    // slither-disable-next-line uninitialized-state
    ISuperToken public superfluidToken;

    /// @notice Superfluid GDA contract address
    /// @dev Slot 130+
    // slither-disable-next-line uninitialized-state
    ISuperfluidPool public superfluidGDA;

    /// @notice Streaming rate per second for superfluid payments
    /// @dev Slot 131+
    // slither-disable-next-line uninitialized-state
    uint256 public streamingRatePerSecond;

    /// @notice Reference to the Voting Power Registry contract
    /// @dev Slot 132+
    // slither-disable-next-line uninitialized-state
    IVotingPowerRegistry public votingPowerRegistry;

    /// @dev Reserved storage space to allow for layout changes in the future
    /// @dev This gap is at the end of storage to allow adding new variables without shifting slots
    uint256[46] private __gap;

    /*|--------------------------------------------|*/
    /*|         SHARED HELPER FUNCTIONS            |*/
    /*|--------------------------------------------|*/

    /**
     * @notice Get the owner of the contract
     * @dev Accesses the _owner storage variable from OwnableUpgradeable layout
     * Sig: 0x8da5cb5b
     */
    function owner() internal view returns (address) {
        return LibDiamond.contractOwner();
    }

    /*|--------------------------------------------|*/
    /*|              PAUSE HELPERS                 |*/
    /*|--------------------------------------------|*/
    modifier whenNotPaused() {
        _enforceNotPaused(msg.sig);
        _;
    }

    modifier whenSelectorNotPaused(bytes4 selector) {
        _enforceSelectorNotPaused(selector);
        _;
    }

    function _enforceNotPaused(bytes4 selector) internal view {
        if (_isPauseSelector(selector)) {
            return;
        }
        address controller = LibPauseStorage.layout().pauseController;
        if (controller != address(0) && IPauseController(controller).isPaused(address(this))) {
            revert StrategyPaused(controller);
        }
    }

    function _enforceSelectorNotPaused(bytes4 selector) internal view {
        if (_isPauseSelector(selector)) {
            return;
        }
        address controller = LibPauseStorage.layout().pauseController;
        if (controller != address(0) && IPauseController(controller).isPaused(address(this), selector)) {
            revert StrategySelectorPaused(selector, controller);
        }
    }

    function _isPauseSelector(bytes4 selector) internal pure returns (bool) {
        return selector == bytes4(keccak256("setPauseController(address)"))
            || selector == bytes4(keccak256("pause(uint256)")) || selector == bytes4(keccak256("pause(bytes4,uint256)"))
            || selector == bytes4(keccak256("unpause()")) || selector == bytes4(keccak256("unpause(bytes4)"))
            || selector == bytes4(keccak256("pauseController()")) || selector == bytes4(keccak256("isPaused()"))
            || selector == bytes4(keccak256("isPaused(bytes4)")) || selector == bytes4(keccak256("pausedUntil()"))
            || selector == bytes4(keccak256("pausedSelectorUntil(bytes4)"));
    }

    /**
     * @notice Check if sender is a registered member in the registry community
     * @param _sender Address to check
     */
    function checkSenderIsMember(address _sender) internal {
        if (!votingPowerRegistry.isMember(_sender)) {
            revert OnlyMember(_sender, address(registryCommunity));
        }
    }

    /**
     * @notice Ensure only council safe or contract owner can call this function
     */
    function onlyCouncilSafe() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
            revert OnlyCouncilSafe(msg.sender, address(registryCommunity.councilSafe()), owner());
        }
    }

    /**
     * @notice Ensure only council safe or member who can execute actions can call
     */
    function onlyCouncilSafeOrMember() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && false == _canExecuteAction(msg.sender)) {
            revert OnlyCouncilSafeOrMember(msg.sender, address(registryCommunity.councilSafe()));
        }
    }

    /**
     * @notice Check if a user can execute actions (based on allowlist or sybil scorer)
     * @param _user User address to check
     * @return bool True if user can execute actions
     */
    function _canExecuteAction(address _user) internal view returns (bool) {
        if (address(sybilScorer) != address(0)) {
            return sybilScorer.canExecuteAction(_user, address(this));
        }
        // Custom point system with external registry: NFT ownership IS the gate
        if (pointSystem == PointSystem.Custom && address(votingPowerRegistry) != address(registryCommunity)) {
            return votingPowerRegistry.isMember(_user);
        }
        // Default: allowlist-based gating
        bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
        return registryCommunity.hasRole(allowlistRole, address(0))
            || registryCommunity.hasRole(allowlistRole, _user);
    }

    /**
     * @notice Ensure only Allo contract can call this function
     */
    modifier onlyAllo() {
        if (msg.sender != address(allo)) {
            revert OnlyAllo(msg.sender, address(allo));
        }
        _;
    }

    /**
     * @notice Ensure the pool has been initialized (poolId != 0)
     */
    modifier onlyInitialized() {
        if (poolId == 0) {
            revert OnlyInitialized(poolId);
        }
        _;
    }

    /**
     * @notice Ensure only the registry community can call this function
     */
    modifier onlyRegistryCommunity() {
        if (msg.sender != address(registryCommunity)) {
            revert OnlyRegistryCommunity(msg.sender, address(registryCommunity));
        }
        _;
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

    /// @notice Getter for the 'poolAmount'.
    /// @return The balance of the pool
    function getPoolAmount() internal view virtual returns (uint256) {
        address token = allo.getPool(poolId).token;

        if (token == NATIVE_TOKEN) {
            return address(this).balance;
        }

        uint256 base = ERC20(token).balanceOf(address(this));
        uint256 sf = address(superfluidToken) == address(0) ? 0 : superfluidToken.balanceOf(address(this));

        uint8 d = ERC20(token).decimals();
        if (d < 18) {
            sf /= 10 ** (18 - d); // downscale 18 -> d
        } else if (d > 18) {
            sf *= 10 ** (d - 18); // upscale 18 -> d  (unlikely)
        }
        return base + sf;
    }
}
