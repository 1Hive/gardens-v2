// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {
    RegistryCommunityV0_0,
    Metadata,
    ERC1967Proxy,
    RegistryCommunityInitializeParamsV0_0
} from "./RegistryCommunityV0_0.sol";
import {
    CVStrategyV0_0,
    PointSystemConfig,
    ArbitrableConfig,
    ProposalType,
    CreateProposal
} from "../CVStrategy/CVStrategyV0_0.sol";

import {CVStrategyV0_1, CVStrategyInitializeParamsV0_1} from "../CVStrategy/CVStrategyV0_1.sol";

/// @custom:oz-upgrades-from RegistryCommunityV0_0
contract RegistryCommunityV0_1 is RegistryCommunityV0_0 {
    function createPool(address _token, CVStrategyInitializeParamsV0_1 memory _params, Metadata memory _metadata)
        public
        virtual
        returns (uint256 poolId, address strategy)
    {
        address strategyProxy = address(
            new ERC1967Proxy(
                address(strategyTemplate),
                abi.encodeWithSelector(CVStrategyV0_0.init.selector, address(allo), collateralVaultTemplate, owner())
            )
        );

        (poolId, strategy) = createPool(strategyProxy, _token, _params, _metadata);

        if (address(_params.sybilScorer) == address(0)) {
            if (_params.initialAllowlist.length > 1000) {
                revert("Too many initial allowlist members, max is 1000");
            }
            bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
            for (uint256 i = 0; i < _params.initialAllowlist.length; i++) {
                _grantRole(allowlistRole, _params.initialAllowlist[i]);
            }
        }

        // Grant the strategy to grant for startegy specific allowlist
        _setRoleAdmin(
            keccak256(abi.encodePacked("ALLOWLIST", poolId)), keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId))
        );
        _grantRole(keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId)), strategy);
    }

    function createPool(
        address _strategy,
        address _token,
        CVStrategyInitializeParamsV0_1 memory _params,
        Metadata memory _metadata
    ) public virtual returns (uint256 poolId, address strategy) {
        address token = NATIVE;
        if (_token != address(0)) {
            token = _token;
        }
        strategy = _strategy;

        address[] memory _pool_managers = initialMembers;

        poolId = allo.createPoolWithCustomStrategy(
            profileId, strategy, abi.encode(_params), token, 0, _metadata, _pool_managers
        );

        emit PoolCreated(poolId, strategy, address(this), _token, _metadata);
    }
}
