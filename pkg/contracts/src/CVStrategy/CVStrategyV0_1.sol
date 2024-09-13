// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "./CVStrategyV0_0.sol";

library StrategyStruct2 {
    struct InitializeParams {
        StrategyStruct.CVParams cvParams;
        StrategyStruct.ProposalType proposalType;
        StrategyStruct.PointSystem pointSystem;
        StrategyStruct.PointSystemConfig pointConfig;
        StrategyStruct.ArbitrableConfig arbitrableConfig;
        address registryCommunity;
        address sybilScorer;
        address[] initialAllowlist;
    }
}

/// @custom:oz-upgrades-from CVStrategyV0_1
contract CVStrategyV0_1 is CVStrategyV0_0 {
    event AllowlistMembersRemoved(uint256 poolId, address[] members);
    event AllowlistMembersAdded(uint256 poolId, address[] members);

    event InitializedCV2(uint256 poolId, StrategyStruct2.InitializeParams data);

    function initialize(uint256 _poolId, bytes memory _data) external override onlyAllo {
        __BaseStrategy_init(_poolId);

        collateralVault = ICollateralVault(Clone.createClone(collateralVaultTemplate, cloneNonce++));
        collateralVault.initialize();

        StrategyStruct2.InitializeParams memory ip = abi.decode(_data, (StrategyStruct2.InitializeParams));

        if (ip.registryCommunity == address(0)) {
            revert RegistryCannotBeZero();
        }
        //Set councilsafe to whitelist admin
        registryCommunity = RegistryCommunityV0_1(ip.registryCommunity);

        proposalType = ip.proposalType;
        pointSystem = ip.pointSystem;
        pointConfig = ip.pointConfig;
        sybilScorer = ISybilScorer(ip.sybilScorer);

        _setPoolParams(ip.arbitrableConfig, ip.cvParams, new address[](0), new address[](0));

        emit InitializedCV2(_poolId, ip);
    }

    function _setPoolParams(
        StrategyStruct.ArbitrableConfig memory _arbitrableConfig,
        StrategyStruct.CVParams memory _cvParams,
        address[] memory membersToAdd,
        address[] memory membersToRemove
    ) internal virtual {
        super._setPoolParams(_arbitrableConfig, _cvParams);
        _addToAllowList(membersToAdd);
        _removeFromAllowList(membersToRemove);
    }

    function setPoolParams(
        StrategyStruct.ArbitrableConfig memory _arbitrableConfig,
        StrategyStruct.CVParams memory _cvParams,
        address[] memory membersToAdd,
        address[] memory membersToRemove
    ) external virtual {
        onlyCouncilSafe();
        _setPoolParams(_arbitrableConfig, _cvParams, membersToAdd, membersToRemove);
    }

    function _canExecuteAction(address _user) internal view override returns (bool) {
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

    function addToAllowList(address[] memory members) public {
        onlyCouncilSafe();
        _addToAllowList(members);
    }

    function _addToAllowList(address[] memory members) internal {
        bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));

        if (registryCommunity.hasRole(allowlistRole, address(0))) {
            registryCommunity.revokeRole(allowlistRole, address(0));
        }
        for (uint256 i = 0; i < members.length; i++) {
            if (!registryCommunity.hasRole(allowlistRole, members[i])) {
                registryCommunity.grantRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i]);
            }
        }

        emit AllowlistMembersAdded(poolId, members);
    }

    function removeFromAllowList(address[] memory members) external {
        onlyCouncilSafe();
        _removeFromAllowList(members);
    }

    function _removeFromAllowList(address[] memory members) internal {
        for (uint256 i = 0; i < members.length; i++) {
            if (registryCommunity.hasRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i])) {
                registryCommunity.revokeRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i]);
            }
        }

        emit AllowlistMembersRemoved(poolId, members);
    }
}
