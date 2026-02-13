// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IArbitrator} from "../interfaces/IArbitrator.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";

/*|--------------------------------------------|*/
/*|              STRUCTS/ENUMS                 |*/
/*|--------------------------------------------|*/

// interface IPointStrategy {
//     function deactivatePoints(address _member) external;

//     function increasePower(address _member, uint256 _amountToStake) external returns (uint256);

//     function decreasePower(address _member, uint256 _amountToUntake) external returns (uint256);

//     function getPointSystem() external returns (PointSystem);
// }

enum ProposalType {
    Signaling,
    Funding,
    Streaming
}

enum PointSystem {
    Fixed,
    Capped,
    Unlimited,
    Quadratic
}

struct CreateProposal {
    // uint256 proposalId;
    uint256 poolId;
    address beneficiary;
    // ProposalType proposalType;
    uint256 amountRequested;
    address requestedToken;
    Metadata metadata;
}

enum ProposalStatus {
    Inactive, // Inactive
    Active, // A vote that has been reported to Agreements
    Paused, // A votee that is being challenged by Agreements
    Cancelled, // A vote that has been cancelled
    Executed, // A vote that has been executed
    Disputed, // A vote that has been disputed
    Rejected // A vote that has been rejected
}

struct ProposalDisputeInfo {
    uint256 disputeId;
    uint256 disputeTimestamp;
    address challenger;
}

struct Proposal {
    uint256 proposalId;
    uint256 requestedAmount;
    uint256 stakedAmount;
    uint256 convictionLast;
    address beneficiary;
    address submitter;
    address requestedToken;
    uint256 blockLast;
    ProposalStatus proposalStatus;
    mapping(address => uint256) voterStakedPoints; // voter staked points
    Metadata metadata;
    ProposalDisputeInfo disputeInfo;
    uint256 lastDisputeCompletion;
    uint256 arbitrableConfigVersion;
    uint256 creationTimestamp;
}

struct ProposalSupport {
    uint256 proposalId;
    int256 deltaSupport; // use int256 to allow negative values
}

struct PointSystemConfig {
    //Capped point system
    uint256 maxAmount;
}

struct ArbitrableConfig {
    IArbitrator arbitrator;
    address tribunalSafe;
    uint256 submitterCollateralAmount;
    uint256 challengerCollateralAmount;
    uint256 defaultRuling;
    uint256 defaultRulingTimeout;
}

struct CVParams {
    uint256 maxRatio;
    uint256 weight;
    uint256 decay;
    uint256 minThresholdPoints;
}

struct CVStrategyInitializeParamsV0_0 {
    CVParams cvParams;
    ProposalType proposalType;
    PointSystem pointSystem;
    PointSystemConfig pointConfig;
    ArbitrableConfig arbitrableConfig;
    address registryCommunity;
    address sybilScorer;
}

struct CVStrategyInitializeParamsV0_1 {
    CVParams cvParams;
    ProposalType proposalType;
    PointSystem pointSystem;
    PointSystemConfig pointConfig;
    ArbitrableConfig arbitrableConfig;
    address registryCommunity;
    address sybilScorer;
    uint256 sybilScorerThreshold;
    address[] initialAllowlist;
}

struct CVStrategyInitializeParamsV0_2 {
    CVParams cvParams;
    ProposalType proposalType;
    PointSystem pointSystem;
    PointSystemConfig pointConfig;
    ArbitrableConfig arbitrableConfig;
    address registryCommunity;
    address sybilScorer;
    uint256 sybilScorerThreshold;
    address[] initialAllowlist;
    address superfluidToken;
}

interface ICVStrategy {
    function setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        uint256 _sybilScoreThreshold,
        address[] memory _membersToAdd,
        address[] memory _membersToRemove,
        address _superfluidToken
    ) external;
}
