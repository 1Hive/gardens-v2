// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {BaseStrategy, IAllo} from "allo-v2-contracts/strategies/BaseStrategy.sol";
import {RegistryCommunity} from "../RegistryCommunity/RegistryCommunity.sol";
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
    CVStrategyInitializeParamsV0_1,
    CVStrategyInitializeParamsV0_2
} from "./ICVStrategy.sol";

import {ConvictionsUtils} from "./ConvictionsUtils.sol";
import {PowerManagementUtils} from "./PowerManagementUtils.sol";

import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

// Diamond Pattern imports
import {LibDiamond} from "../diamonds/libraries/LibDiamond.sol";
import {IDiamondCut} from "../diamonds/interfaces/IDiamondCut.sol";

/// @custom:oz-upgrades-from CVStrategy
contract CVStrategy is BaseStrategyUpgradeable, IArbitrable, ERC165 {
    using SuperTokenV1Library for ISuperToken;

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
    error AddressCannotBeZero(); //0xe622e040
    error RegistryCannotBeZero(); // 0x5df4b1ef
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result); // 0x3bbc7142
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
    error ProposalInvalidForAllocation(uint256 _proposalId, ProposalStatus _proposalStatus);
    error AShouldBeUnderTwo_128();
    error BShouldBeLessTwo_128();
    error AShouldBeUnderOrEqTwo_128();
    error StrategyFunctionDoesNotExist(bytes4 selector);

    /*|--------------------------------------------|*/
    /*|              CUSTOM EVENTS                 |*/
    /*|--------------------------------------------|*/

    event InitializedCV(uint256 poolId, CVStrategyInitializeParamsV0_0 data);
    event InitializedCV2(uint256 poolId, CVStrategyInitializeParamsV0_1 data);
    event InitializedCV3(uint256 poolId, CVStrategyInitializeParamsV0_2 data);
    event Distributed(uint256 proposalId, address beneficiary, uint256 amount);
    event ProposalCreated(uint256 poolId, uint256 proposalId);
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
    event SuperfluidTokenUpdated(address superfluidToken);
    event SuperfluidGDAConnected(address indexed gda, address indexed by);
    event SuperfluidGDADisconnected(address indexed gda, address indexed by);
    // event Logger(string message, uint256 value);

    /*|-------------------------------------/-------|*o
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/

    /*|--------------------------------------------|*/
    /*|           VARIABLES & CONSTANTS            |*/
    /*|--------------------------------------------|*/

    using ConvictionsUtils for uint256;

    // CVStrategy custom storage variables (Slots 106+)
    // Note: These must match CVStrategyBaseFacet storage layout exactly for diamond pattern
    address internal collateralVaultTemplate;
    uint256 internal surpressStateMutabilityWarning;
    uint256 public cloneNonce;
    uint64 public disputeCount;
    uint256 public proposalCounter;
    uint256 public currentArbitrableConfigVersion;
    uint256 public totalStaked;
    uint256 public totalPointsActivated;
    CVParams public cvParams;
    ProposalType public proposalType;
    PointSystem public pointSystem;
    PointSystemConfig public pointConfig;
    RegistryCommunity public registryCommunity;
    ICollateralVault public collateralVault;
    ISybilScorer public sybilScorer;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public totalVoterStakePct;
    mapping(address => uint256[]) public voterStakedProposals;
    mapping(uint256 => uint256) public disputeIdToProposalId;
    mapping(uint256 => ArbitrableConfig) public arbitrableConfigs;
    ISuperToken public superfluidToken;

    // Constants (also defined in CVStrategyBaseFacet for facet access)
    uint256 public constant RULING_OPTIONS = 3;
    uint256 public constant DISPUTE_COOLDOWN_SEC = 2 hours;

    /// @notice Native token address - use NATIVE from BaseStrategyUpgradeable
    address internal constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /*|--------------------------------------------|*/
    /*|              CONSTRUCTORS                  |*/
    /*|--------------------------------------------|*/
    // constructor(address _allo) BaseStrategy(address(_allo), "CVStrategy") {}
    function init(address _allo, address _collateralVaultTemplate, address _owner) external initializer {
        super.init(_allo, "CVStrategy", _owner);
        collateralVaultTemplate = _collateralVaultTemplate;
    }

    function initialize(uint256 _poolId, bytes memory _data) external override {
        _checkOnlyAllo();
        __BaseStrategy_init(_poolId);

        collateralVault = ICollateralVault(Clone.createClone(collateralVaultTemplate, cloneNonce++));
        collateralVault.initialize();

        CVStrategyInitializeParamsV0_2 memory ip = abi.decode(_data, (CVStrategyInitializeParamsV0_2));

        // if (ip.registryCommunity == address(0)) {
        //     revert RegistryCannotBeZero();
        // }
        // Set councilsafe to whitelist admin
        registryCommunity = RegistryCommunity(ip.registryCommunity);

        proposalType = ip.proposalType;
        pointSystem = ip.pointSystem;
        pointConfig = ip.pointConfig;
        sybilScorer = ISybilScorer(ip.sybilScorer);
        superfluidToken = ISuperToken(ip.superfluidToken);

        emit InitializedCV3(_poolId, ip);

        // Initialize pool params (simplified version of _setPoolParams for initialization only)
        if (ip.arbitrableConfig.tribunalSafe != address(0) && address(ip.arbitrableConfig.arbitrator) != address(0)) {
            ip.arbitrableConfig.arbitrator.registerSafe(ip.arbitrableConfig.tribunalSafe);
            currentArbitrableConfigVersion++;
            arbitrableConfigs[currentArbitrableConfigVersion] = ip.arbitrableConfig;
            emit ArbitrableConfigUpdated(
                currentArbitrableConfigVersion,
                ip.arbitrableConfig.arbitrator,
                ip.arbitrableConfig.tribunalSafe,
                ip.arbitrableConfig.submitterCollateralAmount,
                ip.arbitrableConfig.challengerCollateralAmount,
                ip.arbitrableConfig.defaultRuling,
                ip.arbitrableConfig.defaultRulingTimeout
            );
        }
        if (
            !(
                ip.cvParams.decay == 0 && ip.cvParams.weight == 0 && ip.cvParams.maxRatio == 0
                    && ip.cvParams.minThresholdPoints == 0
            )
        ) {
            cvParams = ip.cvParams;
            emit CVParamsUpdated(ip.cvParams);
        }
        if (address(sybilScorer) != address(0x0)) {
            _registerToSybilScorer(ip.sybilScorerThreshold);
        }
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
        return interfaceId == type(IArbitrable).interfaceId || super.supportsInterface(interfaceId);
    }

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/
    function checkSenderIsMember(address _sender) internal {
        // if (_sender == address(0)) {
        //     revert UserCannotBeZero();
        // }
        // if (address(registryCommunity) == address(0)) {
        //     revert RegistryCannotBeZero();
        // }
        if (!registryCommunity.isMember(_sender)) {
            // revert UserNotInRegistry();
            revert(); // @todo take commented when contract size fixed with diamond
        }
        // _;
    }

    function onlyRegistryCommunity() internal view {
        if (msg.sender != address(registryCommunity)) {
            // revert OnlyCommunityAllowed();
            revert(); // @todo take commented when contract size fixed with diamond
        }
    }

    // TODO: Uncomment when contract size fixed with diamond
    // function _revertZeroAddress(address _address) internal pure  {
    //     if (_address == address(0)) revert AddressCannotBeZero();
    // }

    function onlyCouncilSafe() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
            // revert OnlyCouncilSafe();
            revert(); // @todo take commented when contract size fixed with diamond
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
            revert(); // @todo take commented when contract size fixed with diamond
        }
    }

    function onlyCouncilSafeOrMember() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && false == _canExecuteAction(msg.sender)) {
            // revert OnlyCouncilSafeOrMember();
            revert(); // @todo take commented when contract size fixed with diamond
        }
    }

    function setCollateralVaultTemplate(address template) external {
        _checkOwner();
        collateralVaultTemplate = template;
    }

    // this is called via allo.sol to register recipients
    // it can change their status all the way to Accepted, or to Pending if there are more steps
    // if there are more steps, additional functions should be added to allow the owner to check
    // this could also check attestations directly and then Accept

    // registerRecipient removed - now in ProposalManagementFacet
    // Stub needed for IStrategy interface - delegates to facet
    function registerRecipient(bytes memory _data, address _sender) external payable returns (address) {
        _delegateToFacet();
    }

    function activatePoints() external {
        if (!_canExecuteAction(msg.sender)) {
            // revert UserCannotExecuteAction();
            // revert(("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
            revert();
        }
        registryCommunity.activateMemberInStrategy(msg.sender, address(this));
        totalPointsActivated += registryCommunity.getMemberPowerInStrategy(msg.sender, address(this));
    }

    // deactivatePoints (both versions) and _deactivatePoints removed - now in PowerManagementFacet
    // Stub needed for tests to call - delegates to facet
    function deactivatePoints() external {
        _delegateToFacet();
    }

    function increasePower(address _member, uint256 _amountToStake) external returns (uint256) {
        //requireMemberActivatedInStrategies
        onlyRegistryCommunity();
        if (!_canExecuteAction(_member)) {
            // revert UserCannotExecuteAction();
            // revert(("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
            revert();
        }
        uint256 pointsToIncrease = PowerManagementUtils.increasePower(
            registryCommunity, _member, _amountToStake, pointSystem, pointConfig.maxAmount
        );

        bool isActivated = registryCommunity.memberActivatedInStrategies(_member, address(this));
        if (isActivated) {
            totalPointsActivated += pointsToIncrease;
        }
        emit PowerIncreased(_member, _amountToStake, pointsToIncrease);
        return pointsToIncrease;
    }

    // decreasePower removed - now in PowerManagementFacet
    // Stub needed for RegistryCommunity to call - delegates to facet
    function decreasePower(address _member, uint256 _amountToUnstake) external returns (uint256) {
        _delegateToFacet();
    }

    // deactivatePoints(address) removed - now in PowerManagementFacet
    // Stub needed for RegistryCommunity to call - delegates to facet
    function deactivatePoints(address _member) external {
        _delegateToFacet();
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

    // allocate removed - now in AllocationFacet
    // Stub needed for IStrategy interface - delegates to facet
    function allocate(bytes memory _data, address _sender) external payable {
        _delegateToFacet();
    }

    // distribute removed - now in AllocationFacet
    // Stub needed for IStrategy interface - delegates to facet
    function distribute(address[] memory, bytes memory, address) external override {
        _delegateToFacet();
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

    // withdraw removed - now in PowerManagementFacet

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

    function getBasisStakedAmount() internal returns (uint256) {
        return registryCommunity.getBasisStakedAmount(); // 50 HNY = 100%
    }

    function proposalExists(uint256 _proposalID) internal view returns (bool) {
        return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
    }

    function _isOverMaxRatio(uint256 _requestedAmount) internal view returns (bool isOverMaxRatio) {
        isOverMaxRatio = cvParams.maxRatio * getPoolAmount() <= _requestedAmount * ConvictionsUtils.D;
    }

    function _applyDelta(uint256 _support, int256 _delta) internal pure returns (uint256) {
        // casting to 'int256' is safe because we're converting unsigned to signed for arithmetic
        // forge-lint: disable-next-line(unsafe-typecast)
        int256 result = int256(_support) + _delta;

        if (result < 0) {
            // revert SupportUnderflow(_support, _delta, result);
            // revert(("SupportUnderflow")); // @todo take commented when contract size fixed with diamond
            revert();
        }
        // casting to 'uint256' is safe because we checked result >= 0
        // forge-lint: disable-next-line(unsafe-typecast)
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
            // revert(("AmountOverMaxRatio")); // @todo take commented when contract size fixed with diamond
            revert();
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

    // _setPoolParams removed - now in AdminFacet

    function updateProposalConviction(uint256 proposalId) public returns (uint256) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.proposalId != proposalId) {
            // revert ProposalNotInList(proposalId);
            // revert(("ProposalNotInList")); // @todo take commented when contract size fixed with diamond
            revert();
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
    //     registryCommunity = RegistryCommunity(_registryCommunity);
    //     emit RegistryUpdated(_registryCommunity);
    // }

    // Goss: Commented to save space because not used
    // function setSybilScorer(address _sybilScorer, uint256 threshold) external {
    //     if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
    //         // revert OnlyCouncilSafe();
    //         // revert(("OnlyCouncilSafe")); // @todo take commented when contract size fixed with diamond
    //         revert();
    //     }
    //     // _revertZeroAddress(_sybilScorer);
    //     if (_sybilScorer == address(0)) {
    //         revert(); // TODO: Take commented when contract size fixed with diamond
    //     }
    //     sybilScorer = ISybilScorer(_sybilScorer);
    //     _registerToSybilScorer(threshold);
    //     emit SybilScorerUpdated(_sybilScorer);
    // }

    // setPoolParams removed - now in AdminFacet
    // Stub needed for tests to call - delegates to facet
    function setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        uint256 _sybilScoreThreshold,
        address[] memory _membersToAdd,
        address[] memory _membersToRemove,
        address _superfluidToken
    ) external {
        _delegateToFacet();
    }

    // connectSuperfluidGDA and disconnectSuperfluidGDA removed - now in AdminFacet
    // Stubs needed for tests to call - delegates to facet
    function connectSuperfluidGDA(address) external {
        _delegateToFacet();
    }

    function disconnectSuperfluidGDA(address) external {
        _delegateToFacet();
    }

    // disputeProposal and rule removed - now in DisputeFacet
    // Stub needed for tests to call - delegates to facet
    // Sig: 0xb41596ec
    function disputeProposal(uint256, string calldata, bytes calldata) external payable returns (uint256) {
        _delegateToFacet();
    }

    // Stub to satisfy IArbitrable interface - delegates to facet
    // Sig: 0x311a6c56
    function rule(uint256, uint256) external virtual override {
        _delegateToFacet();
    }

    // cancelProposal removed - now in ProposalManagementFacet
    // Stub needed for frontend to call - delegates to facet
    // Sig: 0xe0a8f6f5
    function cancelProposal(uint256) external {
        _delegateToFacet();
    }

    function editProposal(uint256, Metadata memory, address, uint256) external {
        _delegateToFacet();
    }

    // _addToAllowList and _removeFromAllowList removed - now in AdminFacet

    function _registerToSybilScorer(uint256 threshold) internal {
        sybilScorer.addStrategy(address(this), threshold, address(registryCommunity.councilSafe()));
    }

    /// @notice Getter for the 'poolAmount'.
    /// @return The balance of the pool
    function getPoolAmount() public view override returns (uint256) {
        address token = allo.getPool(poolId).token;

        if (token == NATIVE_TOKEN) {
            return address(this).balance;
        }

        uint256 base = ERC20(token).balanceOf(address(this));
        uint256 sf = address(superfluidToken) == address(0) ? 0 : superfluidToken.balanceOf(address(this));

        uint8 d = ERC20(token).decimals();
        if (d < 18) {
            sf /= 10 ** (18 - d); // downscale 18 -> d
        } else if (d > 18) {
            sf *= 10 ** (d - 18); // upscale 18 -> d  (unlikely)
        }
        return base + sf;
    }

    /// @notice Helper function to delegate to facet using LibDiamond
    /// @dev Used by stub functions to delegate to their respective facets
    /// @dev This function never returns - it either reverts or returns via assembly
    function _delegateToFacet() private {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;

        assembly {
            ds.slot := position
        }

        address facet = ds.facetAddressAndSelectorPosition[msg.sig].facetAddress;
        if (facet == address(0)) {
            revert StrategyFunctionDoesNotExist(msg.sig);
        }

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    /// @notice Manage facets using diamond cut (owner only)
    /// @param _diamondCut Array of FacetCut structs defining facet changes
    /// @param _init Address of contract to execute with delegatecall (can be address(0))
    /// @param _calldata Function call data to execute on _init address
    function diamondCut(IDiamondCut.FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata)
        external
    {
        _checkOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }

    /// @notice Fallback function delegates calls to facets based on function selector
    /// @dev Uses Diamond storage to find facet address for the called function
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;

        assembly {
            ds.slot := position
        }

        address facet = ds.facetAddressAndSelectorPosition[msg.sig].facetAddress;

        if (facet == address(0)) {
            revert StrategyFunctionDoesNotExist(msg.sig);
        }

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}

    // Note: Storage gap is inherited from CVStrategyStorage base contract

    uint256[49] private __gap;
}
