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
    CVStrategyInitializeParamsV0_2,
    CVStrategyInitializeParamsV0_3
} from "./ICVStrategy.sol";

import {ConvictionsUtils} from "./ConvictionsUtils.sol";
import {PowerManagementUtils} from "./PowerManagementUtils.sol";

import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

import "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import "@superfluid-finance/ethereum-contracts/contracts/utils/GDAv1Forwarder.sol";
import {
    PoolConfig
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/IGeneralDistributionAgreementV1.sol";

// Diamond Pattern imports
import {LibDiamond} from "../diamonds/libraries/LibDiamond.sol";
import {IDiamondCut} from "../diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../diamonds/interfaces/IDiamondLoupe.sol";
import {IVotingPowerRegistry} from "../interfaces/IVotingPowerRegistry.sol";
import {IPauseController} from "../interfaces/IPauseController.sol";
import {LibPauseStorage} from "../pausing/LibPauseStorage.sol";

/// @custom:oz-upgrades-from CVStrategy
contract CVStrategy is BaseStrategyUpgradeable, IArbitrable, ERC165 {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/

    error UserCannotBeZero(address user); // 0x538cffa3
    error UserNotInRegistry(address user, address registry); //0x95788c82
    error UserIsInactive(address user); // 0x9edf9ee6
    error PoolIsEmpty(uint256 poolAmount); // 0xf458e27c
    error NotImplemented(bytes4 selector); //0xc79348a6
    error TokenCannotBeZero(address token); //0x61a8cdce
    error TokenNotAllowed(address token); // 0x94403b70
    error AmountOverMaxRatio(uint256 requestedAmount, uint256 maxAllowed, uint256 poolAmount); // 0x3e4bb863
    error AddressCannotBeZero(address input); //0x084c41ef
    error RegistryCannotBeZero(address registry); // 0x22947713
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result); // 0x3bbc7142
    error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance); // 0xd64182fe

    error ProposalDataIsEmpty(); //0xc5f7c4c0
    error ProposalIdCannotBeZero(); //0xf881a10d
    error ProposalNotActive(uint256 _proposalId); // 0x44980d8f
    error ProposalNotInList(uint256 _proposalId); // 0xc1d17bef
    error ProposalSupportDuplicated(uint256 _proposalId, uint256 index); //0xadebb154
    error ConvictionUnderMinimumThreshold(); // 0xcce79308
    error OnlyCommunityAllowed(address sender, address registryCommunity); // 0x5f4e6f2c
    error PoolAmountNotEnough(uint256 _proposalId, uint256 _requestedAmount, uint256 _poolAmount); //0x5863b0b6
    error OnlyCouncilSafe(address sender, address councilSafe, address owner); // 0xe1b9c469
    error UserCannotExecuteAction(address sender); // 0xeee56a60
    error InsufficientCollateral(uint256 sentAmount, uint256 requiredAmount); // 0xb07e3bc4
    error OnlyArbitrator(address sender, address arbitrator); // 0xef429d5e
    error ProposalNotDisputed(uint256 _proposalId); // 0x96023952
    error ArbitratorCannotBeZero(); // 0x6c291fd3
    // Goss: Support Collateral Zero
    // error CollateralVaultCannotBeZero();
    error DefaultRulingNotSet(); // 0xdd466dd0
    error DisputeCooldownNotPassed(uint256 _proposalId, uint256 _remainingSec); // 0x8d2f6c31
    error ProposalInvalidForAllocation(uint256 _proposalId, ProposalStatus _proposalStatus); // 0x94d57ead
    error AShouldBeUnderTwo_128(); // 0x3e668d03
    error BShouldBeLessTwo_128(); // 0x70b7a2d9
    error AShouldBeUnderOrEqTwo_128(); // 0xff5b3cef
    error StrategyFunctionDoesNotExist(bytes4 selector); // 0x66bda40a
    error RegistryCommunityCannotBeZero(address registry); // 0x2199ab77
    error OnlyCouncilSafeOrMember(address sender, address councilSafe); // 0xfa33758e
    error StrategyPaused(address controller);
    error StrategySelectorPaused(bytes4 selector, address controller);
    error SuperfluidPoolCreationFailed();

    /*|--------------------------------------------|*/
    /*|              CUSTOM EVENTS                 |*/
    /*|--------------------------------------------|*/

    event InitializedCV(uint256 poolId, CVStrategyInitializeParamsV0_0 data);
    event InitializedCV2(uint256 poolId, CVStrategyInitializeParamsV0_1 data);
    event InitializedCV3(uint256 poolId, CVStrategyInitializeParamsV0_2 data);
    event InitializedCV4(uint256 poolId, CVStrategyInitializeParamsV0_3 data);
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
    event SuperfluidPoolCreated(address indexed gda, address indexed superfluidToken, uint256 maxStreamingRate);
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
    // slither-disable-next-line uninitialized-state
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

    // Superfluid
    ISuperToken public superfluidToken;
    ISuperfluidPool public superfluidGDA; // Streaming pool only
    uint256 public streamingRatePerSecond; // Streaming pool only

    IVotingPowerRegistry public votingPowerRegistry;
    uint256[46] private __gap;

    // Constants (also defined in CVStrategyBaseFacet for facet access)
    uint256 public constant RULING_OPTIONS = 3;
    uint256 public constant DISPUTE_COOLDOWN_SEC = 2 hours;

    /// @notice Native token address - use NATIVE from BaseStrategyUpgradeable
    address internal constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /*|--------------------------------------------|*/
    /*|              CONSTRUCTORS                  |*/
    /*|--------------------------------------------|*/
    // constructor(address _allo) BaseStrategy(address(_allo), "CVStrategy") {}
    // Sig: 0x184b9559
    function init(address _allo, address _collateralVaultTemplate, address _owner) external initializer {
        super.init(_allo, "CVStrategy", _owner);
        LibDiamond.setContractOwner(_owner);
        collateralVaultTemplate = _collateralVaultTemplate;
    }

    // Sig: 0xedd146cc
    function initialize(uint256 _poolId, bytes memory _data) external override {
        _checkOnlyAllo();
        __BaseStrategy_init(_poolId);

        collateralVault = ICollateralVault(Clone.createClone(collateralVaultTemplate, cloneNonce++));
        collateralVault.initialize();

        CVStrategyInitializeParamsV0_3 memory ip = abi.decode(_data, (CVStrategyInitializeParamsV0_3));

        // if (ip.registryCommunity == address(0)) {
        //     revert RegistryCannotBeZero();
        // }
        // Set councilsafe to whitelist admin
        registryCommunity = RegistryCommunity(ip.registryCommunity);
        votingPowerRegistry = ip.votingPowerRegistry == address(0)
            ? IVotingPowerRegistry(ip.registryCommunity)
            : IVotingPowerRegistry(ip.votingPowerRegistry);

        proposalType = ip.proposalType;
        pointSystem = ip.pointSystem;
        pointConfig = ip.pointConfig;
        sybilScorer = ISybilScorer(ip.sybilScorer);
        superfluidToken = ISuperToken(ip.superfluidToken);
        streamingRatePerSecond = ip.streamingRatePerSecond;

        emit InitializedCV4(_poolId, ip);

        if (ip.proposalType == ProposalType.Streaming) {
            if (address(superfluidToken) == address(0) || streamingRatePerSecond == 0) {
                revert TokenCannotBeZero(address(superfluidToken));
            }

            (bool success, ISuperfluidPool pool) = GDAv1Forwarder(0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08)
                .createPool(
                    ISuperfluidToken(superfluidToken),
                    address(this), // pool admin = your StreamingPool contract
                    PoolConfig({transferabilityForUnitsOwner: false, distributionFromAnyAddress: false})
                );
            if (!success || address(pool) == address(0)) {
                revert SuperfluidPoolCreationFailed();
            }

            superfluidGDA = pool;
        }

        emit SuperfluidPoolCreated(address(superfluidGDA), address(superfluidToken), streamingRatePerSecond);

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
        if (!(ip.cvParams.decay == 0 && ip.cvParams.weight == 0 && ip.cvParams.maxRatio == 0
                    && ip.cvParams.minThresholdPoints == 0)) {
            cvParams = ip.cvParams;
            emit CVParamsUpdated(ip.cvParams);
        }
        if (address(sybilScorer) != address(0x0)) {
            _registerToSybilScorer(ip.sybilScorerThreshold);
        }
    }

    function _initializeFacets() internal {}

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/
    function checkSenderIsMember(address _sender) internal {
        if (_sender == address(0)) {
            revert UserCannotBeZero(_sender);
        }
        if (address(registryCommunity) == address(0)) {
            revert RegistryCannotBeZero(address(registryCommunity));
        }
        if (!votingPowerRegistry.isMember(_sender)) {
            revert UserNotInRegistry(_sender, address(registryCommunity));
        }
    }

    function onlyRegistryCommunity() internal view {
        if (msg.sender != address(registryCommunity)) {
            revert OnlyCommunityAllowed(msg.sender, address(registryCommunity));
        }
    }

    function _revertZeroAddress(address _address) internal pure {
        if (_address == address(0)) revert AddressCannotBeZero(_address);
    }

    function onlyCouncilSafe() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
            revert OnlyCouncilSafe(msg.sender, address(registryCommunity.councilSafe()), owner());
        }
    }

    function _checkOwner() internal view override {
        address directOwner = proxyOwner();
        address resolvedOwner = owner();
        if (msg.sender != directOwner && msg.sender != resolvedOwner) revert("Ownable: caller is not the owner");
    }

    function _canExecuteAction(address _user) internal view returns (bool) {
        if (address(sybilScorer) != address(0)) {
            return sybilScorer.canExecuteAction(_user, address(this));
        }
        // Custom point system with external registry: NFT ownership IS the gate
        if (pointSystem == PointSystem.Custom && address(votingPowerRegistry) != address(registryCommunity)) {
            return votingPowerRegistry.isMember(_user);
        }
        // Default: allowlist-based gating
        bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
        return registryCommunity.hasRole(allowlistRole, address(0)) || registryCommunity.hasRole(allowlistRole, _user);
    }

    function _checkProposalAllocationValidity(uint256 _proposalId, int256 deltaSupport) internal view {
        Proposal storage p = proposals[_proposalId];
        if (
            deltaSupport > 0
                && (p.proposalStatus == ProposalStatus.Inactive
                    || p.proposalStatus == ProposalStatus.Cancelled
                    || p.proposalStatus == ProposalStatus.Executed
                    || p.proposalStatus == ProposalStatus.Rejected)
        ) revert ProposalInvalidForAllocation(_proposalId, p.proposalStatus);
    }

    function onlyCouncilSafeOrMember() internal view {
        if (msg.sender != address(registryCommunity.councilSafe()) && false == _canExecuteAction(msg.sender)) {
            revert OnlyCouncilSafeOrMember(msg.sender, address(registryCommunity.councilSafe()));
        }
    }

    // Sig: 0xb0d3713a
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
    // Sig: 0x2bbe0cae
    function registerRecipient(bytes memory, address) external payable returns (address) {
        _delegateToFacet();
    }

    // Sig: 0x814516ad
    function activatePoints() external {
        _delegateToFacet();
    }

    // Sig: 0x1ddf1e23
    function deactivatePoints() external {
        _delegateToFacet();
    }

    // Sig: 0x782aadff
    function increasePower(address, uint256) external returns (uint256) {
        _delegateToFacet();
    }

    // Sig: 0x2ed04b2b
    function decreasePower(address, uint256) external returns (uint256) {
        _delegateToFacet();
    }

    // Sig: 0x6453d9c4
    function deactivatePoints(address) external {
        _delegateToFacet();
    }

    // Sig: 0x0ba95909
    function getMaxAmount() public view returns (uint256) {
        return pointConfig.maxAmount;
    }

    // Sig: 0xc3292171
    function getPointSystem() public view returns (PointSystem) {
        return pointSystem;
    }

    // [[[proposalId, delta],[proposalId, delta]]]
    // data = bytes
    // function supportProposal(ProposalSupport[] memory) public pure {
    //     // // surpressStateMutabilityWarning++;
    //     revert NotImplemented();
    //     // allo().allocate(poolId, abi.encode(proposalId));
    // }

    // allocate removed - now in AllocationFacet
    // Stub needed for IStrategy interface - delegates to facet
    // Sig: 0xef2920fc
    function allocate(bytes memory, address) external payable {
        _delegateToFacet();
    }

    // distribute removed - now in AllocationFacet
    // Stub needed for IStrategy interface - delegates to facet
    // Sig: 0x0a6f0ee9
    function distribute(address[] memory, bytes memory, address) external override {
        _delegateToFacet();
    }

    // Sig: 0xb5f620ce
    function setPoolActive(bool _active) external {
        _setPoolActive(_active);
    }

    // withdraw removed - now in PowerManagementFacet

    // Sig: 0xc7f758a8
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

        if (proposal.requestedAmount == 0) {
            threshold = 0;
        } else {
            uint256 poolAmount = getPoolAmount();
            uint256 maxAllowed = Math.mulDiv(poolAmount, cvParams.maxRatio, ConvictionsUtils.D);

            if (maxAllowed == 0 || proposal.requestedAmount > maxAllowed) {
                threshold = 0;
            } else {
                threshold = ConvictionsUtils.calculateThreshold(
                    proposal.requestedAmount,
                    poolAmount,
                    totalPointsActivated,
                    cvParams.decay,
                    cvParams.weight,
                    cvParams.maxRatio,
                    cvParams.minThresholdPoints
                );
            }
        }
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

    // Sig: 0xe0dd2c38
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
    // Sig: 0xdc96ff2d
    function getProposalStakedAmount(uint256 _proposalId) external view returns (uint256) {
        return proposals[_proposalId].stakedAmount;
    }

    //    do a internal function to get the total voter stake

    // Goss: Commented because accessible through public fields
    // function getTotalVoterStakePct(address _voter) public view  returns (uint256) {
    //     return totalVoterStakePct[_voter];
    // }

    // Goss: Commented because accessible through public fields
    // Sig: 0x059351cd
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
            revert SupportUnderflow(_support, _delta, result);
        }
        // casting to 'uint256' is safe because we checked result >= 0
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(result);
    }

    // Sig: 0x60b0645a
    function calculateProposalConviction(uint256 _proposalId) public view returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        return ConvictionsUtils.calculateConviction(
            block.number - proposal.blockLast, proposal.convictionLast, proposal.stakedAmount, cvParams.decay
        );
    }

    // Sig: 0x59a5db8b
    function calculateThreshold(uint256 _requestedAmount) external view returns (uint256) {
        uint256 poolAmount = getPoolAmount();
        uint256 maxAllowed = (cvParams.maxRatio * poolAmount) / ConvictionsUtils.D;

        // Goss: Removed to allow threshold calculation even if over max ratio
        // if (_requestedAmount * ConvictionsUtils.D > cvParams.maxRatio * poolAmount) {
        //     revert AmountOverMaxRatio(_requestedAmount, maxAllowed, poolAmount);
        // }

        return ConvictionsUtils.calculateThreshold(
            _requestedAmount,
            poolAmount,
            totalPointsActivated,
            cvParams.decay,
            cvParams.weight,
            cvParams.maxRatio,
            cvParams.minThresholdPoints
        );
    }

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
            return (0, 0); // Conviction already stored
        }
        // calculateConviction and store it
        conviction = ConvictionsUtils.calculateConviction(
            blockNumber - _proposal.blockLast, _proposal.convictionLast, _oldStaked, cvParams.decay
        );
    }

    // _setPoolParams removed - now in AdminFacet

    // Sig: 0x1aa91a9e
    function updateProposalConviction(uint256 proposalId) public returns (uint256) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.proposalId != proposalId) revert ProposalNotInList(proposalId);

        // Goss: Remove it to have access to this when disputed or proposal closed (to see the chart)
        // if (proposal.proposalStatus != ProposalStatus.Active) {
        //     revert ProposalNotActive(proposalId);
        // }
        _calculateAndSetConviction(proposal, proposal.stakedAmount);
        return proposal.convictionLast;
    }

    //If we want to keep, we need a func to transfer power mapping (and more) in Registry contract -Kev
    // function setRegistryCommunity(address _registryCommunity) external onlyPoolManager(msg.sender) {
    //     registryCommunity = RegistryCommunity(_registryCommunity);
    //     emit RegistryUpdated(_registryCommunity);
    // }

    // Sig: 0x3864d366
    function setSybilScorer(address _sybilScorer, uint256 threshold) external {
        if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
            revert OnlyCouncilSafe(msg.sender, address(registryCommunity.councilSafe()), owner());
        }
        _revertZeroAddress(_sybilScorer);

        sybilScorer = ISybilScorer(_sybilScorer);
        _registerToSybilScorer(threshold);
        emit SybilScorerUpdated(_sybilScorer);
    }

    // setPoolParams removed - now in AdminFacet
    // Stub needed for tests to call - delegates to facet
    // Sig: 0xd5b7cc54
    function setPoolParams(
        ArbitrableConfig memory,
        CVParams memory,
        uint256,
        address[] memory,
        address[] memory,
        address
    ) external {
        _delegateToFacet();
    }

    // Sig: overloaded setPoolParams with streamingRatePerSecond
    function setPoolParams(
        ArbitrableConfig memory,
        CVParams memory,
        uint256,
        address[] memory,
        address[] memory,
        address,
        uint256
    ) external {
        _delegateToFacet();
    }

    // connectSuperfluidGDA and disconnectSuperfluidGDA removed - now in AdminFacet
    // Stubs needed for tests to call - delegates to facet
    // Sig: 0x924e6704
    function connectSuperfluidGDA(address) external {
        _delegateToFacet();
    }

    // Sig: 0xc69271ec
    function disconnectSuperfluidGDA(address) external {
        _delegateToFacet();
    }

    // disputeProposal and rule removed - now in DisputeFacet
    // Stub needed for tests to call - delegates to facet
    // slither-disable-next-line incorrect-return
    // Sig: 0xb41596ec
    function disputeProposal(uint256 proposalId, string calldata context, bytes calldata _extraData)
        external
        payable
        returns (uint256)
    {
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

    // Sig: 0x141e3b38
    function editProposal(uint256, Metadata memory, address, uint256) external {
        _delegateToFacet();
    }

    // Sig: 0x7d7c2a1c
    /**
     * Streaming Facets
     * @notice Rebalance the streaming members units based on conviction
     * @dev Delegates to facet
     */
    function rebalance() external {
        _delegateToFacet();
    }

    // _addToAllowList and _removeFromAllowList removed - now in AdminFacet

    function _registerToSybilScorer(uint256 threshold) internal {
        sybilScorer.addStrategy(address(this), threshold, address(registryCommunity.councilSafe()));
    }

    // Sig: 0x4ab4ba42
    /// @notice Getter for the 'poolAmount'.
    /// @return The balance of the pool
    function getPoolAmount() public view override returns (uint256) {
        address token = allo.getPool(poolId).token;
        if (token == NATIVE_TOKEN) return address(this).balance;
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

    // Stub - delegates to CVPauseFacet
    // Sig: 0x1add1a0d
    function setPauseController(address) external {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0x222a3a04
    function setPauseFacet(address) external {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0x136439dd
    function pause(uint256) external {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0x80c4a65f
    function pause(bytes4, uint256) external {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0x3f4ba83a
    function unpause() external {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0xbac1e94b
    function unpause(bytes4) external {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0xadaf157b
    function pauseFacet() external returns (address) {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0x60b47789
    function pauseController() external returns (address) {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0xb187bd26
    function isPaused() external returns (bool) {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0x09b65e66
    function isPaused(bytes4) external returns (bool) {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0xda748b10
    function pausedUntil() external returns (uint256) {
        _delegateToFacet();
    }

    // Stub - delegates to CVPauseFacet
    // Sig: 0x2d2ebbef
    function pausedSelectorUntil(bytes4) external returns (uint256) {
        _delegateToFacet();
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

        _enforceNotPaused(msg.sig, facet);

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    function _enforceNotPaused(bytes4 selector, address facet) private view {
        if (facet == LibPauseStorage.layout().pauseFacet) {
            return;
        }
        if (_isPauseSelector(selector)) {
            return;
        }
        address controller = LibPauseStorage.layout().pauseController;
        if (controller == address(0)) {
            return;
        }
        if (IPauseController(controller).isPaused(address(this))) {
            revert StrategyPaused(controller);
        }
        if (IPauseController(controller).isPaused(address(this), selector)) {
            revert StrategySelectorPaused(selector, controller);
        }
    }

    function _isPauseSelector(bytes4 selector) private pure returns (bool) {
        return selector == bytes4(keccak256("setPauseController(address)"))
            || selector == bytes4(keccak256("setPauseFacet(address)"))
            || selector == bytes4(keccak256("pause(uint256)")) || selector == bytes4(keccak256("pause(bytes4,uint256)"))
            || selector == bytes4(keccak256("unpause()")) || selector == bytes4(keccak256("unpause(bytes4)"))
            || selector == bytes4(keccak256("pauseFacet()")) || selector == bytes4(keccak256("pauseController()"))
            || selector == bytes4(keccak256("isPaused()")) || selector == bytes4(keccak256("isPaused(bytes4)"))
            || selector == bytes4(keccak256("pausedUntil()"))
            || selector == bytes4(keccak256("pausedSelectorUntil(bytes4)"));
    }

    // Sig: 0x1f931c1c
    /// @notice Manage facets using diamond cut (owner only)
    /// @param _diamondCut Array of FacetCut structs defining facet changes
    /// @param _init Address of contract to execute with delegatecall (can be address(0))
    /// @param _calldata Function call data to execute on _init address
    function diamondCut(IDiamondCut.FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external {
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

        _enforceNotPaused(msg.sig, facet);

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

    // Sig: 0x662ea47d
    /// @notice Returns the configured facets registered with the diamond
    function getFacets() external view returns (IDiamondLoupe.Facet[] memory facets_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 selectorCount = ds.selectors.length;
        facets_ = new IDiamondLoupe.Facet[](selectorCount);
        uint16[] memory numFacetSelectors = new uint16[](selectorCount);
        uint256 numFacets;

        for (uint256 selectorIndex; selectorIndex < selectorCount; selectorIndex++) {
            bytes4 selector = ds.selectors[selectorIndex];
            address facetAddress_ = ds.facetAddressAndSelectorPosition[selector].facetAddress;
            bool continueLoop;
            for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
                if (facets_[facetIndex].facetAddress == facetAddress_) {
                    facets_[facetIndex].functionSelectors[numFacetSelectors[facetIndex]] = selector;
                    numFacetSelectors[facetIndex]++;
                    continueLoop = true;
                    break;
                }
            }
            if (continueLoop) {
                continueLoop = false;
                continue;
            }
            facets_[numFacets].facetAddress = facetAddress_;
            facets_[numFacets].functionSelectors = new bytes4[](selectorCount);
            facets_[numFacets].functionSelectors[0] = selector;
            numFacetSelectors[numFacets] = 1;
            numFacets++;
        }

        for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
            bytes4[] memory selectors = facets_[facetIndex].functionSelectors;
            uint256 selectorLength = numFacetSelectors[facetIndex];
            assembly {
                mstore(selectors, selectorLength)
            }
        }

        assembly {
            mstore(facets_, numFacets)
        }
    }
}
