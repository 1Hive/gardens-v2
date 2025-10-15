// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {AccessControlUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";

import {ProxyOwnableUpgrader} from "../../ProxyOwnableUpgrader.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {ISafe} from "../../interfaces/ISafe.sol";
import {FAllo} from "../../interfaces/FAllo.sol";
import {CVStrategyV0_0} from "../../CVStrategy/CVStrategyV0_0.sol";
import {ISybilScorer} from "../../ISybilScorer.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";

struct Member {
    address member;
    uint256 stakedAmount;
    bool isRegistered;
}

/**
 * @title CommunityStrategyFacet
 * @notice Facet containing strategy management functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunityV0_0
 *      CRITICAL: Must inherit from same base contracts as main contract for storage alignment
 */
contract CommunityStrategyFacet is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
    using ERC165Checker for address;
    using SafeERC20 for IERC20;
    using Clone for address;

    /*|--------------------------------------------|*/
    /*|              CONSTANTS                     |*/
    /*|--------------------------------------------|*/
    string public constant VERSION = "0.0";
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 public constant PRECISION_SCALE = 10 ** 4;
    uint256 public constant MAX_FEE = 10 * PRECISION_SCALE;
    bytes32 public constant COUNCIL_MEMBER = keccak256("COUNCIL_MEMBER");

    /*|--------------------------------------------|*/
    /*|              STORAGE VARIABLES             |*/
    /*|  Must match RegistryCommunityV0_0 layout  |*/
    /*|--------------------------------------------|*/
    uint256 public registerStakeAmount;
    uint256 public communityFee;
    uint256 public cloneNonce;
    bytes32 public profileId;
    bool public isKickEnabled;
    address public feeReceiver;
    address public registryFactory;
    address public collateralVaultTemplate;
    address public strategyTemplate;
    address payable public pendingCouncilSafe;
    IRegistry public registry;
    IERC20 public gardenToken;
    ISafe public councilSafe;
    FAllo public allo;
    string public communityName;
    string public covenantIpfsHash;
    mapping(address strategy => bool isEnabled) public enabledStrategies;
    mapping(address strategy => mapping(address member => uint256 power)) public memberPowerInStrategy;
    mapping(address member => Member) public addressToMemberInfo;
    mapping(address member => address[] strategiesAddresses) public strategiesByMember;
    mapping(address member => mapping(address strategy => bool isActivated)) public memberActivatedInStrategies;
    address[] internal initialMembers;
    uint256 public totalMembers;

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event StrategyAdded(address _strategy);
    event StrategyRemoved(address _strategy);
    event PoolRejected(address _strategy);

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error UserNotInCouncil(address _user);
    error StrategyExists();

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function onlyCouncilSafe() internal view {
        if (!hasRole(COUNCIL_MEMBER, msg.sender)) {
            revert UserNotInCouncil(msg.sender);
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function addStrategyByPoolId(uint256 poolId) public {
        onlyCouncilSafe();
        address strategy = address(allo.getPool(poolId).strategy);
        _addStrategy(strategy);
    }

    function addStrategy(address _newStrategy) public {
        onlyCouncilSafe();
        _addStrategy(_newStrategy);
    }

    function removeStrategyByPoolId(uint256 poolId) public {
        onlyCouncilSafe();
        address strategy = address(allo.getPool(poolId).strategy);
        _removeStrategy(strategy);
    }

    function removeStrategy(address _strategy) public {
        onlyCouncilSafe();
        _removeStrategy(_strategy);
    }

    function rejectPool(address _strategy) public {
        onlyCouncilSafe();
        if (enabledStrategies[_strategy]) {
            _removeStrategy(_strategy);
        }
        emit PoolRejected(_strategy);
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function _addStrategy(address _newStrategy) internal {
        if (enabledStrategies[_newStrategy]) {
            revert StrategyExists();
        }
        enabledStrategies[_newStrategy] = true;
        ISybilScorer sybilScorer = CVStrategyV0_0(payable(_newStrategy)).sybilScorer();
        if (address(sybilScorer) != address(0)) {
            sybilScorer.activateStrategy(_newStrategy);
        }
        emit StrategyAdded(_newStrategy);
    }

    function _removeStrategy(address _strategy) internal {
        enabledStrategies[_strategy] = false;
        emit StrategyRemoved(_strategy);
    }
}
