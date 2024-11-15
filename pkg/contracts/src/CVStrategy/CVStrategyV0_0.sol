// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {BaseStrategy, IAllo} from "allo-v2-contracts/strategies/BaseStrategy.sol";
import {RegistryCommunityV0_0} from "../RegistryCommunity/RegistryCommunityV0_0.sol";
import {ERC165, IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IArbitrator} from "../interfaces/IArbitrator.sol";
import {IArbitrable} from "../interfaces/IArbitrable.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";
import {console} from "forge-std/console.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ISybilScorer} from "../ISybilScorer.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {BaseStrategyUpgradeable} from "../BaseStrategyUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ICollateralVault} from "../interfaces/ICollateralVault.sol";

/*|--------------------------------------------|*/
/*|              STRUCTS/ENUMS                 |*/
/*|--------------------------------------------|*/

interface IPointStrategy {
    function deactivatePoints(address _member) external;

    function increasePower(address _member, uint256 _amountToStake) external returns (uint256);

    function decreasePower(address _member, uint256 _amountToUntake) external returns (uint256);

    function getPointSystem() external returns (PointSystem);
}

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

/// @custom:oz-upgrades-from CVStrategyV0_0
contract CVStrategyV0_0 is BaseStrategyUpgradeable, IArbitrable, IPointStrategy, ERC165 {
    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/

    // error UserCannotBeZero(); // 0xd1f28288
    error UserNotInRegistry(); //0x6a5cfb6d
    error UserIsInactive(); // 0x5fccb67f
    error PoolIsEmpty(); // 0xed4421ad
    error NotImplemented(); //0xd6234725
    // error TokenCannotBeZero(); //0x596a094c
    error TokenNotAllowed(); // 0xa29c4986
    error AmountOverMaxRatio(); // 0x3bf5ca14
    error AddressCannotBeZero(); //0xe622e040
    // error RegistryCannotBeZero(); // 0x5df4b1ef
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result); // 0x3bbc7142
    error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance); // 0xd64182fe

    // error ProposalDataIsEmpty(); //0xc5f7c4c0
    // error ProposalIdCannotBeZero(); //0xf881a10d
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
    // error ArbitratorCannotBeZero();
    error OnlySubmitter(address submitter, address sender);
    // Goss: Support Collateral Zero
    // error CollateralVaultCannotBeZero();
    error DefaultRulingNotSet();
    error DisputeCooldownNotPassed(uint256 _proposalId, uint256 _remainingSec);
    error ProposalInvalidForAllocation(uint256 _proposalId, ProposalStatus _proposalStatus);
    error AShouldBeUnderTwo_128();
    error BShouldBeLessTwo_128();
    error AShouldBeUnderOrEqTwo_128();

    /*|--------------------------------------------|*/
    /*|              CUSTOM EVENTS                 |*/
    /*|--------------------------------------------|*/

    event InitializedCV(uint256 poolId, CVStrategyInitializeParamsV0_0 data);
    event InitializedCV2(uint256 poolId, CVStrategyInitializeParamsV0_1 data);
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
    event AllowlistMembersRemoved(uint256 poolId, address[] members);
    event AllowlistMembersAdded(uint256 poolId, address[] members);
    event SybilScorerUpdated(address sybilScorer);

    /*|-------------------------------------/-------|*o
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/

    /*|--------------------------------------------|*/
    /*|                VARIABLES                   |*/
    /*|--------------------------------------------|*/

    // Constants for fixed numbers
    string public constant VERSION = "0.0";
    uint256 public constant D = 10000000; //10**7
    uint256 internal constant TWO_128 = 0x100000000000000000000000000000000; // 2**128
    uint256 internal constant TWO_127 = 0x80000000000000000000000000000000; // 2**127
    uint256 internal constant TWO_64 = 0x10000000000000000; // 2**64
    uint256 public constant MAX_STAKED_PROPOSALS = 10; // @todo not allow stake more than 10 proposals per user, don't count executed?
    uint256 public constant RULING_OPTIONS = 3;
    uint256 public constant DISPUTE_COOLDOWN_SEC = 2 hours;

    address internal collateralVaultTemplate;

    // uint256 variables packed together
    uint256 internal surpressStateMutabilityWarning; // used to suppress Solidity warnings
    uint256 public cloneNonce;
    uint64 public disputeCount;
    uint256 public proposalCounter;
    uint256 public currentArbitrableConfigVersion;

    uint256 public totalStaked;
    uint256 public totalPointsActivated;

    CVParams public cvParams;

    // Enum for handling proposal types
    ProposalType public proposalType;

    // Struct variables for complex data structures
    PointSystem public pointSystem;
    PointSystemConfig public pointConfig;

    // Contract reference
    RegistryCommunityV0_0 public registryCommunity;

    ICollateralVault public collateralVault;
    ISybilScorer public sybilScorer;

    // Mappings to handle relationships and staking details
    mapping(uint256 => Proposal) public proposals; // Mapping of proposal IDs to Proposal structures
    mapping(address => uint256) public totalVoterStakePct; // voter -> total staked points
    mapping(address => uint256[]) public voterStakedProposals; // voter -> proposal ids arrays
    mapping(uint256 => uint256) public disputeIdToProposalId;
    mapping(uint256 => ArbitrableConfig) public arbitrableConfigs;

    /*|--------------------------------------------|*/
    /*|              CONSTRUCTORS                  |*/
    /*|--------------------------------------------|*/
    // constructor(address _allo) BaseStrategy(address(_allo), "CVStrategy") {}
    function init(address _allo, address _collateralVaultTemplate, address owner) external virtual initializer {
        super.init(_allo, "CVStrategy", owner);
        collateralVaultTemplate = _collateralVaultTemplate;
    }

    function initialize(uint256 _poolId, bytes memory _data) external override onlyAllo {
        __BaseStrategy_init(_poolId);

        collateralVault = ICollateralVault(Clone.createClone(collateralVaultTemplate, cloneNonce++));
        collateralVault.initialize();

        CVStrategyInitializeParamsV0_1 memory ip = abi.decode(_data, (CVStrategyInitializeParamsV0_1));

        // if (ip.registryCommunity == address(0)) {
        //     revert RegistryCannotBeZero();
        // }
        //Set councilsafe to whitelist admin
        registryCommunity = RegistryCommunityV0_0(ip.registryCommunity);

        proposalType = ip.proposalType;
        pointSystem = ip.pointSystem;
        pointConfig = ip.pointConfig;
        sybilScorer = ISybilScorer(ip.sybilScorer);

        emit InitializedCV2(_poolId, ip);

        _setPoolParams(ip.arbitrableConfig, ip.cvParams, new address[](0), new address[](0));
        if (address(sybilScorer) != address(0x0)) {
            _registerToSybilScorer(ip.sybilScorerThreshold);
        }
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

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165) returns (bool) {
        return interfaceId == type(IPointStrategy).interfaceId || super.supportsInterface(interfaceId);
    }

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/
    function checkSenderIsMember(address _sender) internal view virtual {
        // if (_sender == address(0)) {
        //     revert UserCannotBeZero();
        // }
        // if (address(registryCommunity) == address(0)) {
        //     revert RegistryCannotBeZero();
        // }
        if (!registryCommunity.isMember(_sender)) {
            revert();
        }
        // _;
    }

    function onlyRegistryCommunity() internal view virtual {
        if (msg.sender != address(registryCommunity)) {
            revert OnlyCommunityAllowed();
        }
    }

    function _revertZeroAddress(address _address) internal pure virtual {
        if (_address == address(0)) revert AddressCannotBeZero();
    }

    function onlyCouncilSafe() internal view virtual {
        if (msg.sender != address(registryCommunity.councilSafe())) {
            revert OnlyCouncilSafe();
        }
    }

    function _canExecuteAction(address _user) internal view returns (bool) {
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

    function _checkProposalAllocationValidity(uint256 _proposalId, int256 deltaSupport) internal view virtual {
        Proposal storage p = proposals[_proposalId];
        if (
            deltaSupport > 0
                && (
                    p.proposalStatus == ProposalStatus.Inactive || p.proposalStatus == ProposalStatus.Cancelled
                        || p.proposalStatus == ProposalStatus.Executed || p.proposalStatus == ProposalStatus.Rejected
                )
        ) {
            revert ProposalInvalidForAllocation(_proposalId, p.proposalStatus);
        }
    }

    function setCollateralVaultTemplate(address template) external virtual onlyOwner {
        collateralVaultTemplate = template;
    }

    // this is called via allo.sol to register recipients
    // it can change their status all the way to Accepted, or to Pending if there are more steps
    // if there are more steps, additional functions should be added to allow the owner to check
    // this could also check attestations directly and then Accept

    function _registerRecipient(bytes memory _data, address _sender) internal virtual override returns (address) {
        checkSenderIsMember(_sender);
        // surpressStateMutabilityWarning++;
        _data;
        CreateProposal memory proposal = abi.decode(_data, (CreateProposal));

        // console.log("proposalType", uint256(proposalType));
        if (proposalType == ProposalType.Funding) {
            _revertZeroAddress(proposal.beneficiary);
            // getAllo().getPool(poolId).token;
            // if (proposal.requestedToken == address(0)) {
            //     revert TokenCannotBeZero();
            // }
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
            address(arbitrableConfigs[currentArbitrableConfigVersion].arbitrator) != address(0)
                && msg.value < arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
        ) {
            revert InsufficientCollateral(
                msg.value, arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
            );
        }

        uint256 proposalId = ++proposalCounter;
        Proposal storage p = proposals[proposalId];

        p.proposalId = proposalId;
        p.submitter = _sender;
        p.beneficiary = proposal.beneficiary;
        p.requestedToken = proposal.requestedToken;
        p.requestedAmount = proposal.amountRequested;
        // p.proposalType = proposal.proposalType;
        p.proposalStatus = ProposalStatus.Active;
        p.blockLast = block.number;
        p.convictionLast = 0;
        // p.agreementActionId = 0;
        p.metadata = proposal.metadata;
        p.arbitrableConfigVersion = currentArbitrableConfigVersion;
        collateralVault.depositCollateral{value: msg.value}(proposalId, p.submitter);

        emit ProposalCreated(poolId, proposalId);
        // console.log("Gaz left: ", gasleft());
        return address(uint160(proposalId));
    }

    // function getDecay() external view virtual returns (uint256) {
    //     return cvParams.decay;
    // }

    function activatePoints() external virtual {
        if (!_canExecuteAction(msg.sender)) {
            revert UserCannotExecuteAction();
        }
        registryCommunity.activateMemberInStrategy(msg.sender, address(this));
        totalPointsActivated += registryCommunity.getMemberPowerInStrategy(msg.sender, address(this));
    }

    function deactivatePoints() public virtual {
        _deactivatePoints(msg.sender);
    }

    function deactivatePoints(address _member) external virtual {
        onlyRegistryCommunity();
        _deactivatePoints(_member);
    }

    function _deactivatePoints(address _member) internal virtual {
        totalPointsActivated -= registryCommunity.getMemberPowerInStrategy(_member, address(this));
        registryCommunity.deactivateMemberInStrategy(_member, address(this));
        // remove support from all proposals
        withdraw(_member);
        emit PointsDeactivated(_member);
    }

    function increasePower(address _member, uint256 _amountToStake) external virtual returns (uint256) {
        //requireMemberActivatedInStrategies
        onlyRegistryCommunity();
        if (!_canExecuteAction(_member)) {
            revert UserCannotExecuteAction();
        }
        uint256 pointsToIncrease = 0;
        if (pointSystem == PointSystem.Unlimited) {
            pointsToIncrease = _amountToStake; // from increasePowerUnlimited(_amountToUnstake)
        } else if (pointSystem == PointSystem.Capped) {
            pointsToIncrease = increasePowerCapped(_member, _amountToStake);
        } else if (pointSystem == PointSystem.Quadratic) {
            pointsToIncrease = increasePowerQuadratic(_member, _amountToStake);
        }
        bool isActivated = registryCommunity.memberActivatedInStrategies(_member, address(this));
        if (isActivated) {
            totalPointsActivated += pointsToIncrease;
        }
        emit PowerIncreased(_member, _amountToStake, pointsToIncrease);
        return pointsToIncrease;
    }

    function decreasePower(address _member, uint256 _amountToUnstake) external virtual returns (uint256) {
        onlyRegistryCommunity();
        //requireMemberActivatedInStrategies

        uint256 pointsToDecrease = 0;
        if (pointSystem == PointSystem.Unlimited || pointSystem == PointSystem.Capped) {
            pointsToDecrease = _amountToUnstake; // from decreasePowerCappedUnlimited(_amountToUnstake)
        } else {
            pointsToDecrease = decreasePowerQuadratic(_member, _amountToUnstake);
        }
        totalPointsActivated -= pointsToDecrease;
        emit PowerDecreased(_member, _amountToUnstake, pointsToDecrease);
        return pointsToDecrease;
    }

    function increasePowerCapped(address _member, uint256 _amountToStake) internal view virtual returns (uint256) {
        // console.log("POINTS TO INCREASE", _amountToStake);
        uint256 memberPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
        // console.log("MEMBERPOWER", memberPower);
        if (memberPower + _amountToStake > pointConfig.maxAmount) {
            _amountToStake = pointConfig.maxAmount - memberPower;
        }
        // console.log("POINTS TO INCREASE END", _amountToStake);

        return _amountToStake;
    }

    function increasePowerQuadratic(address _member, uint256 _amountToStake) internal view virtual returns (uint256) {
        uint256 totalStake = registryCommunity.getMemberStakedAmount(_member) + _amountToStake;

        uint256 decimal = 18;
        try ERC20(address(registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {
            // console.log("Error getting decimal");
        }
        uint256 newTotalPoints = Math.sqrt(totalStake * 10 ** decimal);
        uint256 currentPoints = registryCommunity.getMemberPowerInStrategy(_member, address(this));

        uint256 pointsToIncrease = newTotalPoints - currentPoints;

        return pointsToIncrease;
    }

    function decreasePowerQuadratic(address _member, uint256 _amountToUnstake)
        internal
        view
        virtual
        returns (uint256)
    {
        uint256 decimal = 18;
        try ERC20(address(registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {
            // console.log("Error getting decimal");
        }
        // console.log("_amountToUnstake", _amountToUnstake);
        uint256 newTotalStake = registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake;
        // console.log("newTotalStake", newTotalStake);
        uint256 newTotalPoints = Math.sqrt(newTotalStake * 10 ** decimal);
        uint256 pointsToDecrease = registryCommunity.getMemberPowerInStrategy(_member, address(this)) - newTotalPoints;
        return pointsToDecrease;
    }

    function getMaxAmount() public view virtual returns (uint256) {
        return pointConfig.maxAmount;
    }

    function getPointSystem() public view virtual returns (PointSystem) {
        return pointSystem;
    }

    // [[[proposalId, delta],[proposalId, delta]]]
    // layout.txs -> // console.log(data)
    // data = bytes
    // function supportProposal(ProposalSupport[] memory) public pure {
    //     // // surpressStateMutabilityWarning++;
    //     revert NotImplemented();
    //     // allo().allocate(poolId, abi.encode(proposalId));
    // }

    function _beforeAllocate(bytes memory _data, address /*_sender*/ ) internal virtual override {
        ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        for (uint256 i = 0; i < pv.length; i++) {
            _checkProposalAllocationValidity(pv[i].proposalId, pv[i].deltaSupport);
        }
    }

    // only called via allo.sol by users to allocate to a recipient
    // this will update some data in this contract to store votes, etc.
    function _allocate(bytes memory _data, address _sender) internal virtual override {
        checkSenderIsMember(_sender);
        ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        if (!_canExecuteAction(_sender)) {
            for (uint256 i = 0; i < pv.length; i++) {
                if (pv[i].deltaSupport > 0) {
                    revert UserCannotExecuteAction();
                }
            }
        }
        if (!registryCommunity.memberActivatedInStrategies(_sender, address(this))) {
            revert UserIsInactive();
        }
        // ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        _check_before_addSupport(_sender, pv);
        _addSupport(_sender, pv);
    }

    // this will distribute tokens to recipients
    // most strategies will track a TOTAL amount per recipient, and a PAID amount, and pay the difference
    // this contract will need to track the amount paid already, so that it doesn't double pay
    function _distribute(address[] memory, bytes memory _data, address) internal virtual override {
        // surpressStateMutabilityWarning++;
        // if (_data.length <= 0) {
        //     revert ProposalDataIsEmpty();
        // }

        uint256 proposalId = abi.decode(_data, (uint256));

        // if (proposalId == 0) {
        //     revert ProposalIdCannotBeZero();
        // }
        Proposal storage proposal = proposals[proposalId];

        if (proposalType == ProposalType.Funding) {
            if (proposal.proposalId != proposalId) {
                revert ProposalNotInList(proposalId);
            }

            if (proposal.requestedAmount > poolAmount) {
                revert PoolAmountNotEnough(proposalId, proposal.requestedAmount, poolAmount);
            }

            if (proposal.proposalStatus != ProposalStatus.Active) {
                revert ProposalNotActive(proposalId);
            }

            uint256 convictionLast = updateProposalConviction(proposalId);
            uint256 threshold = calculateThreshold(proposal.requestedAmount);

            if (convictionLast < threshold && proposal.requestedAmount > 0) {
                revert ConvictionUnderMinimumThreshold();
            }

            IAllo.Pool memory pool = allo.getPool(poolId);

            poolAmount -= proposal.requestedAmount; // CEI

            _transferAmount(pool.token, proposal.beneficiary, proposal.requestedAmount);

            proposal.proposalStatus = ProposalStatus.Executed;
            collateralVault.withdrawCollateral(
                proposalId,
                proposal.submitter,
                arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
            );

            emit Distributed(proposalId, proposal.beneficiary, proposal.requestedAmount);
        } //signaling do nothing @todo write tests @todo add end date
    }

    function canExecuteProposal(uint256 proposalId) public view virtual returns (bool canBeExecuted) {
        Proposal storage proposal = proposals[proposalId];

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
    function _getRecipientStatus(address _recipientId) internal pure virtual override returns (Status) {
        // surpressStateMutabilityWarning;
        // return _recipientId == address(0) ? Status.Rejected : Status.Accepted;
    }

    /// @return Input the values you would send to distribute(), get the amounts each recipient in the array would receive
    function getPayouts(address[] memory, bytes[] memory) external pure override returns (PayoutSummary[] memory) {
        // surpressStateMutabilityWarning
        // PayoutSummary[] memory payouts = new PayoutSummary[](0);
        // return payouts;
        revert NotImplemented();
    }

    function _getPayout(address _recipientId, bytes memory _data)
        internal
        pure
        virtual
        override
        returns (PayoutSummary memory)
    {
        // surpressStateMutabilityWarning;
        // _data;
        // return PayoutSummary(_recipientId, 0);
    }

    function _afterIncreasePoolAmount(uint256 _amount) internal virtual override {
        emit PoolAmountIncreased(_amount);
    }

    // simply returns whether a allocator is valid or not, will usually be true for all

    function _isValidAllocator(address _allocator) internal pure virtual override returns (bool) {
        // surpressStateMutabilityWarning;
    }

    function setPoolActive(bool _active) external {
        _setPoolActive(_active);
    }

    function withdraw(address _member) internal virtual {
        // remove all proposals from the member
        for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
            uint256 proposalId = voterStakedProposals[_member][i];
            Proposal storage proposal = proposals[proposalId];
            if (proposalExists(proposalId)) {
                uint256 stakedPoints = proposal.voterStakedPoints[_member];
                proposal.voterStakedPoints[_member] = 0;
                proposal.stakedAmount -= stakedPoints;
                totalStaked -= stakedPoints;
                _calculateAndSetConviction(proposal, stakedPoints);
                emit SupportAdded(_member, proposalId, 0, proposal.stakedAmount, proposal.convictionLast);
            }
        }
        totalVoterStakePct[_member] = 0;
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
     * @return voterStakedPoints Voter staked points
     * @return arbitrableConfigVersion Proposal arbitrable config id
     */
    function getProposal(uint256 _proposalId)
        external
        view
        virtual
        returns (
            address submitter,
            address beneficiary,
            address requestedToken,
            uint256 requestedAmount,
            uint256 stakedAmount,
            ProposalStatus proposalStatus,
            uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold,
            uint256 voterStakedPoints,
            uint256 arbitrableConfigVersion
        )
    {
        Proposal storage proposal = proposals[_proposalId];

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
            proposal.voterStakedPoints[msg.sender],
            proposal.arbitrableConfigVersion
        );
    }

    function getMetadata(uint256 _proposalId) external view virtual returns (Metadata memory) {
        Proposal storage proposal = proposals[_proposalId];
        return proposal.metadata;
    }

    /**
     * @notice Get stake of voter `_voter` on proposal #`_proposalId`
     * @param _proposalId Proposal id
     * @param _voter Voter address
     * @return Proposal voter stake
     */
    function getProposalVoterStake(uint256 _proposalId, address _voter) external view virtual returns (uint256) {
        return _internal_getProposalVoterStake(_proposalId, _voter);
    }

    function getProposalStakedAmount(uint256 _proposalId) external view virtual returns (uint256) {
        return proposals[_proposalId].stakedAmount;
    }
    //    do a internal function to get the total voter stake

    function getTotalVoterStakePct(address _voter) public view virtual returns (uint256) {
        return totalVoterStakePct[_voter];
    }

    function getArbitrableConfig()
        external
        view
        virtual
        returns (
            IArbitrator arbitrator,
            address tribunalSafe,
            uint256 submitterCollateralAmount,
            uint256 challengerCollateralAmount,
            uint256 defaultRuling,
            uint256 defaultRulingTimeout
        )
    {
        return (
            arbitrableConfigs[currentArbitrableConfigVersion].arbitrator,
            arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe,
            arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount,
            arbitrableConfigs[currentArbitrableConfigVersion].challengerCollateralAmount,
            arbitrableConfigs[currentArbitrableConfigVersion].defaultRuling,
            arbitrableConfigs[currentArbitrableConfigVersion].defaultRulingTimeout
        );
    }

    function _internal_getProposalVoterStake(uint256 _proposalId, address _voter)
        internal
        view
        virtual
        returns (uint256)
    {
        return proposals[_proposalId].voterStakedPoints[_voter];
    }

    function getBasisStakedAmount() internal view virtual returns (uint256) {
        return registryCommunity.getBasisStakedAmount(); // 50 HNY = 100%
    }

    function proposalExists(uint256 _proposalID) internal view virtual returns (bool) {
        return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
    }

    function _isOverMaxRatio(uint256 _requestedAmount) internal view virtual returns (bool isOverMaxRatio) {
        isOverMaxRatio = cvParams.maxRatio * poolAmount <= _requestedAmount * D;
    }

    function _check_before_addSupport(address _sender, ProposalSupport[] memory _proposalSupport) internal {
        int256 deltaSupportSum = 0;
        bool canAddSupport = _canExecuteAction(_sender);
        for (uint256 i = 0; i < _proposalSupport.length; i++) {
            // check if _proposalSupport index i exist
            if (!canAddSupport && _proposalSupport[i].deltaSupport > 0) {
                revert UserCannotExecuteAction();
            }
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

    function _addSupport(address _sender, ProposalSupport[] memory _proposalSupport) internal virtual {
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

            Proposal storage proposal = proposals[proposalId];

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

    function _applyDelta(uint256 _support, int256 _delta) internal pure virtual returns (uint256) {
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
        virtual
        returns (uint256)
    {
        uint256 t = _timePassed;
        // atTWO_128 = 2^128 * a^t
        //        @audit-issue why that _pow require that need be less than TWO_128? why dont use 256?
        //        @audit-ok they use 2^128 as the container for the result of the _pow function
        uint256 atTWO_128 = _pow((cvParams.decay << 128) / D, t);
        return (((atTWO_128 * _lastConv) + ((_oldAmount * D * (TWO_128 - atTWO_128)) / (D - cvParams.decay))) + TWO_127)
            >> 128;
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
    function calculateThreshold(uint256 _requestedAmount) public view virtual returns (uint256 _threshold) {
        //       @todo: we should replace it with
        //        uint256 funds = fundsManager.balance(requestToken);
        if (poolAmount <= 0) {
            revert PoolIsEmpty();
        }

        if (_isOverMaxRatio(_requestedAmount)) {
            revert AmountOverMaxRatio();
        }

        uint256 denom = (cvParams.maxRatio * 2 ** 64) / D - (_requestedAmount * 2 ** 64) / poolAmount;
        _threshold = (
            (((((cvParams.weight << 128) / D) / ((denom * denom) >> 64)) * D) / (D - cvParams.decay))
                * totalEffectiveActivePoints()
        ) >> 64;

        if (totalEffectiveActivePoints() != 0) {
            uint256 thresholdOverride = (
                ((cvParams.minThresholdPoints / totalEffectiveActivePoints()) * D)
                    * (getMaxConviction(totalEffectiveActivePoints()))
            ) / 10 ** 18;
            _threshold = _threshold > thresholdOverride ? _threshold : thresholdOverride;
        }
    }

    /**
     * Multiply _a by _b / 2^128.  Parameter _a should be less than or equal to
     * 2^128 and parameter _b should be less than 2^128.
     * @param _a left argument
     * @param _b right argument
     * @return _result _a * _b / 2^128
     */
    function _mul(uint256 _a, uint256 _b) internal pure virtual returns (uint256 _result) {
        if (_a > TWO_128) {
            revert AShouldBeUnderOrEqTwo_128();
        }
        if (_b > TWO_128) {
            revert BShouldBeLessTwo_128();
        }

        return ((_a * _b) + TWO_127) >> 128;
    }

    /**
     * Calculate (_a / 2^128)^_b * 2^128.  Parameter _a should be less than 2^128.
     *
     * @param _a left argument
     * @param _b right argument
     * @return _result (_a / 2^128)^_b * 2^128
     */
    function _pow(uint256 _a, uint256 _b) internal pure virtual returns (uint256 _result) {
        if (_a >= TWO_128) {
            revert AShouldBeUnderTwo_128();
        }

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

    function totalEffectiveActivePoints() public view virtual returns (uint256) {
        return totalPointsActivated;
    }

    /**
     * @dev Calculate conviction and store it on the proposal
     * @param _proposal Proposal
     * @param _oldStaked Amount of tokens staked on a proposal until now
     */
    function _calculateAndSetConviction(Proposal storage _proposal, uint256 _oldStaked)
        internal
        virtual
        returns (uint256 conviction, uint256 blockNumber)
    {
        (conviction, blockNumber) = _checkBlockAndCalculateConviction(_proposal, _oldStaked);
        if (conviction != 0 || blockNumber != 0) {
            _proposal.blockLast = blockNumber;
            _proposal.convictionLast = conviction;
        }
    }

    function _checkBlockAndCalculateConviction(Proposal storage _proposal, uint256 _oldStaked)
        internal
        view
        virtual
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
            // TODO: Goss -> we should do this math inside the func so UI does not need to fetch latest block
            blockNumber - _proposal.blockLast, // we assert it doesn't overflow above
            _proposal.convictionLast,
            _oldStaked
        );
    }

    function setPoolParams(ArbitrableConfig memory _arbitrableConfig, CVParams memory _cvParams) external virtual {
        onlyCouncilSafe();
        _setPoolParams(_arbitrableConfig, _cvParams);
    }

    function _setPoolParams(ArbitrableConfig memory _arbitrableConfig, CVParams memory _cvParams) internal virtual {
        if (
            _arbitrableConfig.tribunalSafe != address(0) && address(_arbitrableConfig.arbitrator) != address(0)
                && (
                    _arbitrableConfig.tribunalSafe != arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe
                        || _arbitrableConfig.arbitrator != arbitrableConfigs[currentArbitrableConfigVersion].arbitrator
                        || _arbitrableConfig.submitterCollateralAmount
                            != arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
                        || _arbitrableConfig.challengerCollateralAmount
                            != arbitrableConfigs[currentArbitrableConfigVersion].challengerCollateralAmount
                        || _arbitrableConfig.defaultRuling != arbitrableConfigs[currentArbitrableConfigVersion].defaultRuling
                        || _arbitrableConfig.defaultRulingTimeout
                            != arbitrableConfigs[currentArbitrableConfigVersion].defaultRulingTimeout
                )
        ) {
            if (
                arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe != _arbitrableConfig.tribunalSafe
                    || arbitrableConfigs[currentArbitrableConfigVersion].arbitrator != _arbitrableConfig.arbitrator
            ) {
                _arbitrableConfig.arbitrator.registerSafe(_arbitrableConfig.tribunalSafe);
                emit TribunaSafeRegistered(
                    address(this), address(_arbitrableConfig.arbitrator), _arbitrableConfig.tribunalSafe
                );
            }

            currentArbitrableConfigVersion++;
            arbitrableConfigs[currentArbitrableConfigVersion] = _arbitrableConfig;

            emit ArbitrableConfigUpdated(
                currentArbitrableConfigVersion,
                _arbitrableConfig.arbitrator,
                _arbitrableConfig.tribunalSafe,
                _arbitrableConfig.submitterCollateralAmount,
                _arbitrableConfig.challengerCollateralAmount,
                _arbitrableConfig.defaultRuling,
                _arbitrableConfig.defaultRulingTimeout
            );
        }

        cvParams = _cvParams;
        emit CVParamsUpdated(_cvParams);
    }

    function updateProposalConviction(uint256 proposalId) public virtual returns (uint256 conviction) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.proposalId != proposalId) {
            revert ProposalNotInList(proposalId);
        }

        // Goss: Remove it to have access to this when disputed or proposal closed (to see the chart)
        // if (proposal.proposalStatus != ProposalStatus.Active) {
        //     revert ProposalNotActive(proposalId);
        // }

        (conviction,) = _calculateAndSetConviction(proposal, proposal.stakedAmount);
    }

    function getMaxConviction(uint256 amount) public view virtual returns (uint256) {
        return ((amount * D) / (D - cvParams.decay));
    }

    //If we want to keep, we need a func to transfer power mapping (and more) in Registry contract -Kev
    // function setRegistryCommunity(address _registryCommunity) external onlyPoolManager(msg.sender) {
    //     registryCommunity = RegistryCommunityV0_0(_registryCommunity);
    //     emit RegistryUpdated(_registryCommunity);
    // }

    function setSybilScorer(address _sybilScorer, uint256 threshold) external virtual {
        onlyCouncilSafe();
        _revertZeroAddress(_sybilScorer);
        sybilScorer = ISybilScorer(_sybilScorer);
        _registerToSybilScorer(threshold);
        emit SybilScorerUpdated(_sybilScorer);
    }

    function _setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        address[] memory membersToAdd,
        address[] memory membersToRemove
    ) internal virtual {
        _setPoolParams(_arbitrableConfig, _cvParams);
        if (membersToAdd.length > 0) {
            _addToAllowList(membersToAdd);
        }
        if (membersToRemove.length > 0) {
            _removeFromAllowList(membersToRemove);
        }
    }

    function _setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        uint256 sybilScoreThreshold
    ) internal virtual {
        _setPoolParams(_arbitrableConfig, _cvParams);
        if (address(sybilScorer) != address(0)) {
            sybilScorer.modifyThreshold(address(this), sybilScoreThreshold);
        }
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

    function setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        uint256 sybilScoreThreshold
    ) external virtual {
        onlyCouncilSafe();
        _setPoolParams(_arbitrableConfig, _cvParams, sybilScoreThreshold);
    }

    function disputeProposal(uint256 proposalId, string calldata context, bytes calldata _extraData)
        external
        payable
        virtual
        returns (uint256 disputeId)
    {
        checkSenderIsMember(msg.sender);
        Proposal storage proposal = proposals[proposalId];
        ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

        // if (address(arbitrableConfig.arbitrator) == address(0)) {
        //     revert ArbitratorCannotBeZero();
        // }
        // Goss: Support Collateral Zero
        // if (address(collateralVault) == address(0)) {
        //     revert CollateralVaultCannotBeZero();
        // }
        if (proposal.proposalId != proposalId) {
            revert ProposalNotInList(proposalId);
        }
        if (proposal.proposalStatus != ProposalStatus.Active) {
            revert ProposalNotActive(proposalId);
        }
        if (msg.value < arbitrableConfig.challengerCollateralAmount) {
            revert InsufficientCollateral(msg.value, arbitrableConfig.challengerCollateralAmount);
        }

        // if the lastDisputeCompletion is less than DISPUTE_COOLDOWN_SEC, we should revert
        if (
            proposal.lastDisputeCompletion != 0
                && proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC > block.timestamp
        ) {
            revert DisputeCooldownNotPassed(
                proposalId, proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC - block.timestamp
            );
        }

        uint256 arbitrationFee = msg.value - arbitrableConfig.challengerCollateralAmount;

        collateralVault.depositCollateral{value: arbitrableConfig.challengerCollateralAmount}(proposalId, msg.sender);

        disputeId = arbitrableConfig.arbitrator.createDispute{value: arbitrationFee}(RULING_OPTIONS, _extraData);

        proposal.proposalStatus = ProposalStatus.Disputed;
        proposal.disputeInfo.disputeId = disputeId;
        proposal.disputeInfo.disputeTimestamp = block.timestamp;
        proposal.disputeInfo.challenger = msg.sender;
        disputeIdToProposalId[disputeId] = proposalId;

        disputeCount++;

        emit ProposalDisputed(
            arbitrableConfig.arbitrator,
            proposalId,
            disputeId,
            msg.sender,
            context,
            proposal.disputeInfo.disputeTimestamp
        );
    }

    function rule(uint256 _disputeID, uint256 _ruling) external virtual override {
        uint256 proposalId = disputeIdToProposalId[_disputeID];
        Proposal storage proposal = proposals[proposalId];
        ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

        if (proposalId == 0) {
            revert ProposalNotInList(proposalId);
        }
        if (proposal.proposalStatus != ProposalStatus.Disputed) {
            revert ProposalNotDisputed(proposalId);
        }

        bool isTimeOut = block.timestamp > proposal.disputeInfo.disputeTimestamp + arbitrableConfig.defaultRulingTimeout;

        if (!isTimeOut && msg.sender != address(arbitrableConfig.arbitrator)) {
            revert OnlyArbitrator();
        }

        if (isTimeOut || _ruling == 0) {
            if (arbitrableConfig.defaultRuling == 0) {
                revert DefaultRulingNotSet();
            }
            if (arbitrableConfig.defaultRuling == 1) {
                proposal.proposalStatus = ProposalStatus.Active;
            }
            if (arbitrableConfig.defaultRuling == 2) {
                proposal.proposalStatus = ProposalStatus.Rejected;
                collateralVault.withdrawCollateral(
                    proposalId, proposal.submitter, arbitrableConfig.submitterCollateralAmount
                );
            }
            collateralVault.withdrawCollateral(
                proposalId, proposal.disputeInfo.challenger, arbitrableConfig.challengerCollateralAmount
            );
        } else if (_ruling == 1) {
            proposal.proposalStatus = ProposalStatus.Active;
            collateralVault.withdrawCollateralFor(
                proposalId,
                proposal.disputeInfo.challenger,
                address(registryCommunity.councilSafe()),
                arbitrableConfig.challengerCollateralAmount
            );
        } else if (_ruling == 2) {
            proposal.proposalStatus = ProposalStatus.Rejected;
            collateralVault.withdrawCollateral(
                proposalId, proposal.disputeInfo.challenger, arbitrableConfig.challengerCollateralAmount
            );
            collateralVault.withdrawCollateralFor(
                proposalId,
                proposal.submitter,
                address(registryCommunity.councilSafe()),
                arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount / 2
            );
            collateralVault.withdrawCollateralFor(
                proposalId,
                proposal.submitter,
                proposal.disputeInfo.challenger,
                arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount / 2
            );
        }

        disputeCount--;
        proposal.lastDisputeCompletion = block.timestamp;
        emit Ruling(arbitrableConfig.arbitrator, _disputeID, _ruling);
    }

    function cancelProposal(uint256 proposalId) external virtual {
        if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
            revert ProposalNotActive(proposalId);
        }

        if (proposals[proposalId].submitter != msg.sender) {
            revert OnlySubmitter(proposals[proposalId].submitter, msg.sender);
        }

        collateralVault.withdrawCollateral(
            proposalId,
            proposals[proposalId].submitter,
            arbitrableConfigs[proposals[proposalId].arbitrableConfigVersion].submitterCollateralAmount
        );

        proposals[proposalId].proposalStatus = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId);
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

    function _registerToSybilScorer(uint256 threshold) internal {
        sybilScorer.addStrategy(address(this), threshold, address(registryCommunity.councilSafe()));
    }

    uint256[50] private __gap;
}
