// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {AccessControlUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {ISafe} from "../interfaces/ISafe.sol";
import {FAllo} from "../interfaces/FAllo.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";

/// @notice Member struct for storing member information
struct Member {
    address member;
    uint256 stakedAmount;
    bool isRegistered;
}

/**
 * @title CommunityBaseFacet
 * @notice Base contract for all RegistryCommunity facets
 * @dev CRITICAL: This contract defines the storage layout for all Community facets.
 *      All facets must inherit from this contract to ensure correct storage alignment
 *      when called via delegatecall from RegistryCommunityV0_0.
 *
 *      Storage Layout MUST match RegistryCommunityV0_0 exactly:
 *      - Inherits from same base contracts in same order
 *      - Declares same storage variables in same order
 *
 *      When a facet is called via delegatecall, it executes in the main contract's
 *      storage context, so storage alignment is critical.
 */
abstract contract CommunityBaseFacet is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
    using ERC165Checker for address;
    using SafeERC20 for IERC20;
    using Clone for address;

    /*|--------------------------------------------|*/
    /*|              CONSTANTS                     |*/
    /*|--------------------------------------------|*/
    string public constant VERSION = "0.0";
    /// @notice The native address to represent native token eg: ETH in mainnet
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    /// @notice The precision scale used in the contract to avoid loss of precision
    uint256 public constant PRECISION_SCALE = 10 ** 4;
    /// @notice The maximum fee that can be charged to the community
    uint256 public constant MAX_FEE = 10 * PRECISION_SCALE;
    /// @notice Role to council safe members
    bytes32 public constant COUNCIL_MEMBER = keccak256("COUNCIL_MEMBER");

    /*|--------------------------------------------|*/
    /*|              STORAGE VARIABLES             |*/
    /*|  Must match RegistryCommunityV0_0 layout  |*/
    /*|--------------------------------------------|*/

    /// @notice The amount of tokens required to register a member
    uint256 public registerStakeAmount;
    /// @notice The fee charged to the community for each registration
    uint256 public communityFee;
    /// @notice The nonce used to create new strategy clones
    uint256 public cloneNonce;
    /// @notice The profileId of the community in the Allo Registry
    bytes32 public profileId;
    /// @notice Enable or disable the kick feature
    bool public isKickEnabled;
    /// @notice The address that receives the community fee
    address public feeReceiver;
    /// @notice The address of the registry factory
    address public registryFactory;
    /// @notice The address of the collateral vault template
    address public collateralVaultTemplate;
    /// @notice The address of the strategy template
    address public strategyTemplate;
    /// @notice The address of the pending council safe owner
    address payable public pendingCouncilSafe;
    /// @notice The Registry Allo contract
    IRegistry public registry;
    /// @notice The token used to stake in the community
    IERC20 public gardenToken;
    /// @notice The council safe contract address
    ISafe public councilSafe;
    /// @notice The Allo contract address
    FAllo public allo;
    /// @notice The community name
    string public communityName;
    /// @notice The covenant IPFS hash of community
    string public covenantIpfsHash;
    /// @notice List of enabled/disabled strategies
    mapping(address strategy => bool isEnabled) public enabledStrategies;
    /// @notice Power points for each member in each strategy
    mapping(address strategy => mapping(address member => uint256 power)) public memberPowerInStrategy;
    /// @notice Member information as the staked amount and if is registered in the community
    mapping(address member => Member) public addressToMemberInfo;
    /// @notice List of strategies for each member are activated
    mapping(address member => address[] strategiesAddresses) public strategiesByMember;
    /// @notice Mapping to check if a member is activated in a strategy
    mapping(address member => mapping(address strategy => bool isActivated)) public memberActivatedInStrategies;
    /// @notice List of initial members to be added as pool managers in the Allo Pool
    address[] internal initialMembers;
    /// @notice The total number of members in the community
    uint256 public totalMembers;

    uint256[49] private __gap;
}
