// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {BaseStrategy, IAllo} from "allo-v2-contracts/strategies/BaseStrategy.sol";

import {RegistryCommunity, Metadata} from "./RegistryCommunity.sol";
import {ERC165, IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IArbitrator} from "./interfaces/IArbitrator.sol";
import {IArbitrable} from "./interfaces/IArbitrable.sol";
import {CollateralVault} from "./CollateralVault.sol";

import {console} from "forge-std/console.sol";

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IPointStrategy {
    function deactivatePoints(address _member) external;
    function increasePower(address _member, uint256 _amountToStake) external returns (uint256);
    function decreasePower(address _member, uint256 _amountToUntake) external returns (uint256);
    function getPointSystem() external returns (StrategyStruct.PointSystem);
}

library StrategyStruct {
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
        uint256 poolId;
        address beneficiary;
        uint256 amountRequested;
        address requestedToken;
        Metadata metadata;
    }

    enum ProposalStatus {
        Inactive,
        Active,
        Paused,
        Cancelled,
        Executed,
        Disputed,
        Blocked
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
        mapping(address => uint256) voterStakedPoints;
        Metadata metadata;
        uint256 disputeId;
        uint256 disputeTimestamp;
        address challenger;
    }

    struct ProposalSupport {
        uint256 proposalId;
        int256 deltaSupport;
    }

    struct PointSystemConfig {
        uint256 maxAmount;
    }

    struct ArbitrableConfig {
        IArbitrator arbitrator;
        CollateralVault collateralVault;
        uint256 collateralAmount;
        uint256 defaultRuling;
        uint256 defaultRulingTimeout;
    }

    struct InitializeParams {
        address registryCommunity;
        uint256 decay;
        uint256 maxRatio;
        uint256 weight;
        uint256 minThresholdPoints;
        ProposalType proposalType;
        PointSystem pointSystem;
        PointSystemConfig pointConfig;
        ArbitrableConfig arbitrableConfig;
    }
}

