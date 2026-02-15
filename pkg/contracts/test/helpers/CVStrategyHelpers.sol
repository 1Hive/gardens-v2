// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ISybilScorer} from "../../src/ISybilScorer.sol";
import {RegistryCommunity} from "../../src/RegistryCommunity/RegistryCommunity.sol";
import {
    CVStrategy,
    Proposal,
    ProposalType,
    ProposalStatus,
    PointSystem,
    CreateProposal,
    CVParams,
    PointSystemConfig,
    ArbitrableConfig,
    CVStrategyInitializeParamsV0_3
} from "../../src/CVStrategy/CVStrategy.sol";
import {CVProposalFacet} from "../../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVStrategyBaseFacet} from "../../src/CVStrategy/CVStrategyBaseFacet.sol";
import {ICollateralVault} from "../../src/interfaces/ICollateralVault.sol";
import {IArbitrator} from "../../src/interfaces/IArbitrator.sol";
import {IVotingPowerRegistry} from "../../src/interfaces/IVotingPowerRegistry.sol";
import {LibDiamond} from "../../src/diamonds/libraries/LibDiamond.sol";
import {LibPauseStorage} from "../../src/pausing/LibPauseStorage.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

contract MockAlloWithPool {
    mapping(uint256 => address) public poolTokens;
    mapping(uint256 => mapping(address => bool)) public managers;

    function setPoolToken(uint256 poolId, address token) external {
        poolTokens[poolId] = token;
    }

    function getPool(uint256 poolId) external view returns (IAllo.Pool memory pool) {
        pool.token = poolTokens[poolId];
    }

    function setPoolManager(uint256 poolId, address manager, bool allowed) external {
        managers[poolId][manager] = allowed;
    }

    function isPoolManager(uint256 poolId, address account) external view returns (bool) {
        return managers[poolId][account];
    }
}

contract MockRegistryCommunity {
    mapping(address => bool) public members;
    mapping(bytes32 => mapping(address => bool)) public roles;
    address public councilSafe;
    bool public strategyEnabled = true;

    function setMember(address member, bool allowed) external {
        members[member] = allowed;
    }

    function setRole(bytes32 role, address account, bool allowed) external {
        roles[role][account] = allowed;
    }

    function setCouncilSafe(address councilSafe_) external {
        councilSafe = councilSafe_;
    }

    function setStrategyEnabled(bool enabled) external {
        strategyEnabled = enabled;
    }

    function isMember(address member) external view returns (bool) {
        return members[member];
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return roles[role][account];
    }

    function onlyStrategyEnabled(address) external view {
        require(strategyEnabled, "STRATEGY_DISABLED");
    }

    function getBasisStakedAmount() external pure returns (uint256) {
        return 1;
    }

    // IVotingPowerRegistry compatibility stubs
    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return members[member] ? 1 : 0;
    }

    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 0;
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }
}

contract MockSybilScorer is ISybilScorer {
    mapping(address => bool) public canExecute;
    address public lastStrategy;
    uint256 public lastThreshold;
    address public lastCouncilSafe;

    function setCanExecute(address user, bool allowed) external {
        canExecute[user] = allowed;
    }

    function canExecuteAction(address user, address) external view returns (bool) {
        return canExecute[user];
    }

    function modifyThreshold(address, uint256) external {}

    function addStrategy(address strategy, uint256 threshold, address councilSafe) external {
        lastStrategy = strategy;
        lastThreshold = threshold;
        lastCouncilSafe = councilSafe;
    }

    function activateStrategy(address) external {}
}

contract MockArbitrator is IArbitrator {
    address public lastSafe;

    function registerSafe(address safe) external {
        lastSafe = safe;
    }

    function createDispute(uint256, bytes calldata) external payable returns (uint256) {
        return 0;
    }

    function createDispute(uint256, bytes calldata, IERC20, uint256) external returns (uint256) {
        return 0;
    }

    function arbitrationCost(bytes calldata) external view returns (uint256) {
        return 0;
    }

    function arbitrationCost(bytes calldata, IERC20) external view returns (uint256) {
        return 0;
    }

    function currentRuling(uint256) external view returns (uint256, bool, bool) {
        return (0, false, false);
    }
}

contract MockCollateralVault is ICollateralVault {
    uint256 public lastProposalId;
    address public lastAccount;
    uint256 public lastAmount;

    function initialize() external {}

    function depositCollateral(uint256 proposalId, address account) external payable {
        lastProposalId = proposalId;
        lastAccount = account;
        lastAmount = msg.value;
    }

    function withdrawCollateral(uint256 proposalId, address account, uint256 amount) external {
        lastProposalId = proposalId;
        lastAccount = account;
        lastAmount = amount;
    }

    function withdrawCollateralFor(uint256 proposalId, address fromUser, address toUser, uint256 amount) external {
        lastProposalId = proposalId;
        lastAccount = toUser;
        lastAmount = amount;
        fromUser;
    }
}

