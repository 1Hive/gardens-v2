// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyInitializeParams, CVParams} from "./ICVStrategy.sol";
import {IArbitrator} from "../interfaces/IArbitrator.sol";

interface ICVStrategyBase {
    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/

    error UserCannotBeZero(); // 0xd1f28288
    error UserNotInRegistry(); //0x6a5cfb6d
    error UserIsInactive(); // 0x5fccb67f
    error PoolIsEmpty(); // 0xed4421ad
    error NotImplemented(); //0xd6234725
    error TokenCannotBeZero(); //0x596a094c
    error TokenNotAllowed(); // 0xa29c4986
    error AmountOverMaxRatio(); // 0x3bf5ca14
    error PoolIdCannotBeZero(); //0x4e791786
    error AddressCannotBeZero(); //0xe622e040
    error RegistryCannotBeZero(); // 0x5df4b1ef
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result); // 0x3bbc7142
    error MaxPointsReached(); // 0x8402b474
    error CantIncreaseFixedSystem(); // 0x573c3e93
    error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance); // 0xd64182fe

    error ProposalDataIsEmpty(); //0xc5f7c4c0
    error ProposalIdCannotBeZero(); //0xf881a10d
    error ProposalNotActive(uint256 _proposalId); // 0x44980d8f
    error ProposalNotInList(uint256 _proposalId); // 0xc1d17bef
    error ProposalSupportDuplicated(uint256 _proposalId, uint256 index); //0xadebb154
    error ConvictionUnderMinimumThreshold(); // 0xcce79308
    error OnlyCommunityAllowed(); // 0xaf0916a2
    error PoolAmountNotEnough(uint256 _proposalId, uint256 _requestedAmount, uint256 _poolAmount); //0x5863b0b6
    error OnlyCouncilSafe();
    error UserCannotExecuteAction();
    error InsufficientCollateral(uint256 sentAmount, uint256 requiredAmount);
    error OnlyArbitrator();
    error ProposalNotDisputed(uint256 _proposalId);
    error ArbitratorCannotBeZero();
    error OnlySubmitter(address submitter, address sender);
    // Goss: Support Collateral Zero
    // error CollateralVaultCannotBeZero();
    error DefaultRulingNotSet();
    error DisputeCooldownNotPassed(uint256 _proposalId, uint256 _remainingSec);

    /*|--------------------------------------------|*/
    /*|              CUSTOM EVENTS                 |*/
    /*|--------------------------------------------|*/

    event InitializedCV(uint256 poolId, CVStrategyInitializeParams data);
    event Distributed(uint256 proposalId, address beneficiary, uint256 amount);
    event ProposalCreated(uint256 poolId, uint256 proposalId);
    event PoolAmountIncreased(uint256 amount);
    event PointsDeactivated(address member);
    event PowerIncreased(address member, uint256 tokensStaked, uint256 pointsToIncrease);
    event PowerDecreased(address member, uint256 tokensUnStaked, uint256 pointsToDecrease);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );
    event CVParamsUpdated(CVParams cvParams);
    event RegistryUpdated(address registryCommunity);
    event MinThresholdPointsUpdated(uint256 before, uint256 minThresholdPoints);
    event ProposalDisputed(
        IArbitrator arbitrator,
        uint256 proposalId,
        uint256 disputeId,
        address challenger,
        string context,
        uint256 timestamp
    );
    event TribunaSafeRegistered(address strategy, address arbitrator, address tribunalSafe);
    event ProposalCancelled(uint256 proposalId);
    event ArbitrableConfigUpdated(
        uint256 currentArbitrableConfigVersion,
        IArbitrator arbitrator,
        address tribunalSafe,
        uint256 submitterCollateralAmount,
        uint256 challengerCollateralAmount,
        uint256 defaultRuling,
        uint256 defaultRulingTimeout
    );
}
