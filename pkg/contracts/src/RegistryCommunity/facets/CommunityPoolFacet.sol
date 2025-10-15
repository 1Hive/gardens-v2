// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {AccessControlUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";

import {IRegistry, Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {CVStrategyInitializeParamsV0_2} from "../../CVStrategy/ICVStrategy.sol";
import {CVStrategyV0_0} from "../../CVStrategy/CVStrategyV0_0.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ProxyOwnableUpgrader} from "../../ProxyOwnableUpgrader.sol";
import {ISafe} from "../../interfaces/ISafe.sol";
import {FAllo} from "../../interfaces/FAllo.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";

/// @notice Initialize parameters for the contract
struct RegistryCommunityInitializeParamsV0_0 {
    address _allo;
    IERC20 _gardenToken;
    uint256 _registerStakeAmount;
    uint256 _communityFee;
    uint256 _nonce;
    address _registryFactory;
    address _feeReceiver;
    Metadata _metadata;
    address payable _councilSafe;
    string _communityName;
    bool _isKickEnabled;
    string covenantIpfsHash;
}

struct Member {
    address member;
    uint256 stakedAmount;
    bool isRegistered;
}

/**
 * @title CommunityPoolFacet
 * @notice Facet containing pool creation and initialization functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunityV0_0
 *      CRITICAL: Must inherit from same base contracts as main contract for storage alignment
 */
contract CommunityPoolFacet is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
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
    event RegistryInitialized(bytes32 _profileId, string _communityName, Metadata _metadata);
    event PoolCreated(uint256 _poolId, address _strategy, address _community, address _token, Metadata _metadata);

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error ValueCannotBeZero();
    error AllowlistTooBig(uint256 size);

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function createPool(address _token, CVStrategyInitializeParamsV0_2 memory _params, Metadata memory _metadata)
        public
        returns (uint256 poolId, address strategy)
    {
        address strategyProxy = address(
            new ERC1967Proxy(
                address(strategyTemplate),
                abi.encodeWithSelector(
                    CVStrategyV0_0.init.selector, address(allo), collateralVaultTemplate, proxyOwner()
                )
            )
        );
        (poolId, strategy) = createPool(strategyProxy, _token, _params, _metadata);

        if (address(_params.sybilScorer) == address(0)) {
            if (_params.initialAllowlist.length > 10000) {
                revert AllowlistTooBig(_params.initialAllowlist.length);
            }
            bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
            for (uint256 i = 0; i < _params.initialAllowlist.length; i++) {
                _grantRole(allowlistRole, _params.initialAllowlist[i]);
            }
        }

        // Set up role admin hierarchy and grant strategy the admin role
        _setRoleAdmin(
            keccak256(abi.encodePacked("ALLOWLIST", poolId)),
            keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId))
        );
        _grantRole(keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId)), strategy);
    }

    function createPool(
        address _strategy,
        address _token,
        CVStrategyInitializeParamsV0_2 memory _params,
        Metadata memory _metadata
    ) public returns (uint256 poolId, address strategy) {
        address token = NATIVE;
        if (_token != address(0)) {
            token = _token;
        }
        strategy = _strategy;

        poolId = allo.createPoolWithCustomStrategy(
            profileId, strategy, abi.encode(_params), token, 0, _metadata, initialMembers
        );

        emit PoolCreated(poolId, strategy, address(this), _token, _metadata);
    }
}