contract CVProposalFacetHarness is CVProposalFacet {
    function setAllo(address allo_) external {
        allo = IAllo(allo_);
    }

    function setPoolId(uint256 poolId_) external {
        poolId = poolId_;
    }

    function setCollateralVaultTemplateRaw(address template) external {
        collateralVaultTemplate = template;
    }

    function setRegistryCommunity(address registryCommunity_) external {
        registryCommunity = RegistryCommunity(registryCommunity_);
    }

    function setVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setProposalType(ProposalType proposalType_) external {
        proposalType = proposalType_;
    }

    function setCollateralVault(address collateralVault_) external {
        collateralVault = ICollateralVault(collateralVault_);
    }

    function setArbitrableConfig(uint256 version, ArbitrableConfig memory config) external {
        currentArbitrableConfigVersion = version;
        arbitrableConfigs[version] = config;
    }

    function seedProposal(
        uint256 proposalId,
        address submitter,
        address beneficiary,
        address requestedToken,
        uint256 requestedAmount,
        ProposalStatus status,
        uint256 creationTimestamp,
        uint256 convictionLast
    ) external {
        Proposal storage p = proposals[proposalId];
        p.proposalId = proposalId;
        p.submitter = submitter;
        p.beneficiary = beneficiary;
        p.requestedToken = requestedToken;
        p.requestedAmount = requestedAmount;
        p.proposalStatus = status;
        p.blockLast = block.number;
        p.creationTimestamp = creationTimestamp;
        p.convictionLast = convictionLast;
        p.metadata = Metadata({protocol: 1, pointer: "meta"});
        p.arbitrableConfigVersion = currentArbitrableConfigVersion;
        if (proposalCounter < proposalId) {
            proposalCounter = proposalId;
        }
    }

    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus) {
        return proposals[proposalId].proposalStatus;
    }

    function getProposalRequestedAmount(uint256 proposalId) external view returns (uint256) {
        return proposals[proposalId].requestedAmount;
    }

    function getProposalBeneficiary(uint256 proposalId) external view returns (address) {
        return proposals[proposalId].beneficiary;
    }

    function getProposalMetadataPointer(uint256 proposalId) external view returns (string memory) {
        return proposals[proposalId].metadata.pointer;
    }
}

contract CVStrategyBaseFacetHarness is CVStrategyBaseFacet {
    function setAllo(address allo_) external {
        allo = IAllo(allo_);
    }

    function setPoolId(uint256 poolId_) external {
        poolId = poolId_;
    }

    function setRegistryCommunity(address registryCommunity_) external {
        registryCommunity = RegistryCommunity(registryCommunity_);
    }

    function setVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setSybilScorer(address sybilScorer_) external {
        sybilScorer = ISybilScorer(sybilScorer_);
    }

    function setPointSystem(PointSystem system) external {
        pointSystem = system;
    }

    function setCvParams(CVParams memory params) external {
        cvParams = params;
    }

    function setSuperfluidToken(address token) external {
        superfluidToken = ISuperToken(token);
    }

    function setProposal(uint256 proposalId, address submitter, uint256 blockLast, uint256 convictionLast) external {
        Proposal storage p = proposals[proposalId];
        p.proposalId = proposalId;
        p.submitter = submitter;
        p.blockLast = blockLast;
        p.convictionLast = convictionLast;
    }

    function setContractOwner(address owner_) external {
        LibDiamond.setContractOwner(owner_);
    }

    function setPauseController(address controller) external {
        LibPauseStorage.layout().pauseController = controller;
    }

    function exposedOnlyAllo() external onlyAllo {}

    function exposedOnlyInitialized() external onlyInitialized {}

    function exposedOnlyRegistryCommunity() external onlyRegistryCommunity {}

    function exposedCheckSenderIsMember(address sender) external {
        checkSenderIsMember(sender);
    }

    function exposedOnlyCouncilSafe() external {
        onlyCouncilSafe();
    }

    function exposedOnlyCouncilSafeOrMember() external {
        onlyCouncilSafeOrMember();
    }

    function exposedCanExecuteAction(address user) external view returns (bool) {
        return _canExecuteAction(user);
    }

    function exposedProposalExists(uint256 proposalId) external view returns (bool) {
        return proposalExists(proposalId);
    }

    function exposedCalculateAndSetConviction(uint256 proposalId, uint256 oldStaked) external {
        _calculateAndSetConviction(proposals[proposalId], oldStaked);
    }

    function exposedCheckBlockAndCalculateConviction(uint256 proposalId, uint256 oldStaked)
        external
        view
        returns (uint256 conviction, uint256 blockNumber)
    {
        return _checkBlockAndCalculateConviction(proposals[proposalId], oldStaked);
    }

    function exposedIsPauseSelector(bytes4 selector) external pure returns (bool) {
        return _isPauseSelector(selector);
    }

    function exposedEnforceNotPaused(bytes4 selector) external view {
        _enforceNotPaused(selector);
    }

    function exposedEnforceSelectorNotPaused(bytes4 selector) external view {
        _enforceSelectorNotPaused(selector);
    }

    function guardedWhenNotPaused() external whenNotPaused {}

    function guardedWhenSelectorNotPaused(bytes4 selector) external whenSelectorNotPaused(selector) {}

    function exposedGetPoolAmount() external view returns (uint256) {
        return getPoolAmount();
    }
}

