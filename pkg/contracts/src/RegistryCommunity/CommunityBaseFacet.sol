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
import {IDiamondCut} from "../diamonds/interfaces/IDiamondCut.sol";
import {IPauseController} from "../interfaces/IPauseController.sol";
import {LibPauseStorage} from "../pausing/LibPauseStorage.sol";

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
 *      when called via delegatecall from RegistryCommunity.
 *
 *      Storage Layout MUST match RegistryCommunity exactly:
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
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error CommunityPaused(address controller);
    error CommunitySelectorPaused(bytes4 selector, address controller);

    /*|--------------------------------------------|*/
    /*|              STORAGE VARIABLES             |*/
    /*|  Must match RegistryCommunity layout  |*/
    /*|--------------------------------------------|*/

    /// @notice The amount of tokens required to register a member
    // slither-disable-next-line uninitialized-state
    uint256 public registerStakeAmount;
    /// @notice The fee charged to the community for each registration
    // slither-disable-next-line uninitialized-state
    uint256 public communityFee;
    /// @notice The nonce used to create new strategy clones
    uint256 public cloneNonce;
    /// @notice The profileId of the community in the Allo Registry
    // slither-disable-next-line uninitialized-state
    bytes32 public profileId;
    /// @notice Enable or disable the kick feature
    // slither-disable-next-line uninitialized-state
    bool public isKickEnabled;
    /// @notice The address that receives the community fee
    // slither-disable-next-line uninitialized-state
    address public feeReceiver;
    /// @notice The address of the registry factory
    // slither-disable-next-line uninitialized-state
    address public registryFactory;
    /// @notice The address of the collateral vault template
    // slither-disable-next-line uninitialized-state
    address public collateralVaultTemplate;
    /// @notice The address of the strategy template
    // slither-disable-next-line uninitialized-state
    address public strategyTemplate;
    /// @notice The address of the pending council safe owner
    address payable public pendingCouncilSafe;
    /// @notice The Registry Allo contract
    IRegistry public registry;
    /// @notice The token used to stake in the community
    // slither-disable-next-line uninitialized-state
    IERC20 public gardenToken;
    /// @notice The council safe contract address
    ISafe public councilSafe;
    /// @notice The Allo contract address
    // slither-disable-next-line uninitialized-state
    FAllo public allo;
    /// @notice The community name
    string public communityName;
    /// @notice The covenant IPFS hash of community
    string public covenantIpfsHash;
    /// @notice List of enabled/disabled strategies
    // slither-disable-next-line uninitialized-state
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
    // slither-disable-next-line uninitialized-state
    address[] internal initialMembers;
    /// @notice The total number of members in the community
    // slither-disable-next-line uninitialized-state
    uint256 public totalMembers;

    /// @notice Facet configuration for CVStrategy instances
    IDiamondCut.FacetCut[] internal strategyFacetCuts;
    address internal strategyInit;
    bytes internal strategyInitCalldata;

    uint256[46] private __gap;

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
            revert CommunityPaused(controller);
        }
    }

    function _enforceSelectorNotPaused(bytes4 selector) internal view {
        if (_isPauseSelector(selector)) {
            return;
        }
        address controller = LibPauseStorage.layout().pauseController;
        if (controller != address(0) && IPauseController(controller).isPaused(address(this), selector)) {
            revert CommunitySelectorPaused(selector, controller);
        }
    }

    function _isPauseSelector(bytes4 selector) internal pure returns (bool) {
        return selector == bytes4(keccak256("setPauseController(address)"))
            || selector == bytes4(keccak256("pause(uint256)"))
            || selector == bytes4(keccak256("pause(bytes4,uint256)"))
            || selector == bytes4(keccak256("unpause()"))
            || selector == bytes4(keccak256("unpause(bytes4)"))
            || selector == bytes4(keccak256("pauseController()"))
            || selector == bytes4(keccak256("isPaused()"))
            || selector == bytes4(keccak256("isPaused(bytes4)"))
            || selector == bytes4(keccak256("pausedUntil()"))
            || selector == bytes4(keccak256("pausedSelectorUntil(bytes4)"));
    }
}