contract CVStrategy is BaseStrategy, IArbitrable, ReentrancyGuard, IPointStrategy, ERC165 {
    using Math for uint256;

    error UserCannotBeZero();
    error UserNotInRegistry();
    error UserIsInactive();
    error PoolIsEmpty();
    error NotImplemented();
    error TokenCannotBeZero();
    error TokenNotAllowed();
    error AmountOverMaxRatio();
    error PoolIdCannotBeZero();
    error AddressCannotBeZero();
    error RegistryCannotBeZero();
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result);
    error MaxPointsReached();
    error CantIncreaseFixedSystem();
    error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance);

    error ProposalDataIsEmpty();
    error ProposalIdCannotBeZero();
    error ProposalNotActive(uint256 _proposalId);
    error ProposalNotInList(uint256 _proposalId);
    error ProposalNotDisputed(uint256 _proposalId);
    error ProposalSupportDuplicated(uint256 _proposalId, uint256 index);
    error ConvictionUnderMinimumThreshold();
    error OnlyCommunityAllowed();
    error PoolAmountNotEnough(uint256 _proposalId, uint256 _requestedAmount, uint256 _poolAmount);
    error InsufficientCollateral(uint256 sentAmount, uint256 requiredAmount);
    error OnlyArbitrator();

    event InitializedCV(uint256 poolId, StrategyStruct.InitializeParams data);
    event Distributed(uint256 proposalId, address beneficiary, uint256 amount);
    event ProposalCreated(uint256 poolId, uint256 proposalId);
    event PoolAmountIncreased(uint256 amount);
    event PowerIncreased(address member, uint256 tokensStaked, uint256 pointsToIncrease);
    event PowerDecreased(address member, uint256 tokensUnStaked, uint256 pointsToDecrease);
    event SupportAdded(
        address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
    );
    event PointsDeactivated(address member);
    event DecayUpdated(uint256 decay);
    event MaxRatioUpdated(uint256 maxRatio);
    event WeightUpdated(uint256 weight);
    event RegistryUpdated(address registryCommunity);
    event MinThresholdPointsUpdated(uint256 before, uint256 minThresholdPoints);
    event ProposalDisputed(
        uint256 proposalId, uint256 disputeId, address challenger, uint256 arbitrationFee, string context
    );

    uint256 public constant D = 10000000;
    uint256 private constant TWO_128 = 0x100000000000000000000000000000000;
    uint256 private constant TWO_127 = 0x80000000000000000000000000000000;
    uint256 private constant TWO_64 = 0x10000000000000000;
    uint256 public constant MAX_STAKED_PROPOSALS = 10;
    uint256 public constant RULING_OPTIONS = 3;

    uint256 public decay;
    uint256 public maxRatio;
    uint256 public weight;
    uint256 public proposalCounter = 0;
    uint256 public totalStaked;
    uint256 public totalPointsActivated;
    uint256 public _minThresholdPoints = 0;
    uint256 internal surpressStateMutabilityWarning;

    StrategyStruct.ProposalType public proposalType;
    StrategyStruct.PointSystem public pointSystem;
    StrategyStruct.PointSystemConfig public pointConfig;
    StrategyStruct.ArbitrableConfig public arbitrableConfig;

    RegistryCommunity public registryCommunity;

    mapping(uint256 => StrategyStruct.Proposal) public proposals;
    mapping(address => uint256) public totalVoterStakePct;
    mapping(address => uint256[]) public voterStakedProposals;
    mapping(uint256 => uint256) public disputeIdToProposalId;

    constructor(address _allo) BaseStrategy(address(_allo), "CVStrategy") {}

    function initialize(uint256 _poolId, bytes memory _data) external {
        __BaseStrategy_init(_poolId);
        StrategyStruct.InitializeParams memory ip = abi.decode(_data, (StrategyStruct.InitializeParams));

        if (ip.registryCommunity == address(0)) {
            revert RegistryCannotBeZero();
        }

        registryCommunity = RegistryCommunity(ip.registryCommunity);
        decay = ip.decay;
        maxRatio = ip.maxRatio;
        weight = ip.weight;
        proposalType = ip.proposalType;
        pointSystem = ip.pointSystem;
        pointConfig = ip.pointConfig;
        _minThresholdPoints = ip.minThresholdPoints;
        arbitrableConfig = ip.arbitrableConfig;

        emit InitializedCV(_poolId, ip);
    }

    fallback() external payable {}

    receive() external payable {}

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IPointStrategy).interfaceId || super.supportsInterface(interfaceId);
    }

    function checkSenderIsMember(address _sender) private view {
        if (_sender == address(0)) {
            revert UserCannotBeZero();
        }
        if (address(registryCommunity) == address(0)) {
            revert RegistryCannotBeZero();
        }
        if (!registryCommunity.isMember(_sender)) {
            revert UserNotInRegistry();
        }
    }

    function onlyRegistryCommunity() private view {
        if (msg.sender != address(registryCommunity)) {
            revert OnlyCommunityAllowed();
        }
    }

    function revertZeroAddress(address _address) internal pure {
        if (_address == address(0)) revert AddressCannotBeZero();
    }

    function _registerRecipient(bytes memory _data, address _sender) internal override returns (address) {
        _data;
        StrategyStruct.CreateProposal memory proposal = abi.decode(_data, (StrategyStruct.CreateProposal));

        if (proposal.poolId == 0) {
            revert PoolIdCannotBeZero();
        }
        if (proposalType == StrategyStruct.ProposalType.Funding) {
            revertZeroAddress(proposal.beneficiary);
            if (proposal.requestedToken == address(0)) {
                revert TokenCannotBeZero();
            }
            address poolToken = this.getAllo().getPool(poolId).token;
            if (proposal.requestedToken != poolToken) {
                revert TokenNotAllowed();
            }
            if (_isOverMaxRatio(proposal.amountRequested)) {
                revert AmountOverMaxRatio();
            }
        }
        uint256 proposalId = ++proposalCounter;
        StrategyStruct.Proposal storage p = proposals[proposalId];

        p.proposalId = proposalId;
        p.submitter = _sender;
        p.beneficiary = proposal.beneficiary;
        p.requestedToken = proposal.requestedToken;
        p.requestedAmount = proposal.amountRequested;
        p.proposalStatus = StrategyStruct.ProposalStatus.Active;
        p.blockLast = block.number;
        p.convictionLast = 0;
        p.metadata = proposal.metadata;

        emit ProposalCreated(poolId, proposalId);
        return address(uint160(proposalId));
    }

    function activatePoints() external {
        address member = msg.sender;
        registryCommunity.activateMemberInStrategy(member, address(this));
        totalPointsActivated += registryCommunity.getMemberPowerInStrategy(member, address(this));
    }

    function deactivatePoints() public {
        _deactivatePoints(msg.sender);
    }

    function deactivatePoints(address _member) external {
        onlyRegistryCommunity();
        _deactivatePoints(_member);
    }

    function _deactivatePoints(address _member) internal {
        totalPointsActivated -= registryCommunity.getMemberPowerInStrategy(_member, address(this));
        registryCommunity.deactivateMemberInStrategy(_member, address(this));
        withdraw(_member);
        emit PointsDeactivated(_member);
    }

    function increasePower(address _member, uint256 _amountToStake) external returns (uint256) {
        onlyRegistryCommunity();
        uint256 pointsToIncrease = 0;
        if (pointSystem == StrategyStruct.PointSystem.Unlimited) {
            pointsToIncrease = increasePowerUnlimited(_amountToStake);
        } else if (pointSystem == StrategyStruct.PointSystem.Capped) {
            pointsToIncrease = increasePowerCapped(_member, _amountToStake);
        } else if (pointSystem == StrategyStruct.PointSystem.Quadratic) {
            pointsToIncrease = increasePowerQuadratic(_member, _amountToStake);
        }
        bool isActivated = registryCommunity.memberActivatedInStrategies(_member, address(this));
        if (isActivated) {
            totalPointsActivated += pointsToIncrease;
        }
        emit PowerIncreased(_member, _amountToStake, pointsToIncrease);
        return pointsToIncrease;
    }

    function decreasePower(address _member, uint256 _amountToUnstake) external returns (uint256) {
        onlyRegistryCommunity();
        uint256 pointsToDecrease = 0;
        if (pointSystem == StrategyStruct.PointSystem.Unlimited || pointSystem == StrategyStruct.PointSystem.Capped) {
            pointsToDecrease = decreasePowerCappedUnlimited(_amountToUnstake);
        } else {
            pointsToDecrease = decreasePowerQuadratic(_member, _amountToUnstake);
        }
        totalPointsActivated -= pointsToDecrease;
        emit PowerDecreased(_member, _amountToUnstake, pointsToDecrease);
        return pointsToDecrease;
    }

    function increasePowerUnlimited(uint256 _amountToStake) internal pure returns (uint256) {
        return _amountToStake;
    }

    function increasePowerCapped(address _member, uint256 _amountToStake) internal view returns (uint256) {
        uint256 pointsToIncrease = _amountToStake;
        uint256 memberPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
        if (memberPower + pointsToIncrease > pointConfig.maxAmount) {
            pointsToIncrease = pointConfig.maxAmount - memberPower;
        }
        return pointsToIncrease;
    }

    function increasePowerQuadratic(address _member, uint256 _amountToStake) internal view returns (uint256) {
        uint256 totalStake = registryCommunity.getMemberStakedAmount(_member) + _amountToStake;
        uint256 decimal = 18;
        try ERC20(address(registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {}
        uint256 newTotalPoints = Math.sqrt(totalStake * 10 ** decimal);
        uint256 currentPoints = registryCommunity.getMemberPowerInStrategy(_member, address(this));
        uint256 pointsToIncrease = newTotalPoints - currentPoints;
        return pointsToIncrease;
    }

    function decreasePowerCappedUnlimited(uint256 _amountToUnstake) internal pure returns (uint256) {
        return _amountToUnstake;
    }

    function decreasePowerQuadratic(address _member, uint256 _amountToUnstake) internal view returns (uint256) {
        uint256 decimal = 18;
        try ERC20(address(registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {}
        uint256 newTotalStake = registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake;
        uint256 newTotalPoints = Math.sqrt(newTotalStake * 10 ** decimal);
        uint256 pointsToDecrease = registryCommunity.getMemberPowerInStrategy(_member, address(this)) - newTotalPoints;
        return pointsToDecrease;
    }

    function getMaxAmount() public view returns (uint256) {
        return pointConfig.maxAmount;
    }

    function getPointSystem() public view returns (StrategyStruct.PointSystem) {
        return pointSystem;
    }

    function supportProposal(StrategyStruct.ProposalSupport[] memory) public pure {
        revert NotImplemented();
    }

    function _allocate(bytes memory _data, address _sender) internal override {
        checkSenderIsMember(_sender);
        bool isMemberActivatedPoints = registryCommunity.memberActivatedInStrategies(_sender, address(this));
        if (!isMemberActivatedPoints) {
            revert UserIsInactive();
        }
        StrategyStruct.ProposalSupport[] memory pv = abi.decode(_data, (StrategyStruct.ProposalSupport[]));
        _check_before_addSupport(_sender, pv);
        _addSupport(_sender, pv);
    }

    function _distribute(address[] memory, bytes memory _data, address) internal override {
        if (_data.length <= 0) {
            revert ProposalDataIsEmpty();
        }
        uint256 proposalId = abi.decode(_data, (uint256));
        if (proposalId == 0) {
            revert ProposalIdCannotBeZero();
        }
        StrategyStruct.Proposal storage proposal = proposals[proposalId];
        if (proposalType == StrategyStruct.ProposalType.Funding) {
            if (proposal.proposalId != proposalId) {
                revert ProposalNotInList(proposalId);
            }
            if (proposal.requestedAmount > poolAmount) {
                revert PoolAmountNotEnough(proposalId, proposal.requestedAmount, poolAmount);
            }
            if (proposal.proposalStatus != StrategyStruct.ProposalStatus.Active) {
                revert ProposalNotActive(proposalId);
            }
            uint256 convictionLast = updateProposalConviction(proposalId);
            uint256 threshold = calculateThreshold(proposal.requestedAmount);
            if (convictionLast < threshold && proposal.requestedAmount > 0) {
                revert ConvictionUnderMinimumThreshold();
            }
            IAllo.Pool memory pool = allo.getPool(poolId);
            poolAmount -= proposal.requestedAmount;
            _transferAmount(pool.token, proposal.beneficiary, proposal.requestedAmount);
            proposal.proposalStatus = StrategyStruct.ProposalStatus.Executed;
            emit Distributed(proposalId, proposal.beneficiary, proposal.requestedAmount);
        }
    }

    function canExecuteProposal(uint256 proposalId) public view returns (bool canBeExecuted) {
        StrategyStruct.Proposal storage proposal = proposals[proposalId];
        (uint256 convictionLast, uint256 blockNumber) =
            _checkBlockAndCalculateConviction(proposal, proposal.stakedAmount);
        if (convictionLast == 0 && blockNumber == 0) {
            convictionLast = proposal.convictionLast;
        }
        uint256 threshold = calculateThreshold(proposal.requestedAmount);
        canBeExecuted = convictionLast >= threshold;
    }

    function _getRecipientStatus(address _recipientId) internal pure override returns (Status) {
        return _recipientId == address(0) ? Status.Rejected : Status.Accepted;
    }

    function getPayouts(address[] memory, bytes[] memory) external pure override returns (PayoutSummary[] memory) {
        revert NotImplemented();
    }

    function _getPayout(address _recipientId, bytes memory _data)
        internal
        pure
        override
        returns (PayoutSummary memory)
    {
        _data;
        return PayoutSummary(_recipientId, 0);
    }

    function _afterIncreasePoolAmount(uint256 _amount) internal virtual override {
        emit PoolAmountIncreased(_amount);
    }

    function _isValidAllocator(address _allocator) internal pure override returns (bool) {
        return _allocator != address(0);
    }

    function setPoolActive(bool _active) external {
        _setPoolActive(_active);
    }

    function withdraw(address _member) internal {
        uint256[] memory proposalsIds = voterStakedProposals[_member];
        for (uint256 i = 0; i < proposalsIds.length; i++) {
            uint256 proposalId = proposalsIds[i];
            StrategyStruct.Proposal storage proposal = proposals[proposalId];
            if (proposalExists(proposalId)) {
                uint256 stakedPoints = proposal.voterStakedPoints[_member];
                proposal.voterStakedPoints[_member] = 0;
                proposal.stakedAmount -= stakedPoints;
                totalStaked -= stakedPoints;
                _calculateAndSetConviction(proposal, stakedPoints);
            }
        }
    }

    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            address submitter,
            address beneficiary,
            address requestedToken,
            uint256 requestedAmount,
            uint256 stakedAmount,
            StrategyStruct.ProposalStatus proposalStatus,
            uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold,
            uint256 voterStakedPoints
        )
    {
        StrategyStruct.Proposal storage proposal = proposals[_proposalId];
        threshold = proposal.requestedAmount == 0 ? 0 : calculateThreshold(proposal.requestedAmount);
        return (
            proposal.submitter,
            proposal.beneficiary,
            proposal.requestedToken,
            proposal.requestedAmount,
            proposal.stakedAmount,
            proposal.proposalStatus,
            proposal.blockLast,
            proposal.convictionLast,
            threshold,
            proposal.voterStakedPoints[msg.sender]
        );
    }

    function getMetadata(uint256 _proposalId) external view returns (Metadata memory) {
        StrategyStruct.Proposal storage proposal = proposals[_proposalId];
        return proposal.metadata;
    }

    function getProposalVoterStake(uint256 _proposalId, address _voter) external view returns (uint256) {
        return _internal_getProposalVoterStake(_proposalId, _voter);
    }

    function getProposalStakedAmount(uint256 _proposalId) external view returns (uint256) {
        return proposals[_proposalId].stakedAmount;
    }

    function getTotalVoterStakePct(address _voter) public view returns (uint256) {
        return totalVoterStakePct[_voter];
    }

    function _internal_getProposalVoterStake(uint256 _proposalId, address _voter) internal view returns (uint256) {
        return proposals[_proposalId].voterStakedPoints[_voter];
    }

    function getBasisStakedAmount() internal view returns (uint256) {
        return registryCommunity.getBasisStakedAmount();
    }

    function proposalExists(uint256 _proposalID) internal view returns (bool) {
        return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
    }

    function _isOverMaxRatio(uint256 _requestedAmount) internal view returns (bool isOverMaxRatio) {
        isOverMaxRatio = maxRatio * poolAmount <= _requestedAmount * D;
    }

    function _check_before_addSupport(address _sender, StrategyStruct.ProposalSupport[] memory _proposalSupport)
        internal
    {
        int256 deltaSupportSum = 0;
        for (uint256 i = 0; i < _proposalSupport.length; i++) {
            if (_proposalSupport[i].proposalId == 0) {
                continue;
            }
            uint256 proposalId = _proposalSupport[i].proposalId;
            if (!proposalExists(proposalId)) {
                revert ProposalNotInList(proposalId);
            }
            deltaSupportSum += _proposalSupport[i].deltaSupport;
        }
        uint256 newTotalVotingSupport = _applyDelta(getTotalVoterStakePct(_sender), deltaSupportSum);
        uint256 participantBalance = registryCommunity.getMemberPowerInStrategy(_sender, address(this));
        if (newTotalVotingSupport > participantBalance) {
            revert NotEnoughPointsToSupport(newTotalVotingSupport, participantBalance);
        }
        totalVoterStakePct[_sender] = newTotalVotingSupport;
    }

    function _addSupport(address _sender, StrategyStruct.ProposalSupport[] memory _proposalSupport) internal {
        uint256[] memory proposalsIds;
        for (uint256 i = 0; i < _proposalSupport.length; i++) {
            uint256 proposalId = _proposalSupport[i].proposalId;
            if (proposalsIds.length == 0) {
                proposalsIds = new uint256;
                proposalsIds[0] = proposalId;
            } else {
                bool exist = false;
                for (uint256 j = 0; j < proposalsIds.length; j++) {
                    if (proposalsIds[j] == proposalId) {
                        exist = true;
                        revert ProposalSupportDuplicated(proposalId, j);
                    }
                }
                if (!exist) {
                    uint256[] memory temp = new uint256[](proposalsIds.length + 1);
                    for (uint256 j = 0; j < proposalsIds.length; j++) {
                        temp[j] = proposalsIds[j];
                    }
                    temp[proposalsIds.length] = proposalId;
                    proposalsIds = temp;
                }
            }
            int256 delta = _proposalSupport[i].deltaSupport;
            StrategyStruct.Proposal storage proposal = proposals[proposalId];
            uint256 previousStakedPoints = proposal.voterStakedPoints[_sender];
            uint256 stakedPoints = _applyDelta(previousStakedPoints, delta);
            proposal.voterStakedPoints[_sender] = stakedPoints;
            bool hasProposal = false;
            for (uint256 k = 0; k < voterStakedProposals[_sender].length; k++) {
                if (voterStakedProposals[_sender][k] == proposal.proposalId) {
                    hasProposal = true;
                    break;
                }
            }
            if (!hasProposal) {
                voterStakedProposals[_sender].push(proposal.proposalId);
            }
            if (previousStakedPoints <= stakedPoints) {
                totalStaked += stakedPoints - previousStakedPoints;
                proposal.stakedAmount += stakedPoints - previousStakedPoints;
            } else {
                totalStaked -= previousStakedPoints - stakedPoints;
                proposal.stakedAmount -= previousStakedPoints - stakedPoints;
            }
            if (proposal.blockLast == 0) {
                proposal.blockLast = block.number;
            } else {
                _calculateAndSetConviction(proposal, previousStakedPoints);
                emit SupportAdded(_sender, proposalId, stakedPoints, proposal.stakedAmount, proposal.convictionLast);
            }
        }
    }

    function _applyDelta(uint256 _support, int256 _delta) internal pure returns (uint256) {
        int256 result = int256(_support) + _delta;
        if (result < 0) {
            revert SupportUnderflow(_support, _delta, result);
        }
        return uint256(result);
    }

    function calculateConviction(uint256 _timePassed, uint256 _lastConv, uint256 _oldAmount)
        public
        view
        returns (uint256)
    {
        uint256 t = _timePassed;
        uint256 atTWO_128 = _pow((decay << 128) / D, t);
        return (((atTWO_128 * _lastConv) + ((_oldAmount * D * (TWO_128 - atTWO_128)) / (D - decay))) + TWO_127) >> 128;
    }

    function calculateThreshold(uint256 _requestedAmount) public view returns (uint256 _threshold) {
        if (poolAmount <= 0) {
            revert PoolIsEmpty();
        }
        if (_isOverMaxRatio(_requestedAmount)) {
            revert AmountOverMaxRatio();
        }
        uint256 denom = (maxRatio * 2 ** 64) / D - (_requestedAmount * 2 ** 64) / poolAmount;
        _threshold =
            (((((weight << 128) / D) / ((denom * denom) >> 64)) * D) / (D - decay)) * totalEffectiveActivePoints() >> 64;
        _threshold = _threshold > _minThresholdPoints ? _threshold : _minThresholdPoints;
    }

    function _mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a <= TWO_128, "_a should be less than or equal to 2^128");
        require(_b < TWO_128, "_b should be less than 2^128");
        return ((_a * _b) + TWO_127) >> 128;
    }

    function _pow(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a < TWO_128, "_a should be less than 2^128");
        uint256 a = _a;
        uint256 b = _b;
        _result = TWO_128;
        while (b > 0) {
            if (b & 1 == 0) {
                a = _mul(a, a);
                b >>= 1;
            } else {
                _result = _mul(_result, a);
                b -= 1;
            }
        }
    }

    function totalEffectiveActivePoints() public view returns (uint256) {
        return totalPointsActivated;
    }

    function _calculateAndSetConviction(StrategyStruct.Proposal storage _proposal, uint256 _oldStaked) internal {
        (uint256 conviction, uint256 blockNumber) = _checkBlockAndCalculateConviction(_proposal, _oldStaked);
        if (conviction == 0 && blockNumber == 0) {
            return;
        }
        _proposal.blockLast = blockNumber;
        _proposal.convictionLast = conviction;
    }

    function _checkBlockAndCalculateConviction(StrategyStruct.Proposal storage _proposal, uint256 _oldStaked)
        internal
        view
        returns (uint256 conviction, uint256 blockNumber)
    {
        blockNumber = block.number;
        assert(_proposal.blockLast <= blockNumber);
        if (_proposal.blockLast == blockNumber) {
            return (0, 0);
        }
        conviction = calculateConviction(blockNumber - _proposal.blockLast, _proposal.convictionLast, _oldStaked);
    }

    function updateProposalConviction(uint256 proposalId) public returns (uint256) {
        StrategyStruct.Proposal storage proposal = proposals[proposalId];
        if (proposal.proposalId != proposalId) {
            revert ProposalNotInList(proposalId);
        }
        if (proposal.proposalStatus != StrategyStruct.ProposalStatus.Active) {
            revert ProposalNotActive(proposalId);
        }
        _calculateAndSetConviction(proposal, proposal.stakedAmount);
        return proposal.convictionLast;
    }

    function getMaxConviction(uint256 amount) public view returns (uint256) {
        return ((amount * D) / (D - decay));
    }

    function setDecay(uint256 _decay) external onlyPoolManager(msg.sender) {
        decay = _decay;
        emit DecayUpdated(_decay);
    }

    function setMaxRatio(uint256 _maxRatio) external onlyPoolManager(msg.sender) {
        maxRatio = _maxRatio;
        emit MaxRatioUpdated(_maxRatio);
    }

    function setWeight(uint256 _weight) external onlyPoolManager(msg.sender) {
        weight = _weight;
        emit WeightUpdated(_weight);
    }

    function setRegistryCommunity(address _registryCommunity) external onlyPoolManager(msg.sender) {
        registryCommunity = RegistryCommunity(_registryCommunity);
        emit RegistryUpdated(_registryCommunity);
    }

    function setMinThresholdPoints(uint256 minThresholdPoints_) external onlyPoolManager(msg.sender) {
        emit MinThresholdPointsUpdated(_minThresholdPoints, minThresholdPoints_);
        _minThresholdPoints = minThresholdPoints_;
    }

    function disputeProposal(uint256 proposalId, string calldata context, bytes calldata _extraData)
        external
        payable
        nonReentrant
    {
        StrategyStruct.Proposal storage proposal = proposals[proposalId];

        if (proposal.proposalId != proposalId) {
            revert ProposalNotInList(proposalId);
        }
        if (proposal.proposalStatus != StrategyStruct.ProposalStatus.Active) {
            revert ProposalNotActive(proposalId);
        }
        if (msg.value <= arbitrableConfig.collateralAmount) {
            revert InsufficientCollateral(msg.value, arbitrableConfig.collateralAmount);
        }

        uint256 arbitrationFee = msg.value - arbitrableConfig.collateralAmount;

        arbitrableConfig.collateralVault.depositCollateral{value: arbitrableConfig.collateralAmount}(
            proposalId, msg.sender
        );

        uint256 disputeId = arbitrableConfig.arbitrator.createDispute{value: arbitrationFee}(RULING_OPTIONS, _extraData);

        proposal.proposalStatus = StrategyStruct.ProposalStatus.Disputed;
        proposal.disputeId = disputeId;
        proposal.disputeTimestamp = block.timestamp;
        proposal.challenger = msg.sender;
        disputeIdToProposalId[disputeId] = proposalId;
        emit ProposalDisputed(proposalId, disputeId, msg.sender, arbitrationFee, context);
    }

    function rule(uint256 _disputeID, uint256 _ruling) external override {
        uint256 proposalId = disputeIdToProposalId[_disputeID];
        StrategyStruct.Proposal storage proposal = proposals[proposalId];

        if (proposalId == 0) {
            revert ProposalNotInList(proposalId);
        }
        if (proposal.proposalStatus != StrategyStruct.ProposalStatus.Disputed) {
            revert ProposalNotDisputed(proposalId);
        }

        bool isTimeOut = block.timestamp > proposal.disputeTimestamp + arbitrableConfig.defaultRulingTimeout;

        if (!isTimeOut && msg.sender != address(arbitrableConfig.arbitrator)) {
            revert OnlyArbitrator();
        }

        if (isTimeOut || _ruling == 0) {
            if (arbitrableConfig.defaultRuling == 1) {
                proposal.proposalStatus = StrategyStruct.ProposalStatus.Active;
            }
            if (arbitrableConfig.defaultRuling == 2) {
                proposal.proposalStatus = StrategyStruct.ProposalStatus.Blocked;
            }
            arbitrableConfig.collateralVault.withdrawCollateral(
                proposalId, proposal.challenger, arbitrableConfig.collateralAmount
            );
            arbitrableConfig.collateralVault.withdrawCollateral(
                proposalId, proposal.submitter, arbitrableConfig.collateralAmount
            );
        } else if (_ruling == 1) {
            proposal.proposalStatus = StrategyStruct.ProposalStatus.Active;
            arbitrableConfig.collateralVault.withdrawCollateral(
                proposalId, proposal.submitter, arbitrableConfig.collateralAmount
            );
            arbitrableConfig.collateralVault.withdrawCollateral(
                proposalId, address(registryCommunity.getCouncilSafe()), arbitrableConfig.collateralAmount
            );
        } else if (_ruling == 2) {
            proposal.proposalStatus = StrategyStruct.ProposalStatus.Blocked;
            arbitrableConfig.collateralVault.withdrawCollateral(
                proposalId, proposal.challenger, 1.5 * arbitrableConfig.collateralAmount
            );
            arbitrableConfig.collateralVault.withdrawCollateral(
                proposalId, address(registryCommunity.getCouncilSafe()), 0.5 * arbitrableConfig.collateralAmount
            );
        }

        emit Ruling(arbitrableConfig.arbitrator, _disputeID, _ruling);
    }
}
