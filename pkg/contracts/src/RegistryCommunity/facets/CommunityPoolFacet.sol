// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet} from "../CommunityBaseFacet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRegistry, Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {CVStrategyInitializeParamsV0_2} from "../../CVStrategy/ICVStrategy.sol";
import {CVStrategy} from "../../CVStrategy/CVStrategy.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IDiamondCut} from "../../diamonds/interfaces/IDiamondCut.sol";

/// @notice Initialize parameters for the contract
struct RegistryCommunityInitializeParams {
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
 * @dev This facet is called via delegatecall from RegistryCommunity
 *      CRITICAL: Inherits storage layout from CommunityBaseFacet
 */
contract CommunityPoolFacet is CommunityBaseFacet {
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
                abi.encodeWithSelector(CVStrategy.init.selector, address(allo), collateralVaultTemplate, address(this))
            )
        );
        _configureStrategyFacets(strategyProxy);
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
            keccak256(abi.encodePacked("ALLOWLIST", poolId)), keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId))
        );
        _grantRole(keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId)), strategy);
    }

    function _configureStrategyFacets(address strategyProxy) internal {
        if (strategyFacetCuts.length > 0 || strategyInit != address(0)) {
            IDiamondCut(strategyProxy).diamondCut(strategyFacetCuts, strategyInit, strategyInitCalldata);
        }
        CVStrategy(payable(strategyProxy)).transferOwnership(proxyOwner());
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