contract CVStrategyHarness is CVStrategy {
    function setAllo(address allo_) external {
        allo = IAllo(allo_);
    }

    function setPoolId(uint256 poolId_) external {
        poolId = poolId_;
    }

    function setCollateralVaultTemplateRaw(address template) external {
        collateralVaultTemplate = template;
    }

    function setRegistryCommunity(address registryCommunity_) external {
        registryCommunity = RegistryCommunity(registryCommunity_);
    }

    function setVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setSybilScorer(address sybilScorer_) external {
        sybilScorer = ISybilScorer(sybilScorer_);
    }

    function setPointConfig(uint256 maxAmount) external {
        pointConfig = PointSystemConfig(maxAmount);
    }

    function setPointSystem(PointSystem system) external {
        pointSystem = system;
    }

    function setCvParams(CVParams memory params) external {
        cvParams = params;
    }

    function setSuperfluidToken(address token) external {
        superfluidToken = ISuperToken(token);
    }

    function setProposal(
        uint256 proposalId,
        address submitter,
        uint256 requestedAmount,
        ProposalStatus status,
        uint256 blockLast,
        uint256 convictionLast
    ) external {
        Proposal storage p = proposals[proposalId];
        p.proposalId = proposalId;
        p.submitter = submitter;
        p.requestedAmount = requestedAmount;
        p.proposalStatus = status;
        p.blockLast = blockLast;
        p.convictionLast = convictionLast;
        p.metadata = Metadata({protocol: 1, pointer: "meta"});
    }

    function setArbitrableConfig(uint256 version, ArbitrableConfig memory config) external {
        currentArbitrableConfigVersion = version;
        arbitrableConfigs[version] = config;
    }

    function setProposalVoterStake(uint256 proposalId, address voter, uint256 amount) external {
        proposals[proposalId].voterStakedPoints[voter] = amount;
    }

    function setProposalStakedAmount(uint256 proposalId, uint256 amount) external {
        proposals[proposalId].stakedAmount = amount;
    }

    function setTotalPointsActivated(uint256 amount) external {
        totalPointsActivated = amount;
    }

    function exposedCalculateAndSetConviction(uint256 proposalId, uint256 oldStaked) external {
        _calculateAndSetConviction(proposals[proposalId], oldStaked);
    }

    function exposedCheckBlockAndCalculateConviction(uint256 proposalId, uint256 oldStaked)
        external
        view
        returns (uint256 conviction, uint256 blockNumber)
    {
        return _checkBlockAndCalculateConviction(proposals[proposalId], oldStaked);
    }

    function exposedCheckSenderIsMember(address sender) external {
        checkSenderIsMember(sender);
    }

    function exposedOnlyRegistryCommunity() external view {
        onlyRegistryCommunity();
    }

    function exposedOnlyCouncilSafe() external view {
        onlyCouncilSafe();
    }

    function exposedOnlyCouncilSafeOrMember() external view {
        onlyCouncilSafeOrMember();
    }

    function exposedCanExecuteAction(address user) external view returns (bool) {
        return _canExecuteAction(user);
    }

    function exposedCheckProposalAllocationValidity(uint256 proposalId, int256 deltaSupport) external view {
        _checkProposalAllocationValidity(proposalId, deltaSupport);
    }

    function exposedProposalExists(uint256 proposalId) external view returns (bool) {
        return proposalExists(proposalId);
    }

    function exposedIsOverMaxRatio(uint256 requestedAmount) external view returns (bool) {
        return _isOverMaxRatio(requestedAmount);
    }

    function exposedApplyDelta(uint256 support, int256 delta) external pure returns (uint256) {
        return _applyDelta(support, delta);
    }

    function getProposalThreshold(uint256 proposalId) external view returns (uint256) {
        (,,,,,,,, uint256 threshold,,,) = this.getProposal(proposalId);
        return threshold;
    }
}

contract DummyFacet {
    function ping() external pure returns (uint256) {
        return 1;
    }
}
