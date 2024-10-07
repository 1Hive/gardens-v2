// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "./ICVStrategy.sol";
import {ICollateralVault} from "../CollateralVault.sol";
import {ISybilScorer} from "../PassportScorer.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IStrategy.sol";

library CVStrategyStorage {
    bytes32 internal constant STORAGE_SLOT = 0x0; // Migrating from UUPS to Diamond so exisitng storage already at slot 0

    struct Layout {
        // BaseStrategy
        IAllo allo;
        bytes32 strategyId;
        bool poolActive;
        uint256 poolId;
        uint256 poolAmount;
        // CVStrategy
        address collateralVaultTemplate;
        // uint256 variables packed together
        uint256 surpressStateMutabilityWarning; // used to suppress Solidity warnings
        uint256 cloneNonce;
        uint64 disputeCount;
        uint256 proposalCounter;
        uint256 currentArbitrableConfigVersion;
        uint256 totalStaked;
        uint256 totalPointsActivated;
        CVParams cvParams;
        // Enum for handling proposal types
        ProposalType proposalType;
        // Struct variables for complex data structures
        PointSystem pointSystem;
        PointSystemConfig pointConfig;
        // Contract reference
        address registryCommunity;
        ICollateralVault collateralVault;
        ISybilScorer sybilScorer;
        // Mappings to handle relationships and staking details
        mapping(uint256 => Proposal) proposals; // Mapping of proposal IDs to Proposal structures
        mapping(address => uint256) totalVoterStakePct; // voter -> total staked points
        mapping(address => uint256[]) voterStakedProposals; // voter -> proposal ids arrays
        mapping(uint256 => uint256) disputeIdToProposalId;
        mapping(uint256 => ArbitrableConfig) arbitrableConfigs;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
