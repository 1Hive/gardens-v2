// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {FAllo} from "../interfaces/FAllo.sol";
import {ISafe} from "../interfaces/ISafe.sol";

/**
 * @title CommunityStorage
 * @notice Base contract containing all storage variables for RegistryCommunity and its facets
 * @dev CRITICAL: This contract defines the storage layout for the Diamond pattern.
 *      All contracts that inherit from this MUST maintain the exact same storage layout.
 *
 *      Storage Layout:
 *      - Slots 0-50:   Initializable (inherited from Initializable pattern)
 *      - Slots 51-100: OwnableUpgradeable (inherited from Ownable pattern)
 *      - Slots 101-150: ReentrancyGuardUpgradeable
 *      - Slots 151-200: AccessControlUpgradeable
 *      - Slots 201+:   RegistryCommunity custom storage
 *
 *      IMPORTANT: When adding new storage variables, always add them at the END to maintain
 *      upgrade compatibility. Never reorder, remove, or insert variables in the middle.
 *
 *      WARNING: All contracts must inherit from CommunityStorage FIRST in their inheritance list
 *      to ensure correct storage layout. Example:
 *      ✅ contract CommunityMemberFacet is CommunityStorage { ... }
 *      ❌ contract CommunityMemberFacet is SomeOther, CommunityStorage { ... } // WRONG ORDER!
 */
abstract contract CommunityStorage {
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
    /*|  Slots 101-150: ReentrancyGuardUpgradeable |*/
    /*|--------------------------------------------|*/

    /// @dev Status for reentrancy guard
    uint256 internal _status;

    /// @dev Reserved storage space (49 slots)
    uint256[49] private __gap_reentrancy;

    /*|--------------------------------------------|*/
    /*|  Slots 151-200: AccessControlUpgradeable   |*/
    /*|--------------------------------------------|*/

    /// @dev Mapping of role => account => hasRole
    mapping(bytes32 => mapping(address => bool)) internal _roles;

    /// @dev Mapping of role => admin role
    mapping(bytes32 => bytes32) internal _roleAdmin;

    /// @dev Reserved storage space (48 slots)
    uint256[48] private __gap_access_control;

    /*|--------------------------------------------|*/
    /*|  Slots 201+: RegistryCommunity Custom      |*/
    /*|--------------------------------------------|*/

    /// @notice The amount of tokens required to register a member - Slot 201
    uint256 public registerStakeAmount;

    /// @notice The fee charged to the community for each registration - Slot 202
    uint256 public communityFee;

    /// @notice The nonce used to create new strategy clones - Slot 203
    uint256 public cloneNonce;

    /// @notice The profileId of the community in the Allo Registry - Slot 204
    bytes32 public profileId;

    /// @notice Enable or disable the kick feature - Slot 205
    bool public isKickEnabled;

    /// @notice The address that receives the community fee - Slot 206
    address public feeReceiver;

    /// @notice The address of the registry factory - Slot 207
    address public registryFactory;

    /// @notice The address of the collateral vault template - Slot 208
    address public collateralVaultTemplate;

    /// @notice The address of the strategy template - Slot 209
    address public strategyTemplate;

    /// @notice The address of the pending council safe owner - Slot 210
    address payable public pendingCouncilSafe;

    /// @notice The Registry Allo contract - Slot 211
    IRegistry public registry;

    /// @notice The token used to stake in the community - Slot 212
    IERC20 public gardenToken;

    /// @notice The council safe contract address - Slot 213
    ISafe public councilSafe;

    /// @notice The Allo contract address - Slot 214
    FAllo public allo;

    /// @notice The community name - Slot 215
    string public communityName;

    /// @notice The covenant IPFS hash of community - Slot 216
    string public covenantIpfsHash;

    /// @notice List of enabled/disabled strategies - Slot 217
    mapping(address strategy => bool isEnabled) public enabledStrategies;

    /// @notice Power points for each member in each strategy - Slot 218
    mapping(address strategy => mapping(address member => uint256 power)) public memberPowerInStrategy;

    /// @notice Member information as the staked amount and if is registered in the community - Slot 219
    /// @dev Member struct contains: address member, uint256 stakedAmount, bool isRegistered
    mapping(address member => Member) public addressToMemberInfo;

    /// @notice List of strategies for each member are activated - Slot 220
    mapping(address member => address[] strategiesAddresses) public strategiesByMember;

    /// @notice Mapping to check if a member is activated in a strategy - Slot 221
    mapping(address member => mapping(address strategy => bool isActivated)) public memberActivatedInStrategies;

    /// @notice List of initial members to be added as pool managers in the Allo Pool - Slot 222
    address[] internal initialMembers;

    /// @notice The total number of members in the community - Slot 223
    uint256 public totalMembers;

    /// @dev Reserved storage space to allow for layout changes in the future
    /// @dev This gap is at the end of storage to allow adding new variables without shifting slots
    uint256[49] private __gap;
}

/// @notice Member struct for storing member information
struct Member {
    address member;
    uint256 stakedAmount;
    bool isRegistered;
}
