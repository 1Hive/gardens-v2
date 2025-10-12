// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityStorage} from "../CommunityStorage.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRegistry, Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {CVStrategyInitializeParamsV0_2} from "../../CVStrategy/ICVStrategy.sol";
import {CVStrategyV0_0} from "../../CVStrategy/CVStrategyV0_0.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ISafe} from "../../interfaces/ISafe.sol";
import {FAllo} from "../../interfaces/FAllo.sol";

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

/**
 * @title CommunityPoolFacet
 * @notice Facet containing pool creation and initialization functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunityV0_0
 *      CRITICAL: Storage layout is inherited from CommunityStorage base contract
 */
contract CommunityPoolFacet is CommunityStorage {
    /*|--------------------------------------------|*/
    /*|              CONSTANTS                     |*/
    /*|--------------------------------------------|*/
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    bytes32 public constant COUNCIL_MEMBER = keccak256("COUNCIL_MEMBER");
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

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
    /*|              MODIFIERS/HELPERS             |*/
    /*|--------------------------------------------|*/
    function setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        _roleAdmin[role] = adminRole;
    }

    function grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
    }

    function owner() internal view returns (address) {
        return _owner;
    }

    function proxyOwner() internal view returns (address) {
        return owner();
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function initialize(
        RegistryCommunityInitializeParamsV0_0 memory params,
        address _strategyTemplate,
        address _collateralVaultTemplate,
        address _owner
    ) public {
        // Note: Initializer checks would be in main contract
        _owner = _owner; // Set owner through ProxyOwnableUpgrader parent

        setRoleAdmin(COUNCIL_MEMBER, DEFAULT_ADMIN_ROLE);

        allo = FAllo(params._allo);
        gardenToken = params._gardenToken;
        if (params._registerStakeAmount == 0) {
            revert ValueCannotBeZero();
        }
        registerStakeAmount = params._registerStakeAmount;
        communityFee = params._communityFee;
        isKickEnabled = params._isKickEnabled;
        communityName = params._communityName;
        covenantIpfsHash = params.covenantIpfsHash;

        registryFactory = params._registryFactory;
        feeReceiver = params._feeReceiver;
        councilSafe = ISafe(params._councilSafe);
        totalMembers = 0;

        grantRole(COUNCIL_MEMBER, params._councilSafe);

        registry = IRegistry(allo.getRegistry());

        address[] memory pool_initialMembers;
        // Support EOA as council safe
        if (address(councilSafe).code.length == 0) {
            pool_initialMembers = new address[](3);
            pool_initialMembers[0] = msg.sender;
        } else {
            address[] memory owners = councilSafe.getOwners();
            pool_initialMembers = new address[](owners.length + 2);
            for (uint256 i = 0; i < owners.length; i++) {
                pool_initialMembers[i] = owners[i];
            }
        }

        pool_initialMembers[pool_initialMembers.length - 1] = address(councilSafe);
        pool_initialMembers[pool_initialMembers.length - 2] = address(this);

        profileId =
            registry.createProfile(params._nonce, communityName, params._metadata, address(this), pool_initialMembers);

        initialMembers = pool_initialMembers;

        strategyTemplate = _strategyTemplate;
        collateralVaultTemplate = _collateralVaultTemplate;

        emit RegistryInitialized(profileId, communityName, params._metadata);
    }

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
                grantRole(allowlistRole, _params.initialAllowlist[i]);
            }
        }

        // Grant the strategy to grant for strategy specific allowlist
        setRoleAdmin(
            keccak256(abi.encodePacked("ALLOWLIST", poolId)), keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId))
        );
        grantRole(keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId)), strategy);
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
