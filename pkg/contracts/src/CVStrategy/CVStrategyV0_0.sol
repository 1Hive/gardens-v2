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
import {PassportScorer} from "../PassportScorer.sol";
import {RevertMsg} from "../RevertMsg.sol";
import {
    ProposalType,
    PointSystem,
    CreateProposal,
    ProposalStatus,
    ProposalDisputeInfo,
    Proposal,
    ProposalSupport,
    PointSystemConfig,
    ArbitrableConfig,
    CVParams,
    CVStrategyInitializeParamsV0_0,
    CVStrategyInitializeParamsV0_1
} from "./ICVStrategy.sol";

import "./ConvictionsUtils.sol";

/// @custom:oz-upgrades-from CVStrategyV0_0
contract CVStrategyV0_0 is BaseStrategyUpgradeable, IArbitrable, ERC165 {
    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/

    // error UserCannotBeZero(); // 0xd1f28288
    // error UserNotInRegistry(); //0x6a5cfb6d
    // error UserIsInactive(); // 0x5fccb67f
    // error PoolIsEmpty(); // 0xed4421ad
    // error NotImplemented(); //0xd6234725
    // error TokenCannotBeZero(); //0x596a094c
    // error TokenNotAllowed(); // 0xa29c4986
    // error AmountOverMaxRatio(); // 0x3bf5ca14
    // error AddressCannotBeZero(); //0xe622e040
    // error RegistryCannotBeZero(); // 0x5df4b1ef
    // error SupportUnderflow(uint256 _support, int256 _delta, int256 _result); // 0x3bbc7142
    // error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance); // 0xd64182fe

    // error ProposalDataIsEmpty(); //0xc5f7c4c0
    // error ProposalIdCannotBeZero(); //0xf881a10d
    // error ProposalNotActive(uint256 _proposalId); // 0x44980d8f
    // error ProposalNotInList(uint256 _proposalId); // 0xc1d17bef
    // error ProposalSupportDuplicated(uint256 _proposalId, uint256 index); //0xadebb154
    // error ConvictionUnderMinimumThreshold(); // 0xcce79308
    // error OnlyCommunityAllowed(); // 0xaf0916a2
    // error PoolAmountNotEnough(uint256 _proposalId, uint256 _requestedAmount, uint256 _poolAmount); //0x5863b0b6
    // error OnlyCouncilSafe();
    // error UserCannotExecuteAction();
    // error InsufficientCollateral(uint256 sentAmount, uint256 requiredAmount);
    // error OnlyArbitrator();
    // error ProposalNotDisputed(uint256 _proposalId);
    // error ArbitratorCannotBeZero();
    // error OnlySubmitter(address submitter, address sender);
    // Goss: Support Collateral Zero
    // error CollateralVaultCannotBeZero();
    // error DefaultRulingNotSet();
    // error DisputeCooldownNotPassed(uint256 _proposalId, uint256 _remainingSec);
    // error ProposalInvalidForAllocation(uint256 _proposalId, ProposalStatus _proposalStatus);
    // error AShouldBeUnderTwo_128();
    // error BShouldBeLessTwo_128();
    // error AShouldBeUnderOrEqTwo_128();

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
    // event RegistryUpdated(address registryCommunity);
    event ProposalDisputed(
        IArbitrator arbitrator,
        uint256 proposalId,
        uint256 disputeId,
        address challenger,
        string context,
        uint256 timestamp
    );
    // TODO: Uncomment when needed in subgraph
    // event TribunaSafeRegistered(address strategy, address arbitrator, address tribunalSafe);
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
    // event Logger(string message, uint256 value);

    /*|-------------------------------------/-------|*o
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/

    /*|--------------------------------------------|*/
    /*|                VARIABLES                   |*/
    /*|--------------------------------------------|*/

    using ConvictionsUtils for uint256;

    // Constants for fixed numbers
    // string public constant VERSION = "0.0";
    // uint256 internal constant TWO_64 = 0x10000000000000000; // 2**64 // GOSS: Unsused
    // uint256 public constant MAX_STAKED_PROPOSALS = 10; // GOSS: Unsuded
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
    function init(address _allo, address _collateralVaultTemplate, address _owner) external initializer {
        super.init(_allo, "CVStrategy", _owner);
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
        // Set councilsafe to whitelist admin
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

    // TODO: uncomment when contract size fixed with diamond
    // function supportsInterface(bytes4 interfaceId) public view  override(ERC165) returns (bool) {
    //     return interfaceId == type(IPointStrategy).interfaceId || super.supportsInterface(interfaceId);
    // }

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/
    function checkSenderIsMember(address _sender) internal view {
        // if (_sender == address(0)) {
        //     revert UserCannotBeZero();
        // }
        // if (address(registryCommunity) == address(0)) {
        //     revert RegistryCannotBeZero();
        // }
        if (!registryCommunity.isMember(_sender)) {
            // revert UserNotInRegistry();
            revert(RevertMsg.reason("UserNotInRegistry")); // @todo take commented when contract size fixed with diamond
        }
        // _;
    }

    function onlyRegistryCommunity() internal view {
        if (msg.sender != address(registryCommunity)) {
            // revert OnlyCommunityAllowed();
            revert(RevertMsg.reason("OnlyCommunityAllowed")); // @todo take commented when contract size fixed with diamond
        }
    }

    // TODO: Uncomment when contract size fixed with diamond
    // function _revertZeroAddress(address _address) internal pure  {
    //     if (_address == address(0)) revert AddressCannotBeZero();
    // }

    function onlyCouncilSafe() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
            // revert OnlyCouncilSafe();
            revert(RevertMsg.reason("OnlyCouncilSafe")); // @todo take commented when contract size fixed with diamond
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

    function _checkProposalAllocationValidity(uint256 _proposalId, int256 deltaSupport) internal view {
        Proposal storage p = proposals[_proposalId];
        if (
            deltaSupport > 0
                && (
                    p.proposalStatus == ProposalStatus.Inactive || p.proposalStatus == ProposalStatus.Cancelled
                        || p.proposalStatus == ProposalStatus.Executed || p.proposalStatus == ProposalStatus.Rejected
                )
        ) {
            // revert ProposalInvalidForAllocation(_proposalId, p.proposalStatus);
            revert(RevertMsg.reason("ProposalInvalidForAllocation")); // @todo take commented when contract size fixed with diamond
        }
    }

    function setCollateralVaultTemplate(address template) external onlyOwner {
        collateralVaultTemplate = template;
    }

    // this is called via allo.sol to register recipients
    // it can change their status all the way to Accepted, or to Pending if there are more steps
    // if there are more steps, additional functions should be added to allow the owner to check
    // this could also check attestations directly and then Accept

    function _registerRecipient(bytes memory _data, address _sender) internal override returns (address) {
        checkSenderIsMember(_sender);
        registryCommunity.onlyStrategyEnabled(address(this));
        // surpressStateMutabilityWarning++;
        _data;
        CreateProposal memory proposal = abi.decode(_data, (CreateProposal));
        // console.log("proposalType", uint256(proposalType));
        if (proposalType == ProposalType.Funding) {
            // _revertZeroAddress(proposal.beneficiary);
            //We want != instead of == no ?
            // require(proposal.beneficiary != address(0)); // TODO: Take commented when contract size fixed with diamond
            // getAllo().getPool(poolId).token;
            // if (proposal.requestedToken == address(0)) {
            //     revert TokenCannotBeZero();
            // }
            IAllo _allo = this.getAllo();
            if (proposal.requestedToken != _allo.getPool(proposal.poolId).token) {
                // console.log("::requestedToken", proposal.requestedToken);
                // console.log("::PookToken", poolToken);
                // revert TokenNotAllowed();
                revert(RevertMsg.reason("TokenNotAllowed")); // @todo take commented when contract size fixed with diamond
            }
            if (_isOverMaxRatio(proposal.amountRequested)) {
                // revert AmountOverMaxRatio();
                revert(RevertMsg.reason("AmountOverMaxRatio")); // @todo take commented when contract size fixed with diamond
            }
        }

        if (
            address(arbitrableConfigs[currentArbitrableConfigVersion].arbitrator) != address(0)
                && msg.value < arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
        ) {
            // revert InsufficientCollateral(
            //     msg.value, arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
            // );
            revert(RevertMsg.reason("InsufficientCollateral")); // @todo take commented when contract size fixed with diamond
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

    // function getDecay() external view  returns (uint256) {
    //     return cvParams.decay;
    // }

    function activatePoints() external {
        if (!_canExecuteAction(msg.sender)) {
            // revert UserCannotExecuteAction();
            revert(RevertMsg.reason("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
        }
        registryCommunity.activateMemberInStrategy(msg.sender, address(this));
        totalPointsActivated += registryCommunity.getMemberPowerInStrategy(msg.sender, address(this));
    }

    function deactivatePoints() external {
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
            // revert UserCannotExecuteAction();
            revert(RevertMsg.reason("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
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

    function decreasePower(address _member, uint256 _amountToUnstake) external returns (uint256) {
        onlyRegistryCommunity();
        //requireMemberActivatedInStrategies

        uint256 pointsToDecrease = 0;
        if (pointSystem == PointSystem.Unlimited) {
            pointsToDecrease = _amountToUnstake;
        } else if (pointSystem == PointSystem.Quadratic) {
            pointsToDecrease = decreasePowerQuadratic(_member, _amountToUnstake);
        } else if (pointSystem == PointSystem.Capped) {
            if (registryCommunity.getMemberPowerInStrategy(_member, address(this)) < pointConfig.maxAmount) {
                pointsToDecrease = _amountToUnstake;
            } else if (registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake < pointConfig.maxAmount) {
                pointsToDecrease =
                    pointConfig.maxAmount - (registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake);
            }
        }
        uint256 voterStake = totalVoterStakePct[_member];
        uint256 unusedPower = registryCommunity.getMemberPowerInStrategy(_member, address(this)) - voterStake;
        if (unusedPower < pointsToDecrease) {
            uint256 balancingRatio = ((pointsToDecrease - unusedPower) << 128) / voterStake;
            for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
                uint256 proposalId = voterStakedProposals[_member][i];
                Proposal storage proposal = proposals[proposalId];
                uint256 stakedPoints = proposal.voterStakedPoints[_member];
                uint256 newStakedPoints;
                newStakedPoints = stakedPoints - ((stakedPoints * balancingRatio + (1 << 127)) >> 128);
                uint256 oldStake = proposal.stakedAmount;
                proposal.stakedAmount -= stakedPoints - newStakedPoints;
                proposal.voterStakedPoints[_member] = newStakedPoints;
                totalStaked -= stakedPoints - newStakedPoints;
                totalVoterStakePct[_member] -= stakedPoints - newStakedPoints;
                _calculateAndSetConviction(proposal, oldStake);
                emit SupportAdded(_member, proposalId, newStakedPoints, proposal.stakedAmount, proposal.convictionLast);
            }
        }
        totalPointsActivated -= pointsToDecrease;
        emit PowerDecreased(_member, _amountToUnstake, pointsToDecrease);

        return pointsToDecrease;
    }

    function increasePowerCapped(address _member, uint256 _amountToStake) internal view returns (uint256) {
        // console.log("POINTS TO INCREASE", _amountToStake);
        uint256 memberPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
        // console.log("MEMBERPOWER", memberPower);
        if (memberPower + _amountToStake > pointConfig.maxAmount) {
            _amountToStake = pointConfig.maxAmount - memberPower;
        }
        // console.log("POINTS TO INCREASE END", _amountToStake);

        return _amountToStake;
    }

    function increasePowerQuadratic(address _member, uint256 _amountToStake) internal view returns (uint256) {
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

    function decreasePowerQuadratic(address _member, uint256 _amountToUnstake) public view returns (uint256) {
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

    // Goss: Commented because both accessible by the public field
    // function getMaxAmount() public view  returns (uint256) {
    //     return pointConfig.maxAmount;
    // }

    function getPointSystem() public view returns (PointSystem) {
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

    function _beforeAllocate(bytes memory _data, address /*_sender*/ ) internal override {
        ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        for (uint256 i = 0; i < pv.length; i++) {
            _checkProposalAllocationValidity(pv[i].proposalId, pv[i].deltaSupport);
        }
    }

    // only called via allo.sol by users to allocate to a recipient
    // this will update some data in this contract to store votes, etc.
    function _allocate(bytes memory _data, address _sender) internal override {
        checkSenderIsMember(_sender);
        ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        if (!_canExecuteAction(_sender)) {
            for (uint256 i = 0; i < pv.length; i++) {
                if (pv[i].deltaSupport > 0) {
                    // revert UserCannotExecuteAction();
                    revert(RevertMsg.reason("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
                }
            }
        }
        if (!registryCommunity.memberActivatedInStrategies(_sender, address(this))) {
            // revert UserIsInactive();
            revert(RevertMsg.reason("UserIsInactive")); // @todo take commented when contract size fixed with diamond
        }
        // ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        _check_before_addSupport(_sender, pv);
        _addSupport(_sender, pv);
    }

    // this will distribute tokens to recipients
    // most strategies will track a TOTAL amount per recipient, and a PAID amount, and pay the difference
    // this contract will need to track the amount paid already, so that it doesn't double pay
    function _distribute(address[] memory, bytes memory _data, address) internal override {
        // surpressStateMutabilityWarning++;
        if (_data.length <= 0) {
            // revert ProposalDataIsEmpty();
            revert(RevertMsg.reason("ProposalDataIsEmpty")); // @todo take commented when contract size fixed with diamond
        }

        if (getPoolAmount() <= 0) {
            // revert PoolIsEmpty();
            revert(RevertMsg.reason("PoolIsEmpty")); // @todo take commented when contract size fixed with diamond
        }

        uint256 proposalId = abi.decode(_data, (uint256));

        if (proposalType == ProposalType.Funding) {
            if (proposals[proposalId].proposalId != proposalId && proposalId != 0) {
                // @todo take commented when contract size fixed with diamond
                //  revert ProposalNotInList(proposalId);
                revert(RevertMsg.reason("ProposalNotInList"));
            }

            if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
                // revert ProposalNotActive(proposalId);
                revert(RevertMsg.reason("ProposalNotActive")); // @todo take commented when contract size fixed with diamond
            }

            if (proposals[proposalId].requestedAmount > getPoolAmount()) {
                // revert PoolAmountNotEnough(proposalId, proposals[proposalId].requestedAmount, poolAmount);
                revert(RevertMsg.reason("PoolAmountNotEnough")); // @todo take commented when contract size fixed with diamond
            }

            if (_isOverMaxRatio(proposals[proposalId].requestedAmount)) {
                // revert AmountOverMaxRatio();
                revert(RevertMsg.reason("AmountOverMaxRatio")); // @todo take commented when contract size fixed with diamond
            }

            uint256 convictionLast = updateProposalConviction(proposalId);

            uint256 threshold = ConvictionsUtils.calculateThreshold(
                proposals[proposalId].requestedAmount,
                getPoolAmount(),
                totalPointsActivated,
                cvParams.decay,
                cvParams.weight,
                cvParams.maxRatio,
                cvParams.minThresholdPoints
            );

            // <= for when threshold being zero
            if (convictionLast <= threshold && proposals[proposalId].requestedAmount > 0) {
                // revert ConvictionUnderMinimumThreshold();
                revert(RevertMsg.reason("ConvictionUnderMinimumThreshold"));
            }

            // Not needed since poolAmount = balanceOf
            // poolAmount -= proposals[proposalId].requestedAmount; // CEI

            _transferAmount(
                allo.getPool(poolId).token, proposals[proposalId].beneficiary, proposals[proposalId].requestedAmount
            );

            proposals[proposalId].proposalStatus = ProposalStatus.Executed;
            collateralVault.withdrawCollateral(
                proposalId,
                proposals[proposalId].submitter,
                arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
            );

            emit Distributed(proposalId, proposals[proposalId].beneficiary, proposals[proposalId].requestedAmount);
        } //signaling do nothing @todo write tests @todo add end date
    }

    // GOSS: NEVER CALLED
    // function canExecuteProposal(uint256 proposalId) public view  returns (bool canBeExecuted) {
    //     Proposal storage proposal = proposals[proposalId];

    //     // uint256 convictionLast = updateProposalConviction(proposalId);
    //     (uint256 convictionLast, uint256 blockNumber) =
    //         _checkBlockAndCalculateConviction(proposal, proposal.stakedAmount);

    //     if (convictionLast == 0 && blockNumber == 0) {
    //         convictionLast = proposal.convictionLast;
    //     }
    //     uint256 threshold = calculateThreshold(proposal.requestedAmount);

    //     // console.log("convictionLast", convictionLast);
    //     // console.log("threshold", threshold);
    //     canBeExecuted = convictionLast >= threshold;
    // }

    // function getPayouts(address[] memory, bytes[] memory) external pure override returns (PayoutSummary[] memory) {
    //     // surpressStateMutabilityWarning
    //     // PayoutSummary[] memory payouts = new PayoutSummary[](0);
    //     // return payouts;
    //     // revert NotImplemented();
    //     revert();
    // }

    // function _getPayout(address _recipientId, bytes memory _data)
    //     internal
    //     pure
    //     returns (PayoutSummary memory)
    // {
    //     // surpressStateMutabilityWarning;
    //     // _data;
    //     // return PayoutSummary(_recipientId, 0);
    // }

    // function _afterIncreasePoolAmount(uint256 _amount) internal {
    //     emit PoolAmountIncreased(_amount);
    // }

    // simply returns whether a allocator is valid or not, will usually be true for all

    // function _isValidAllocator(address _allocator) internal pure override returns (bool) {
    //     // surpressStateMutabilityWarning;
    // }

    function setPoolActive(bool _active) external {
        _setPoolActive(_active);
    }

    function withdraw(address _member) internal {
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
            uint256 arbitrableConfigVersion,
            uint256 protocol
        )
    {
        Proposal storage proposal = proposals[_proposalId];

        threshold = proposal.requestedAmount == 0
            ? 0
            : ConvictionsUtils.calculateThreshold(
                proposal.requestedAmount,
                getPoolAmount(),
                totalPointsActivated,
                cvParams.decay,
                cvParams.weight,
                cvParams.maxRatio,
                cvParams.minThresholdPoints
            );
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
            proposal.arbitrableConfigVersion,
            proposal.metadata.protocol
        );
    }

    // Goss: Commented because accessible through public fields
    // function getMetadata(uint256 _proposalId) external view  returns (Metadata memory) {
    //     Proposal storage proposal = proposals[_proposalId];
    //     return proposal.metadata;
    // }

    /**
     * @notice Get stake of voter `_voter` on proposal #`_proposalId`
     * @param _proposalId Proposal id
     * @param _voter Voter address
     * @return Proposal voter stake
     */
    function getProposalVoterStake(uint256 _proposalId, address _voter) external view returns (uint256) {
        return _internal_getProposalVoterStake(_proposalId, _voter);
    }

    // TODO :Goss: Commented because accessible through public fields
    function getProposalStakedAmount(uint256 _proposalId) external view returns (uint256) {
        return proposals[_proposalId].stakedAmount;
    }
    //    do a internal function to get the total voter stake

    // Goss: Commented because accessible through public fields
    // function getTotalVoterStakePct(address _voter) public view  returns (uint256) {
    //     return totalVoterStakePct[_voter];
    // }

    // Goss: Commented because accessible through public fields
    function getArbitrableConfig()
        external
        view
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
        isOverMaxRatio = cvParams.maxRatio * getPoolAmount() <= _requestedAmount * ConvictionsUtils.D;
    }

    function _check_before_addSupport(address _sender, ProposalSupport[] memory _proposalSupport) internal {
        int256 deltaSupportSum = 0;
        bool canAddSupport = _canExecuteAction(_sender);
        for (uint256 i = 0; i < _proposalSupport.length; i++) {
            // check if _proposalSupport index i exist
            if (!canAddSupport && _proposalSupport[i].deltaSupport > 0) {
                // revert UserCannotExecuteAction();
                revert(RevertMsg.reason("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
            }
            if (_proposalSupport[i].proposalId == 0) {
                //@todo: check better way to do that.
                // console.log("proposalId == 0");
                continue;
            }
            uint256 proposalId = _proposalSupport[i].proposalId;
            if (!proposalExists(proposalId)) {
                // revert ProposalNotInList(proposalId);
                revert(RevertMsg.reason("ProposalNotInList")); // @todo take commented when contract size fixed with diamond
            }
            deltaSupportSum += _proposalSupport[i].deltaSupport;
        }
        // console.log("deltaSupportSum");
        // console.logInt(deltaSupportSum);
        uint256 newTotalVotingSupport = _applyDelta(totalVoterStakePct[_sender], deltaSupportSum);
        // console.log("newTotalVotingSupport", newTotalVotingSupport);
        uint256 participantBalance = registryCommunity.getMemberPowerInStrategy(_sender, address(this));

        // console.log("participantBalance", participantBalance);
        // Check that the sum of support is not greater than the participant balance
        // console.log("newTotalVotingSupport", newTotalVotingSupport);
        // console.log("participantBalance", participantBalance);
        if (newTotalVotingSupport > participantBalance) {
            // revert NotEnoughPointsToSupport(newTotalVotingSupport, participantBalance);
            revert(RevertMsg.reason("NotEnoughPointsToSupport")); // @todo take commented when contract size fixed with diamond
        }

        totalVoterStakePct[_sender] = newTotalVotingSupport;
    }

    function _addSupport(address _sender, ProposalSupport[] memory _proposalSupport) internal {
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
                        // revert ProposalSupportDuplicated(proposalId, j);
                        break; // TODO: Uncommented when contract size fixed with diamond
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
            uint256 previousStakedAmount = proposal.stakedAmount;

            uint256 previousStakedPoints = proposal.voterStakedPoints[_sender];
            // console.log("beforeStakedPointsPct", beforeStakedPointsPct);
            // console.log("previousStakedAmount:      %s", previousStakedAmount);

            uint256 stakedPoints = _applyDelta(previousStakedPoints, delta);

            // console.log("proposalID", proposalId);
            // console.log("stakedPointsPct%", stakedPointsPct);

            proposal.voterStakedPoints[_sender] = stakedPoints;
            // console.log("proposal.voterStakedPoints[_sender]", proposal.voterStakedPoints[_sender]);

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
                // _calculateAndSetConviction(proposal, previousStakedPoints);
                _calculateAndSetConviction(proposal, previousStakedAmount);
                emit SupportAdded(_sender, proposalId, stakedPoints, proposal.stakedAmount, proposal.convictionLast);
            }
            // console.log("proposal.stakedAmount", proposal.stakedAmount);
        }
    }

    function _applyDelta(uint256 _support, int256 _delta) internal pure returns (uint256) {
        int256 result = int256(_support) + _delta;

        if (result < 0) {
            // revert SupportUnderflow(_support, _delta, result);
            revert(RevertMsg.reason("SupportUnderflow")); // @todo take commented when contract size fixed with diamond
        }
        return uint256(result);
    }

    function calculateProposalConviction(uint256 _proposalId) public view returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        return ConvictionsUtils.calculateConviction(
            block.number - proposal.blockLast, proposal.convictionLast, proposal.stakedAmount, cvParams.decay
        );
    }

    function calculateThreshold(uint256 _requestedAmount) external view returns (uint256) {
        if (_isOverMaxRatio(_requestedAmount)) {
            // revert AmountOverMaxRatio();
            revert(RevertMsg.reason("AmountOverMaxRatio")); // @todo take commented when contract size fixed with diamond
        }
        return ConvictionsUtils.calculateThreshold(
            _requestedAmount,
            getPoolAmount(),
            totalPointsActivated,
            cvParams.decay,
            cvParams.weight,
            cvParams.maxRatio,
            cvParams.minThresholdPoints
        );
    }

    // TODO: Goss commented because totalPointsActivated is public
    // function totalEffectiveActivePoints public view  returns (uint256) {
    //     return totalPointsActivated;
    // }

    /**
     * @dev Calculate conviction and store it on the proposal
     * @param _proposal Proposal
     * @param _oldStaked Amount of tokens staked on a proposal until now
     */
    function _calculateAndSetConviction(Proposal storage _proposal, uint256 _oldStaked) internal {
        (uint256 conviction, uint256 blockNumber) = _checkBlockAndCalculateConviction(_proposal, _oldStaked);
        if (conviction == 0 && blockNumber == 0) {
            return;
        }
        _proposal.blockLast = blockNumber;
        _proposal.convictionLast = conviction;
        // emit Logger("Conviction set", conviction);
    }

    function _checkBlockAndCalculateConviction(Proposal storage _proposal, uint256 _oldStaked)
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
        conviction = ConvictionsUtils.calculateConviction(
            blockNumber - _proposal.blockLast, // we assert it doesn't overflow above
            _proposal.convictionLast,
            _oldStaked,
            cvParams.decay
        );
    }

    function setPoolParams(ArbitrableConfig memory _arbitrableConfig, CVParams memory _cvParams) external {
        onlyCouncilSafe();
        _setPoolParams(_arbitrableConfig, _cvParams);
    }

    function _setPoolParams(ArbitrableConfig memory _arbitrableConfig, CVParams memory _cvParams) internal {
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
                // TODO: Restore when needed in subgraph
                // emit TribunaSafeRegistered(
                //     address(this), address(_arbitrableConfig.arbitrator), _arbitrableConfig.tribunalSafe
                // );
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

    function updateProposalConviction(uint256 proposalId) public returns (uint256) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.proposalId != proposalId) {
            // revert ProposalNotInList(proposalId);
            revert(RevertMsg.reason("ProposalNotInList")); // @todo take commented when contract size fixed with diamond
        }

        // Goss: Remove it to have access to this when disputed or proposal closed (to see the chart)
        // if (proposal.proposalStatus != ProposalStatus.Active) {
        //     revert ProposalNotActive(proposalId);
        // }
        // console.log("updateProposal: stakedAmount", proposal.stakedAmount);
        _calculateAndSetConviction(proposal, proposal.stakedAmount);
        return proposal.convictionLast;
    }

    //If we want to keep, we need a func to transfer power mapping (and more) in Registry contract -Kev
    // function setRegistryCommunity(address _registryCommunity) external onlyPoolManager(msg.sender) {
    //     registryCommunity = RegistryCommunityV0_0(_registryCommunity);
    //     emit RegistryUpdated(_registryCommunity);
    // }

    function setSybilScorer(address _sybilScorer, uint256 threshold) external {
        if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
            // revert OnlyCouncilSafe();
            revert(RevertMsg.reason("OnlyCouncilSafe")); // @todo take commented when contract size fixed with diamond
        }
        // _revertZeroAddress(_sybilScorer);
        if (_sybilScorer == address(0)) {
            revert(); // TODO: Take commented when contract size fixed with diamond
        }
        sybilScorer = ISybilScorer(_sybilScorer);
        _registerToSybilScorer(threshold);
        emit SybilScorerUpdated(_sybilScorer);
    }

    function _setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        address[] memory membersToAdd,
        address[] memory membersToRemove
    ) internal {
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
    ) internal {
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
    ) external {
        onlyCouncilSafe();
        _setPoolParams(_arbitrableConfig, _cvParams, membersToAdd, membersToRemove);
    }

    function setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        uint256 sybilScoreThreshold
    ) external {
        onlyCouncilSafe();
        _setPoolParams(_arbitrableConfig, _cvParams, sybilScoreThreshold);
    }

    function disputeProposal(uint256 proposalId, string calldata context, bytes calldata _extraData)
        external
        payable
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
        // TODO: Uncoment when contract size fixed with diamond
        // if (proposal.proposalId != proposalId) {
        //     revert ProposalNotInList(proposalId);
        // }
        if (proposal.proposalStatus != ProposalStatus.Active) {
            // revert ProposalNotActive(proposalId);
            revert(RevertMsg.reason("ProposalNotActive")); // @todo take commented when contract size fixed with diamond
        }
        if (msg.value < arbitrableConfig.challengerCollateralAmount) {
            // revert InsufficientCollateral(msg.value, arbitrableConfig.challengerCollateralAmount);
            revert(RevertMsg.reason("InsufficientCollateral")); // @todo take commented when contract size fixed with diamond
        }

        // if the lastDisputeCompletion is less than DISPUTE_COOLDOWN_SEC, we should revert
        if (
            proposal.lastDisputeCompletion != 0
                && proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC > block.timestamp
        ) {
            // revert DisputeCooldownNotPassed(
            //     proposalId, proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC - block.timestamp
            // );
            revert(RevertMsg.reason("DisputeCooldownNotPassed")); // @todo take commented when contract size fixed with diamond
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

    function rule(uint256 _disputeID, uint256 _ruling) external override {
        uint256 proposalId = disputeIdToProposalId[_disputeID];
        Proposal storage proposal = proposals[proposalId];
        ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

        // if (proposalId == 0) {
        //     revert ProposalNotInList(proposalId);
        // }
        if (proposal.proposalStatus != ProposalStatus.Disputed) {
            // revert ProposalNotDisputed(proposalId);
            revert(RevertMsg.reason("ProposalNotDisputed")); // @todo take commented when contract size fixed with diamond
        }

        bool isTimeOut = block.timestamp > proposal.disputeInfo.disputeTimestamp + arbitrableConfig.defaultRulingTimeout;

        if (!isTimeOut && msg.sender != address(arbitrableConfig.arbitrator)) {
            // revert OnlyArbitrator();
            revert(RevertMsg.reason("OnlyArbitrator")); // @todo take commented when contract size fixed with diamond
        }

        if (isTimeOut || _ruling == 0) {
            if (arbitrableConfig.defaultRuling == 0) {
                // TODO: Take commented when contract size fixed with diamond
                // revert DefaultRulingNotSet();
                revert(RevertMsg.reason("DefaultRulingNotSet"));
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

    function cancelProposal(uint256 proposalId) external {
        if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
            // revert ProposalNotActive(proposalId);
            revert(RevertMsg.reason("ProposalNotActive")); // @todo take commented when contract size fixed with diamond
        }

        if (proposals[proposalId].submitter != msg.sender) {
            // revert OnlySubmitter(proposals[proposalId].submitter, msg.sender);
            revert(RevertMsg.reason("OnlySubmitter")); // @todo take commented when contract size fixed with diamond
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

            if (members[i] != address(0)) {
                _deactivatePoints(members[i]);
            }
        }

        emit AllowlistMembersRemoved(poolId, members);
    }

    function _registerToSybilScorer(uint256 threshold) internal {
        sybilScorer.addStrategy(address(this), threshold, address(registryCommunity.councilSafe()));
    }

    uint256[50] private __gap;
}
