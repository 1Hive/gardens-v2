// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {
    CVStrategyV0_0,
    CVParams,
    ProposalType,
    PointSystem,
    PointSystemConfig,
    ArbitrableConfig,
    Proposal,
    ProposalStatus,
    ProposalSupport,
    CreateProposal,
    CVStrategyInitializeParamsV0_0
} from "./CVStrategyV0_0.sol";

import {ISybilScorer, PassportData} from "../ISybilScorer.sol";
import {RegistryCommunityV0_1} from "../RegistryCommunity/RegistryCommunityV0_1.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";
import {ICollateralVault} from "../interfaces/ICollateralVault.sol";
import {IArbitrator} from "../interfaces/IArbitrator.sol";

/*|--------------------------------------------|*/
/*|              STRUCTS/ENUMS                 |*/
/*|--------------------------------------------|*/

struct CVStrategyInitializeParamsV0_1 {
    CVParams cvParams;
    ProposalType proposalType;
    PointSystem pointSystem;
    PointSystemConfig pointConfig;
    ArbitrableConfig arbitrableConfig;
    address registryCommunity;
    address sybilScorer;
    address[] initialAllowlist;
}

/// @custom:oz-upgrades-from CVStrategyV0_0
contract CVStrategyV0_1 is CVStrategyV0_0 {
    /*|--------------------------------------------|*/
    /*|                 V0_1 EVENTS                |*/
    /*|--------------------------------------------|*/
    event AllowlistMembersRemoved(uint256 poolId, address[] members);
    event AllowlistMembersAdded(uint256 poolId, address[] members);
    event InitializedCV2(uint256 poolId, CVStrategyInitializeParamsV0_1 data);

    /*|--------------------------------------------|*/
    /*|              V0_1 ERRORS                   |*/
    /*|--------------------------------------------|*/
    error ProposalInvalidForAllocation(uint256 _proposalId, ProposalStatus _proposalStatus);

    /*|--------------------------------------------|*/
    /*|                 V0_1 MODIFIERS             |*/
    /*|--------------------------------------------|*/
    function checkProposalAllocationValidity(uint256 _proposalId) internal view virtual {
        Proposal storage p = proposals[_proposalId];
        if (
            p.proposalStatus == ProposalStatus.Inactive || p.proposalStatus == ProposalStatus.Cancelled
                || p.proposalStatus == ProposalStatus.Executed || p.proposalStatus == ProposalStatus.Rejected
        ) {
            revert ProposalInvalidForAllocation(_proposalId, p.proposalStatus);
        }
    }

    function getRegistryCommunityV0_1() public view returns (RegistryCommunityV0_1) {
        return RegistryCommunityV0_1(registryCommunity);
    }

    function initialize(uint256 _poolId, bytes memory _data) external override onlyAllo {
        __BaseStrategy_init(_poolId);

        collateralVault = ICollateralVault(Clone.createClone(collateralVaultTemplate, cloneNonce++));
        collateralVault.initialize();

        CVStrategyInitializeParamsV0_1 memory ip = abi.decode(_data, (CVStrategyInitializeParamsV0_1));

        if (ip.registryCommunity == address(0)) {
            revert RegistryCannotBeZero();
        }
        //Set councilsafe to whitelist admin
        registryCommunity = ip.registryCommunity;

        proposalType = ip.proposalType;
        pointSystem = ip.pointSystem;
        pointConfig = ip.pointConfig;
        sybilScorer = ISybilScorer(ip.sybilScorer);
        _setPoolParams(ip.arbitrableConfig, ip.cvParams, new address[](0), new address[](0));
        emit InitializedCV2(_poolId, ip);
    }

    function _setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        address[] memory membersToAdd,
        address[] memory membersToRemove
    ) internal virtual {
        super._setPoolParams(_arbitrableConfig, _cvParams);
        _addToAllowList(membersToAdd);
        _removeFromAllowList(membersToRemove);
    }

    function setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        address[] memory membersToAdd,
        address[] memory membersToRemove
    ) external virtual {
        onlyCouncilSafe();
        _setPoolParams(_arbitrableConfig, _cvParams, membersToAdd, membersToRemove);
    }

    function _beforeAllocate(bytes memory _data,  address /*_sender*/) internal virtual override {
        ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        for (uint256 i = 0; i < pv.length; i++) {
            checkProposalAllocationValidity(pv[i].proposalId);
        }
    }

    function _canExecuteAction(address _user) internal view override returns (bool) {
        if (address(sybilScorer) == address(0)) {
            bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
            if (getRegistryCommunityV0_1().hasRole(allowlistRole, address(0))) {
                return true;
            } else {
                return getRegistryCommunityV0_1().hasRole(allowlistRole, _user);
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

        if (getRegistryCommunityV0_1().hasRole(allowlistRole, address(0))) {
            getRegistryCommunityV0_1().revokeRole(allowlistRole, address(0));
        }
        for (uint256 i = 0; i < members.length; i++) {
            if (!getRegistryCommunityV0_1().hasRole(allowlistRole, members[i])) {
                getRegistryCommunityV0_1().grantRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i]);
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
            if (getRegistryCommunityV0_1().hasRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i])) {
                getRegistryCommunityV0_1().revokeRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i]);
            }
        }

        emit AllowlistMembersRemoved(poolId, members);
    }
}
