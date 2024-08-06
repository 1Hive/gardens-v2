// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {BaseStrategy, IAllo} from "allo-v2-contracts/strategies/BaseStrategy.sol";

import {RegistryCommunityV0_0} from "./RegistryCommunityV0_0.sol";
import {ERC165, IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IArbitrator} from "./interfaces/IArbitrator.sol";
import {IArbitrable} from "./interfaces/IArbitrable.sol";
import {CollateralVault} from "./CollateralVault.sol";
import {SafeArbitrator} from "./SafeArbitrator.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";

import {console} from "forge-std/console.sol";

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ISybilScorer, PassportData} from "./ISybilScorer.sol";

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {BaseStrategyUpgradeable} from "./BaseStrategyUpgradeable.sol";

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
        Paused, // A vote that is being challenged by Agreements
        Cancelled, // A vote that has been cancelled
        Executed, // A vote that has been executed
        Disputed, // A vote that has been disputed
        Rejected // A vote that has been rejected

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
        uint256 disputeId;
        uint256 disputeTimestamp;
        address challenger;
        uint256 lastDisputeCompletion;
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
        address collateralVaultTemplate;
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
        address sybilScorer;
    }
}

contract CVStrategyV0_0 is
    OwnableUpgradeable,
    BaseStrategyUpgradeable,
    IArbitrable,
    ReentrancyGuardUpgradeable,
    IPointStrategy,
    ERC165
{
    using Math for uint256;
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
    error CollateralVaultCannotBeZero();
    error DefaultRulingNotSet();
    error DisputeCooldownNotPassed(uint256 _proposalId);
    error ArbitrationConfigCannotBeChangedDuringDispute();

    /*|--------------------------------------------|*/
    /*|              CUSTOM EVENTS                 |*/
    /*|--------------------------------------------|*/

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
        IArbitrator arbitrator,
        uint256 proposalId,
        uint256 disputeId,
        address challenger,
        string context,
        uint256 timestamp
    );
    event CollateralVaultUpdated(address collateralVault);
    event TribunaSafeRegistered(address strategy, address arbitrator, address tribunalSafe);
    event ArbitrationConfigUpdated(address strategy, StrategyStruct.ArbitrableConfig arbitrableConfig);

    /*|-------------------------------------/-------|*o
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/

    /*|--------------------------------------------|*/
    /*|                VARIABLES                   |*/
    /*|--------------------------------------------|*/

    // Constants for fixed numbers
    uint256 public constant D = 10000000; //10**7
    uint256 private constant TWO_128 = 0x100000000000000000000000000000000; // 2**128
    uint256 private constant TWO_127 = 0x80000000000000000000000000000000; // 2**127
    uint256 private constant TWO_64 = 0x10000000000000000; // 2**64
    uint256 public constant MAX_STAKED_PROPOSALS = 10; // @todo not allow stake more than 10 proposals per user, don't count executed?
    uint256 public constant RULING_OPTIONS = 3;
    uint256 public constant DISPUTE_COOLDOWN_SEC = 2 hours;

    // uint256 variables packed together
    uint256 public decay;
    uint256 public maxRatio;
    uint256 public weight;
    uint256 public proposalCounter = 0;
    uint256 public totalStaked;
    uint256 public totalPointsActivated;
    uint256 public minThresholdPoints = 0; // starting with a default of zero
    uint256 internal surpressStateMutabilityWarning; // used to suppress Solidity warnings
    uint256 public cloneNonce;

    // Enum for handling proposal types
    StrategyStruct.ProposalType public proposalType;

    // Struct variables for complex data structures
    StrategyStruct.PointSystem public pointSystem;
    StrategyStruct.PointSystemConfig public pointConfig;
    StrategyStruct.ArbitrableConfig public arbitrableConfig;

    // Contract reference
    RegistryCommunityV0_0 public registryCommunity;
    CollateralVault public collateralVault;
    ISybilScorer public sybilScorer;

    // Mappings to handle relationships and staking details
    mapping(uint256 => StrategyStruct.Proposal) public proposals; // Mapping of proposal IDs to Proposal structures
    mapping(address => uint256) public totalVoterStakePct; // voter -> total staked points
    mapping(address => uint256[]) public voterStakedProposals; // voter -> proposal ids arrays
    mapping(uint256 => uint256) public disputeIdToProposalId;

    /*|--------------------------------------------|*/
    /*|              CONSTRUCTORS                  |*/
    /*|--------------------------------------------|*/
    // constructor(address _allo) BaseStrategy(address(_allo), "CVStrategy") {}

    function init(address _allo) external virtual initializer {
        super.init(_allo, "CVStrategy");
        __Ownable_init();
        __ReentrancyGuard_init();
    }

    function initialize(uint256 _poolId, bytes memory _data) external virtual onlyAllo {
        __BaseStrategy_init(_poolId);
        StrategyStruct.InitializeParams memory ip = abi.decode(_data, (StrategyStruct.InitializeParams));

        if (ip.registryCommunity == address(0)) {
            revert RegistryCannotBeZero();
        }

        registryCommunity = RegistryCommunityV0_0(ip.registryCommunity);
        decay = ip.decay;
        maxRatio = ip.maxRatio;
        weight = ip.weight;
        proposalType = ip.proposalType;
        pointSystem = ip.pointSystem;
        pointConfig = ip.pointConfig;
        minThresholdPoints = ip.minThresholdPoints;
        sybilScorer = ISybilScorer(ip.sybilScorer);
        arbitrableConfig = ip.arbitrableConfig;
        if (address(arbitrableConfig.arbitrator) != address(0)) {
            collateralVault = CollateralVault(Clone.createClone(arbitrableConfig.collateralVaultTemplate, cloneNonce++));
            collateralVault.initialize();
            if (arbitrableConfig.tribunalSafe != address(0)) {
                SafeArbitrator(address(arbitrableConfig.arbitrator)).registerSafe(arbitrableConfig.tribunalSafe);
                emit TribunaSafeRegistered(
                    address(this), address(arbitrableConfig.arbitrator), arbitrableConfig.tribunalSafe
                );
            }
        }
        sybilScorer = ISybilScorer(ip.sybilScorer);

        emit InitializedCV(_poolId, ip);
    }

    /*|--------------------------------------------|*/
    /*|                 FALLBACK                  |*/
    /*|--------------------------------------------|*/

    fallback() external payable {
        // // surpressStateMutabilityWarning++;
    }

    receive() external payable {
        //@todo allow only allo protocol to fund it.
        // // surpressStateMutabilityWarning++;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IPointStrategy).interfaceId || super.supportsInterface(interfaceId);
    }

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/
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
        // _;
    }

    function onlyRegistryCommunity() private view {
        if (msg.sender != address(registryCommunity)) {
            revert OnlyCommunityAllowed();
        }
    }

    function _revertZeroAddress(address _address) internal pure {
        if (_address == address(0)) revert AddressCannotBeZero();
    }

    function onlyCouncilSafe() internal view {
        if (msg.sender != address(registryCommunity.councilSafe())) {
            revert OnlyCouncilSafe();
        }
    }

    function _canExecuteAction(address _user) internal view returns (bool) {
        if (address(sybilScorer) == address(0)) {
            return true;
        }
        return sybilScorer.canExecuteAction(_user, address(this));
    }

    // this is called via allo.sol to register recipients
    // it can change their status all the way to Accepted, or to Pending if there are more steps
    // if there are more steps, additional functions should be added to allow the owner to check
    // this could also check attestations directly and then Accept

    function _registerRecipient(bytes memory _data, address _sender) internal override returns (address) {
        if (!_canExecuteAction(_sender)) {
            revert UserCannotExecuteAction();
        }
        // surpressStateMutabilityWarning++;
        _data;
        StrategyStruct.CreateProposal memory proposal = abi.decode(_data, (StrategyStruct.CreateProposal));

        // if (proposal.proposalId == 0) {
        // revert ProposalIdCannotBeZero();
        // }
        if (proposal.poolId == 0) {
            revert PoolIdCannotBeZero();
        }
        // console.log("proposalType", uint256(proposalType));
        if (proposalType == StrategyStruct.ProposalType.Funding) {
            _revertZeroAddress(proposal.beneficiary);
            // getAllo().getPool(poolId).token;
            if (proposal.requestedToken == address(0)) {
                revert TokenCannotBeZero();
            }
            IAllo _allo = this.getAllo();
            IAllo.Pool memory pool = _allo.getPool(proposal.poolId);
            if (proposal.requestedToken != pool.token) {
                // console.log("::requestedToken", proposal.requestedToken);
                // console.log("::PookToken", poolToken);
                revert TokenNotAllowed();
            }
            if (_isOverMaxRatio(proposal.amountRequested)) {
                revert AmountOverMaxRatio();
            }
        }

        if (
            address(arbitrableConfig.arbitrator) != address(0) && msg.value < arbitrableConfig.submitterCollateralAmount
        ) {
            revert InsufficientCollateral(msg.value, arbitrableConfig.submitterCollateralAmount);
        }

        uint256 proposalId = ++proposalCounter;
        StrategyStruct.Proposal storage p = proposals[proposalId];

        p.proposalId = proposalId;
        p.submitter = _sender;
        p.beneficiary = proposal.beneficiary;
        p.requestedToken = proposal.requestedToken;
        p.requestedAmount = proposal.amountRequested;
        // p.proposalType = proposal.proposalType;
        p.proposalStatus = StrategyStruct.ProposalStatus.Active;
        p.blockLast = block.number;
        p.convictionLast = 0;
        // p.agreementActionId = 0;
        p.metadata = proposal.metadata;
        collateralVault.depositCollateral{value: msg.value}(proposalId, p.submitter);

        emit ProposalCreated(poolId, proposalId);
        console.log("Gaz left: ", gasleft());
        return address(uint160(proposalId));
    }

    function activatePoints() external {
        address member = msg.sender;
        if (!_canExecuteAction(member)) {
            revert UserCannotExecuteAction();
        }
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
        // remove support from all proposals
        withdraw(_member);
        emit PointsDeactivated(_member);
    }

    function increasePower(address _member, uint256 _amountToStake) external returns (uint256) {
        //requireMemberActivatedInStrategies
        onlyRegistryCommunity();
        if (!_canExecuteAction(_member)) {
            revert UserCannotExecuteAction();
        }
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
        //requireMemberActivatedInStrategies

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
        console.log("POINTS TO INCREASE", pointsToIncrease);
        uint256 memberPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
        console.log("MEMBERPOWER", memberPower);
        if (memberPower + pointsToIncrease > pointConfig.maxAmount) {
            pointsToIncrease = pointConfig.maxAmount - memberPower;
        }
        console.log("POINTS TO INCREASE END", pointsToIncrease);

        return pointsToIncrease;
    }

    function increasePowerQuadratic(address _member, uint256 _amountToStake) internal view returns (uint256) {
        uint256 totalStake = registryCommunity.getMemberStakedAmount(_member) + _amountToStake;

        uint256 decimal = 18;
        try ERC20(address(registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {
            console.log("Error getting decimal");
        }
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
        } catch {
            console.log("Error getting decimal");
        }
        console.log("_amountToUnstake", _amountToUnstake);
        uint256 newTotalStake = registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake;
        console.log("newTotalStake", newTotalStake);
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

    function getCollateralAmount() public view returns (uint256) {
        return arbitrableConfig.submitterCollateralAmount;
    }

    // [[[proposalId, delta],[proposalId, delta]]]
    // layout.txs -> console.log(data)
    // data = bytes
    function supportProposal(StrategyStruct.ProposalSupport[] memory) public pure {
        // // surpressStateMutabilityWarning++;
        revert NotImplemented();
        // allo().allocate(poolId, abi.encode(proposalId));
    }

    // only called via allo.sol by users to allocate to a recipient
    // this will update some data in this contract to store votes, etc.
    function _allocate(bytes memory _data, address _sender) internal override {
        checkSenderIsMember(_sender);
        if (!_canExecuteAction(_sender)) {
            revert UserCannotExecuteAction();
        }
        // surpressStateMutabilityWarning++;

        bool isMemberActivatedPoints = registryCommunity.memberActivatedInStrategies(_sender, address(this));
        if (!isMemberActivatedPoints) {
            revert UserIsInactive();
        }
        StrategyStruct.ProposalSupport[] memory pv = abi.decode(_data, (StrategyStruct.ProposalSupport[]));
        _check_before_addSupport(_sender, pv);
        _addSupport(_sender, pv);
    }

    // this will distribute tokens to recipients
    // most strategies will track a TOTAL amount per recipient, and a PAID amount, and pay the difference
    // this contract will need to track the amount paid already, so that it doesn't double pay
    function _distribute(address[] memory, bytes memory _data, address) internal override {
        //@todo could reentrancy?
        // surpressStateMutabilityWarning++;
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

            poolAmount -= proposal.requestedAmount; // CEI

            _transferAmount(pool.token, proposal.beneficiary, proposal.requestedAmount); //should revert

            proposal.proposalStatus = StrategyStruct.ProposalStatus.Executed;
            CollateralVault(collateralVault).withdrawCollateral(
                proposalId, proposal.submitter, arbitrableConfig.submitterCollateralAmount
            );

            emit Distributed(proposalId, proposal.beneficiary, proposal.requestedAmount);
        } //signaling do nothing @todo write tests @todo add end date
    }

    function canExecuteProposal(uint256 proposalId) public view returns (bool canBeExecuted) {
        StrategyStruct.Proposal storage proposal = proposals[proposalId];

        // uint256 convictionLast = updateProposalConviction(proposalId);
        (uint256 convictionLast, uint256 blockNumber) =
            _checkBlockAndCalculateConviction(proposal, proposal.stakedAmount);

        if (convictionLast == 0 && blockNumber == 0) {
            convictionLast = proposal.convictionLast;
        }
        uint256 threshold = calculateThreshold(proposal.requestedAmount);

        // console.log("convictionLast", convictionLast);
        // console.log("threshold", threshold);
        canBeExecuted = convictionLast >= threshold;
    }

    // simply returns the status of a recipient
    // probably tracked in a mapping, but will depend on the implementation
    // for example, the OpenSelfRegistration only maps users to bool, and then assumes Accepted for those
    // since there is no need for Pending or Rejected
    function _getRecipientStatus(address _recipientId) internal pure override returns (Status) {
        // surpressStateMutabilityWarning;
        return _recipientId == address(0) ? Status.Rejected : Status.Accepted;
    }

    /// @return Input the values you would send to distribute(), get the amounts each recipient in the array would receive
    function getPayouts(address[] memory, bytes[] memory) external pure override returns (PayoutSummary[] memory) {
        // surpressStateMutabilityWarning;
        revert NotImplemented();
        // PayoutSummary[] memory payouts = new PayoutSummary[](0);
        // return payouts;
    }

    function _getPayout(address _recipientId, bytes memory _data)
        internal
        pure
        override
        returns (PayoutSummary memory)
    {
        // surpressStateMutabilityWarning;
        _data;
        return PayoutSummary(_recipientId, 0);
    }

    function _afterIncreasePoolAmount(uint256 _amount) internal virtual override {
        emit PoolAmountIncreased(_amount);
    }

    // simply returns whether a allocator is valid or not, will usually be true for all

    function _isValidAllocator(address _allocator) internal pure override returns (bool) {
        // surpressStateMutabilityWarning;
        return _allocator == address(0) ? false : true;
    }

    function setPoolActive(bool _active) external {
        _setPoolActive(_active);
    }

    function withdraw(address _member) internal {
        // remove all proposals from the member
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
                emit SupportAdded(_member, proposalId, 0, proposal.stakedAmount, proposal.convictionLast);
            }
        }
    }

    /**
     * @dev Get proposal details
     * @param _proposalId Proposal id
     * @return submitter Proposal submitter
     * @return beneficiary Proposal beneficiary
     * @return requestedToken Proposal requested token
     * @return requestedAmount Proposal requested amount
     * @return stakedAmount Proposal staked points
     * @return proposalStatus Proposal status
     * @return blockLast Last block when conviction was calculated
     * @return convictionLast Last conviction calculated
     * @return threshold Proposal threshold
     */
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

    /**
     * @notice Get stake of voter `_voter` on proposal #`_proposalId`
     * @param _proposalId Proposal id
     * @param _voter Voter address
     * @return Proposal voter stake
     */
    function getProposalVoterStake(uint256 _proposalId, address _voter) external view returns (uint256) {
        return _internal_getProposalVoterStake(_proposalId, _voter);
    }

    function getProposalStakedAmount(uint256 _proposalId) external view returns (uint256) {
        return proposals[_proposalId].stakedAmount;
    }

    //    do a internal function to get the total voter stake

    function getTotalVoterStakePct(address _voter) public view returns (uint256) {
        return totalVoterStakePct[_voter];
    }

    function _internal_getProposalVoterStake(uint256 _proposalId, address _voter) internal view returns (uint256) {
        return proposals[_proposalId].voterStakedPoints[_voter];
    }

    function getBasisStakedAmount() internal view returns (uint256) {
        return registryCommunity.getBasisStakedAmount(); // 50 HNY = 100%
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
            // check if _proposalSupport index i exist
            if (_proposalSupport[i].proposalId == 0) {
                //@todo: check better way to do that.
                // console.log("proposalId == 0");
                continue;
            }
            uint256 proposalId = _proposalSupport[i].proposalId;
            if (!proposalExists(proposalId)) {
                revert ProposalNotInList(proposalId); //@TODO: maybe we should skip emitting a event instead of revert
            }
            deltaSupportSum += _proposalSupport[i].deltaSupport;
        }
        // console.log("deltaSupportSum");
        // console.logInt(deltaSupportSum);
        uint256 newTotalVotingSupport = _applyDelta(getTotalVoterStakePct(_sender), deltaSupportSum);
        // console.log("newTotalVotingSupport", newTotalVotingSupport);
        uint256 participantBalance = registryCommunity.getMemberPowerInStrategy(_sender, address(this));

        // console.log("participantBalance", participantBalance);
        // Check that the sum of support is not greater than the participant balance
        if (newTotalVotingSupport > participantBalance) {
            revert NotEnoughPointsToSupport(newTotalVotingSupport, participantBalance);
        }

        totalVoterStakePct[_sender] = newTotalVotingSupport;
    }

    function _addSupport(address _sender, StrategyStruct.ProposalSupport[] memory _proposalSupport) internal {
        uint256[] memory proposalsIds;
        for (uint256 i = 0; i < _proposalSupport.length; i++) {
            uint256 proposalId = _proposalSupport[i].proposalId;
            // add proposalid to the list if not exist
            if (proposalsIds.length == 0) {
                proposalsIds = new uint256[](1);
                proposalsIds[0] = proposalId; // 0 => 1
            } else {
                bool exist = false;
                for (uint256 j = 0; j < proposalsIds.length; j++) {
                    // 1
                    if (proposalsIds[j] == proposalId) {
                        exist = true;
                        revert ProposalSupportDuplicated(proposalId, j);
                        // break;
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

            // uint256 beforeStakedPointsPct = proposal.voterStakedPointsPct[_sender];
            uint256 previousStakedPoints = proposal.voterStakedPoints[_sender];
            // console.log("beforeStakedPointsPct", beforeStakedPointsPct);
            // console.log("previousStakedAmount", previousStakedAmount);

            uint256 stakedPoints = _applyDelta(previousStakedPoints, delta);

            // console.log("proposalID", proposalId);
            // console.log("stakedPointsPct%", stakedPointsPct);

            proposal.voterStakedPoints[_sender] = stakedPoints;

            // console.log("_sender", _sender);
            // uint2stakedPointsunt = stakedPoints;
            // console.log("stakedAmount", stakedAmount);
            // proposal.voterStake[_sender]stakedPointsunt;

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
            // proposal.stakedAmount += stakedAmount;
            // uint256 diff =_diffStakedTokens(previousStakedAmount, stakedAmount);
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

    /**
     * @dev Conviction formula: a^t * y(0) + x * (1 - a^t) / (1 - a)
     * Solidity implementation: y = (2^128 * a^t * y0 + x * D * (2^128 - 2^128 * a^t) / (D - aD) + 2^127) / 2^128
     * @param _timePassed Number of blocks since last conviction record
     * @param _lastConv Last conviction record
     * @param _oldAmount Amount of tokens staked until now
     * @return Current conviction
     */
    function calculateConviction(uint256 _timePassed, uint256 _lastConv, uint256 _oldAmount)
        public
        view
        returns (uint256)
    {
        uint256 t = _timePassed;
        // atTWO_128 = 2^128 * a^t
        //        @audit-issue why that _pow require that need be less than TWO_128? why dont use 256?
        //        @audit-ok they use 2^128 as the container for the result of the _pow function

        //        uint256 atTWO_128 = _pow((decay << 128).div(D), t);
        uint256 atTWO_128 = _pow((decay << 128) / D, t);
        // solium-disable-previous-line
        // conviction = (atTWO_128 * _lastConv + _oldAmount * D * (2^128 - atTWO_128) / (D - aD) + 2^127) / 2^128
        //        return (atTWO_128.mul(_lastConv).add(_oldAmount.mul(D).mul(TWO_128.sub(atTWO_128)).div(D - decay))).add(TWO_127)
        //            >> 128;
        //        return (atTWO_128.mul(_lastConv).add(_oldAmount.mul(D).mul(TWO_128.sub(atTWO_128)).div(D - decay))).add(TWO_127)
        //            >> 128;
        return (((atTWO_128 * _lastConv) + ((_oldAmount * D * (TWO_128 - atTWO_128)) / (D - decay))) + TWO_127) >> 128;
    }

    /**
     * @dev Formula: ρ * totalStaked / (1 - a) / (β - requestedAmount / total)**2
     * For the Solidity implementation we amplify ρ and β and simplify the formula:
     * weight = ρ * D
     * maxRatio = β * D
     * decay = a * D
     * threshold = weight * totalStaked * D ** 2 * funds ** 2 / (D - decay) / (maxRatio * funds - requestedAmount * D) ** 2
     * @param _requestedAmount Requested amount of tokens on certain proposal
     * @return _threshold Threshold a proposal's conviction should surpass in order to be able to
     * executed it.
     */
    function calculateThreshold(uint256 _requestedAmount) public view returns (uint256 _threshold) {
        //       @todo: we should replace it with
        //        uint256 funds = fundsManager.balance(requestToken);
        if (poolAmount <= 0) {
            revert PoolIsEmpty();
        }
        //        require(maxRatio.mul(funds) > _requestedAmount.mul(D), ERROR_AMOUNT_OVER_MAX_RATIO);
        // console.log("maxRatio", maxRatio);
        // console.log("funds=poolAmount", funds);
        // console.log("_requestedAmount", _requestedAmount);
        // console.log("D", D);
        // console.log("maxRatio * funds", maxRatio * funds);
        // console.log("_requestedAmount * D", _requestedAmount * D);

        if (_isOverMaxRatio(_requestedAmount)) {
            revert AmountOverMaxRatio();
        }
        // denom = maxRatio * 2 ** 64 / D  - requestedAmount * 2 ** 64 / funds
        // denom = maxRatio / 1 - _requestedAmount / funds;
        uint256 denom = (maxRatio * 2 ** 64) / D - (_requestedAmount * 2 ** 64) / poolAmount;
        _threshold = (
            (((((weight << 128) / D) / ((denom * denom) >> 64)) * D) / (D - decay)) * totalEffectiveActivePoints()
        ) >> 64;
        //_threshold = ((((((weight * 2**128) / D) / ((denom * denom) / 2 **64)) * D) / (D - decay)) * _totalStaked()) / 2 ** 64;
        // console.log("_threshold", _threshold);
        _threshold = _threshold > minThresholdPoints ? _threshold : minThresholdPoints;
    }

    /**
     * Multiply _a by _b / 2^128.  Parameter _a should be less than or equal to
     * 2^128 and parameter _b should be less than 2^128.
     * @param _a left argument
     * @param _b right argument
     * @return _result _a * _b / 2^128
     */
    function _mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a <= TWO_128, "_a should be less than or equal to 2^128");
        require(_b < TWO_128, "_b should be less than 2^128");
        return ((_a * _b) + TWO_127) >> 128;
    }

    /**
     * Calculate (_a / 2^128)^_b * 2^128.  Parameter _a should be less than 2^128.
     *
     * @param _a left argument
     * @param _b right argument
     * @return _result (_a / 2^128)^_b * 2^128
     */
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

    /**
     * @dev Calculate conviction and store it on the proposal
     * @param _proposal Proposal
     * @param _oldStaked Amount of tokens staked on a proposal until now
     */
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
            // console.log("blockNumber == _proposal.blockLast");
            return (0, 0); // Conviction already stored
        }
        // calculateConviction and store it
        conviction = calculateConviction(
            blockNumber - _proposal.blockLast, // we assert it doesn't overflow above
            _proposal.convictionLast,
            _oldStaked
        );
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
        registryCommunity = RegistryCommunityV0_0(_registryCommunity);
        emit RegistryUpdated(_registryCommunity);
    }

    function setMinThresholdPoints(uint256 minThresholdPoints_) external onlyPoolManager(msg.sender) {
        emit MinThresholdPointsUpdated(minThresholdPoints, minThresholdPoints_);
        minThresholdPoints = minThresholdPoints_;
    }

    function setPoolParams(bytes memory data) public {
        onlyCouncilSafe();
        (
            StrategyStruct.ArbitrableConfig memory _arbitrableConfig,
            uint256 _newMinThreshold,
            uint256 _newDecay,
            uint256 _newMaxRatio,
            uint256 _newWeight
        ) = abi.decode(data, (StrategyStruct.ArbitrableConfig, uint256, uint256, uint256, uint256));

        // Update only if the new value is different

        if (
            _arbitrableConfig.tribunalSafe != arbitrableConfig.tribunalSafe
                || _arbitrableConfig.submitterCollateralAmount != arbitrableConfig.submitterCollateralAmount
                || _arbitrableConfig.challengerCollateralAmount != arbitrableConfig.challengerCollateralAmount
                || _arbitrableConfig.defaultRuling != arbitrableConfig.defaultRuling
                || _arbitrableConfig.collateralVaultTemplate != arbitrableConfig.collateralVaultTemplate
        ) {
            revert ArbitrationConfigCannotBeChangedDuringDispute();
        }

        if (_arbitrableConfig.tribunalSafe != arbitrableConfig.tribunalSafe) {
            arbitrableConfig.tribunalSafe = _arbitrableConfig.tribunalSafe;
        }

        if (_arbitrableConfig.submitterCollateralAmount != arbitrableConfig.submitterCollateralAmount) {
            arbitrableConfig.submitterCollateralAmount = _arbitrableConfig.submitterCollateralAmount;
        }

        if (_arbitrableConfig.challengerCollateralAmount != arbitrableConfig.challengerCollateralAmount) {
            arbitrableConfig.challengerCollateralAmount = _arbitrableConfig.challengerCollateralAmount;
        }

        if (_arbitrableConfig.defaultRuling != arbitrableConfig.defaultRuling) {
            arbitrableConfig.defaultRuling = _arbitrableConfig.defaultRuling;
        }

        if (_arbitrableConfig.defaultRulingTimeout != arbitrableConfig.defaultRulingTimeout) {
            arbitrableConfig.defaultRulingTimeout = _arbitrableConfig.defaultRulingTimeout;
        }

        if (_arbitrableConfig.collateralVaultTemplate != arbitrableConfig.collateralVaultTemplate) {
            arbitrableConfig.collateralVaultTemplate = _arbitrableConfig.collateralVaultTemplate;
        }

        if (_newMinThreshold != minThresholdPoints) {
            minThresholdPoints = _newMinThreshold;
        }

        if (_newDecay != decay) {
            decay = _newDecay;
        }

        if (_newMaxRatio != maxRatio) {
            maxRatio = _newMaxRatio;
        }

        if (_newWeight != weight) {
            weight = _newWeight;
        }
    }

    function setSybilScorer(address _sybilScorer) external {
        onlyCouncilSafe();
        _revertZeroAddress(_sybilScorer);
        sybilScorer = ISybilScorer(_sybilScorer);
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

        // if the lastDisputeCompletion is less than DISPUTE_COOLDOWN_SEC, we should revert
        if (proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC > block.timestamp) {
            revert DisputeCooldownNotPassed(proposalId);
        }

        bool isTimeOut = block.timestamp > proposal.disputeTimestamp + arbitrableConfig.defaultRulingTimeout;

        if (!isTimeOut && msg.sender != address(arbitrableConfig.arbitrator)) {
            revert OnlyArbitrator();
        }

        if (isTimeOut || _ruling == 0) {
            if (arbitrableConfig.defaultRuling == 0) {
                revert DefaultRulingNotSet();
            }
            if (arbitrableConfig.defaultRuling == 1) {
                proposal.proposalStatus = StrategyStruct.ProposalStatus.Active;
            }
            if (arbitrableConfig.defaultRuling == 2) {
                proposal.proposalStatus = StrategyStruct.ProposalStatus.Rejected;
            }
            CollateralVault(collateralVault).withdrawCollateral(
                proposalId, proposal.challenger, arbitrableConfig.challengerCollateralAmount
            );
            CollateralVault(collateralVault).withdrawCollateral(
                proposalId, proposal.submitter, arbitrableConfig.submitterCollateralAmount
            );
        } else if (_ruling == 1) {
            proposal.proposalStatus = StrategyStruct.ProposalStatus.Active;
            CollateralVault(collateralVault).withdrawCollateralFor(
                proposalId,
                proposal.challenger,
                address(registryCommunity.councilSafe()),
                arbitrableConfig.challengerCollateralAmount
            );
        } else if (_ruling == 2) {
            proposal.proposalStatus = StrategyStruct.ProposalStatus.Rejected;
            CollateralVault(collateralVault).withdrawCollateral(
                proposalId, proposal.challenger, arbitrableConfig.challengerCollateralAmount
            );
            CollateralVault(collateralVault).withdrawCollateralFor(
                proposalId,
                proposal.submitter,
                address(registryCommunity.councilSafe()),
                arbitrableConfig.submitterCollateralAmount / 2
            );
            CollateralVault(collateralVault).withdrawCollateralFor(
                proposalId, proposal.submitter, proposal.challenger, arbitrableConfig.submitterCollateralAmount / 2
            );
        }

        proposal.lastDisputeCompletion = block.timestamp;
        emit Ruling(arbitrableConfig.arbitrator, _disputeID, _ruling);
    }

    function setCollateralVault(address _collateralVault) external {
        onlyCouncilSafe();
        collateralVault = CollateralVault(_collateralVault);
        emit CollateralVaultUpdated(_collateralVault);
    }

    function getCollateralVault() external view returns (address) {
        return address(collateralVault);
    }

    function setArbitrationConfig(StrategyStruct.ArbitrableConfig memory _arbitrableConfig) external {
        onlyCouncilSafe();
        arbitrableConfig = _arbitrableConfig;
        emit ArbitrationConfigUpdated(address(this), _arbitrableConfig);
    }

    function registerTribunalSafe(address _tribunalSafe) external {
        onlyCouncilSafe();
        SafeArbitrator(address(arbitrableConfig.arbitrator)).registerSafe(_tribunalSafe);
        emit TribunaSafeRegistered(address(this), address(arbitrableConfig.arbitrator), _tribunalSafe);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    uint256[50] private __gap;
}
