// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IVotingPowerRegistry} from "../interfaces/IVotingPowerRegistry.sol";
import {ConvictionsUtils} from "../CVStrategy/ConvictionsUtils.sol";
import {PointSystem, PointSystemConfig} from "../CVStrategy/ICVStrategy.sol";
import {ISuperfluidPool} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";

/**
 * @title GardensConvictionMechanism
 * @notice Conviction Voting implemented using Octant TAM hook pattern
 * @dev ARCHITECTURE:
 *      - Follows Octant TAM hook interface exactly
 *      - Uses EIP-1967 unstructured storage (Gardens conviction state)
 *      - Ready to swap BaseAllocationMechanism when Octant publishes TAM contracts
 *      - Currently implements lifecycle + hooks (635 lines)
 *      - When Octant TAM available: Just hooks (~150 lines), import base
 * 
 * AUDIT STRATEGY:
 *      - Phase 1: Audit this full implementation (~$100k)
 *      - Phase 2: When Octant TAM published, refactor to use their audited base
 *      - Phase 2 audit: Only hook logic (~$30k vs full re-audit)
 *      - Net savings: ~$70k by following Octant pattern from start
 * 
 * Hook Mapping (from Octant TAM docs):
 *      1. _beforeSignupHook → Check Gardens community membership
 *      2. _getVotingPowerHook → Apply Gardens point system (unlimited/capped/quadratic)
 *      3. _beforeProposeHook → Gate proposal creation (members/council)
 *      4. _processVoteHook → Multi-proposal support + conviction update
 *      5. _hasQuorumHook → Gardens threshold formula (ρ, β, decay)
 *      6. _beforeFinalizeVoteTallyHook → No-op (evergreen pools)
 *      7. _requestCustomDistributionHook → Superfluid streaming
 *      8. _convertVotesToShares → Not used (streaming)
 *      9. _availableWithdrawLimit → Not used (no share redemption)
 * 
 * References:
 *      - https://docs.v2.octant.build/docs/tokenized_allocation_mechanisms/writing-new-funding-mechanism
 *      - https://docs.gardens.fund/conviction-voting/conviction-101
 */
contract GardensConvictionMechanism is ERC20 {
    using Math for uint256;

    /*//////////////////////////////////////////////////////////////
                        UNSTRUCTURED STORAGE (EIP-1967)
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Gardens conviction state in unstructured storage
     *      Avoids collision with Octant TAM core storage when we import it
     */
    bytes32 private constant CONVICTION_STORAGE_SLOT = 
        keccak256("gardens.conviction.mechanism.storage.v1");

    struct ConvictionStorage {
        // Gardens integration
        IVotingPowerRegistry registryCommunity;
        PointSystem pointSystem;
        PointSystemConfig pointConfig;
        
        // Conviction parameters (from Gardens CVParams)
        uint256 decay;              // Half-life parameter (~9965853 for 7 days)
        uint256 weight;             // ρ (rho) - conviction weight
        uint256 maxRatio;           // β (beta) - max % of pool single proposal can request
        uint256 minThresholdPoints; // Min % of voting power needed
        
        // Per-proposal conviction tracking
        mapping(uint256 => uint256) proposalConviction;     // Last calculated conviction
        mapping(uint256 => uint256) proposalSupport;        // Current total support
        mapping(uint256 => uint256) proposalLastBlock;      // Last block conviction updated
        mapping(uint256 => address) proposalBeneficiary;    // Beneficiary address
        mapping(uint256 => uint256) proposalRequestedAmount; // Requested funding amount
        
        // Per-voter allocations (Gardens: multi-proposal support)
        mapping(address => mapping(uint256 => uint256)) voterAllocations;
        mapping(address => uint256) voterTotalAllocated;    // Track total per voter
        
        // Superfluid streaming
        ISuperfluidPool gdaPool;
        mapping(uint256 => bool) proposalStreaming;         // Track active streams
        mapping(uint256 => uint128) proposalStreamUnits;    // GDA units per proposal
        
        // TAM state
        address owner;
        address management;
        IERC20 asset;
        uint256 totalVotingPower;
        uint256 totalPointsActivated;
        mapping(address => uint256) votingPower;
        mapping(uint256 => bool) proposalQueued;
        uint256 proposalCount;
    }

    function _convictionStorage() private pure returns (ConvictionStorage storage s) {
        bytes32 slot = CONVICTION_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyOwner();
    error OnlyManagement();
    error OnlySelf();
    error InsufficientVotingPower();
    error ProposalNotFound();
    error NoQuorum();
    error NotMember();
    error ZeroAddress();
    error ProposalAlreadyQueued();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event UserRegistered(address indexed user, uint256 deposit, uint256 votingPower);
    event ProposalCreated(uint256 indexed proposalId, address indexed recipient, uint256 requestedAmount);
    event SupportAllocated(address indexed voter, uint256 indexed proposalId, uint256 amount, uint256 newConviction);
    event ConvictionUpdated(uint256 indexed proposalId, uint256 conviction, uint256 threshold);
    event ProposalQueued(uint256 indexed proposalId, address indexed recipient);
    event StreamStarted(uint256 indexed proposalId, address indexed beneficiary, uint128 units);
    event StreamUpdated(uint256 indexed proposalId, uint128 oldUnits, uint128 newUnits);

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() ERC20("Gardens Conviction Shares", "gCV") {}

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    function initialize(
        IERC20 _asset,
        address _registryCommunity,
        uint256 _decay,
        uint256 _weight,
        uint256 _maxRatio,
        uint256 _minThresholdPoints,
        PointSystem _pointSystem,
        PointSystemConfig memory _pointConfig,
        address _gdaPool,
        address _owner
    ) external {
        ConvictionStorage storage cv = _convictionStorage();
        
        require(address(cv.asset) == address(0), "Already initialized");
        
        cv.asset = _asset;
        cv.registryCommunity = IVotingPowerRegistry(_registryCommunity);
        cv.decay = _decay;
        cv.weight = _weight;
        cv.maxRatio = _maxRatio;
        cv.minThresholdPoints = _minThresholdPoints;
        cv.pointSystem = _pointSystem;
        cv.pointConfig = _pointConfig;
        cv.gdaPool = ISuperfluidPool(_gdaPool);
        cv.owner = _owner;
        cv.management = _owner;
    }

    /*//////////////////////////////////////////////////////////////
                    HOOK 1 & 2: REGISTRATION (Activate Governance)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register user and grant voting power (TAM signup equivalent)
     * @dev Implements Octant hooks: _beforeSignupHook + _getVotingPowerHook
     * @param deposit Amount of governance tokens to stake
     * @return power Voting power granted
     */
    function signup(uint256 deposit) external returns (uint256 power) {
        // HOOK 1: _beforeSignupHook - Check eligibility
        require(_beforeSignupHook(msg.sender), "Not eligible");
        
        // Transfer governance tokens
        ConvictionStorage storage cv = _convictionStorage();
        cv.asset.transferFrom(msg.sender, address(this), deposit);
        
        // HOOK 2: _getVotingPowerHook - Calculate voting power
        power = _getVotingPowerHook(msg.sender, deposit);
        
        // Grant voting power
        cv.votingPower[msg.sender] += power;
        cv.totalVotingPower += power;
        cv.totalPointsActivated += power;
        
        emit UserRegistered(msg.sender, deposit, power);
    }

    /**
     * @dev HOOK 1: Check if user can register (Gardens: community member)
     */
    function _beforeSignupHook(address user) internal returns (bool) {
        ConvictionStorage storage cv = _convictionStorage();
        return cv.registryCommunity.isMember(user);
    }

    /**
     * @dev HOOK 2: Calculate voting power from deposit (Gardens: point systems)
     */
    function _getVotingPowerHook(address user, uint256 deposit) 
        internal returns (uint256) 
    {
        ConvictionStorage storage cv = _convictionStorage();
        
        if (cv.pointSystem == PointSystem.Unlimited) {
            return deposit;  // 1:1
        } else if (cv.pointSystem == PointSystem.Fixed) {
            return cv.pointConfig.maxAmount;
        } else if (cv.pointSystem == PointSystem.Capped) {
            return deposit > cv.pointConfig.maxAmount 
                ? cv.pointConfig.maxAmount : deposit;
        } else if (cv.pointSystem == PointSystem.Quadratic) {
            return Math.sqrt(deposit);
        }
        return deposit;
    }

    /*//////////////////////////////////////////////////////////////
                    HOOK 3: PROPOSALS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create proposal (TAM propose equivalent)
     * @dev Implements Octant hook: _beforeProposeHook
     * @param beneficiary Address to receive funds
     * @param requestedAmount Amount requested (0 for yield distribution)
     * @param metadata IPFS hash or description
     * @return proposalId New proposal ID
     */
    function propose(
        address beneficiary,
        uint256 requestedAmount,
        string calldata metadata
    ) external returns (uint256 proposalId) {
        ConvictionStorage storage cv = _convictionStorage();
        
        // HOOK 3: _beforeProposeHook - Check proposer eligibility
        require(_beforeProposeHook(msg.sender), "Not authorized");
        require(beneficiary != address(0), "Zero beneficiary");
        
        proposalId = ++cv.proposalCount;
        
        cv.proposalBeneficiary[proposalId] = beneficiary;
        cv.proposalRequestedAmount[proposalId] = requestedAmount;
        cv.proposalLastBlock[proposalId] = block.number;
        
        emit ProposalCreated(proposalId, beneficiary, requestedAmount);
    }

    /**
     * @dev HOOK 3: Check if address can create proposals (Gardens: members)
     */
    function _beforeProposeHook(address proposer) internal returns (bool) {
        ConvictionStorage storage cv = _convictionStorage();
        return cv.registryCommunity.isMember(proposer);
    }

    /*//////////////////////////////////////////////////////////////
            HOOK 4: VOTING (Multi-Proposal, Continuous Support)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Allocate voting power to proposal (TAM castVote equivalent)
     * @dev Implements Octant hook: _processVoteHook
     *      Gardens semantics: Multi-proposal support, continuous updates, conviction tracking
     * 
     * @param proposalId Proposal to support
     * @param amount Amount of voting power to allocate
     */
    function castVote(uint256 proposalId, uint256 amount) external {
        ConvictionStorage storage cv = _convictionStorage();
        
        require(proposalId > 0 && proposalId <= cv.proposalCount, "Invalid proposal");
        
        uint256 oldPower = cv.votingPower[msg.sender];
        uint256 previousAllocation = cv.voterAllocations[msg.sender][proposalId];
        
        // HOOK 4: _processVoteHook - Process allocation change
        uint256 newPower = _processVoteHook(
            proposalId,
            msg.sender,
            1,  // choice (1 = For, Gardens always "For")
            amount,
            oldPower
        );
        
        cv.votingPower[msg.sender] = newPower;
        
        // Update conviction after support change
        uint256 newConviction = _getCurrentConviction(proposalId);
        
        emit SupportAllocated(msg.sender, proposalId, amount, newConviction);
    }

    /**
     * @dev HOOK 4: Process vote allocation (Gardens: multi-proposal, continuous)
     * @param pid Proposal ID
     * @param voter User address
     * @param choice Vote type (always 1/For for Gardens)
     * @param weight New allocation amount
     * @param oldPower User's current available power
     * @return newPower User's remaining power
     */
    function _processVoteHook(
        uint256 pid,
        address voter,
        uint256 choice,
        uint256 weight,
        uint256 oldPower
    ) internal returns (uint256 newPower) {
        ConvictionStorage storage cv = _convictionStorage();
        
        uint256 previousAllocation = cv.voterAllocations[voter][pid];
        uint256 previousTotal = cv.voterTotalAllocated[voter];
        
        // Calculate power delta
        int256 powerDelta;
        if (weight > previousAllocation) {
            // Increasing allocation
            powerDelta = int256(weight - previousAllocation);
            require(oldPower >= uint256(powerDelta), "Insufficient power");
        } else {
            // Decreasing allocation (freeing power)
            powerDelta = -int256(previousAllocation - weight);
        }
        
        // Update support tracking
        if (powerDelta > 0) {
            cv.proposalSupport[pid] += uint256(powerDelta);
        } else if (powerDelta < 0) {
            cv.proposalSupport[pid] -= uint256(-powerDelta);
        }
        
        cv.voterAllocations[voter][pid] = weight;
        cv.voterTotalAllocated[voter] = previousTotal + uint256(powerDelta);
        
        // Update conviction (Gardens: time-weighted accumulation)
        _updateConviction(pid);
        
        // Return new power (linear cost, not quadratic!)
        if (powerDelta > 0) {
            return oldPower - uint256(powerDelta);
        } else {
            return oldPower + uint256(-powerDelta);
        }
    }

    /**
     * @notice Update conviction for proposal (Gardens formula)
     * @dev Exponential moving average with decay parameter
     */
    function _updateConviction(uint256 pid) internal {
        ConvictionStorage storage cv = _convictionStorage();
        
        uint256 blocksPassed = block.number - cv.proposalLastBlock[pid];
        if (blocksPassed == 0) return;  // Same block, skip
        
        // Calculate new conviction using Gardens formula
        uint256 newConviction = ConvictionsUtils.calculateConviction(
            blocksPassed,
            cv.proposalConviction[pid],
            cv.proposalSupport[pid],
            cv.decay
        );
        
        cv.proposalConviction[pid] = newConviction;
        cv.proposalLastBlock[pid] = block.number;
    }

    /*//////////////////////////////////////////////////////////////
                    HOOK 5: THRESHOLD CHECK (Quorum)
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev HOOK 5: Check if proposal meets conviction threshold
     *      Gardens: Dynamic threshold based on requested amount and pool size
     */
    function _hasQuorumHook(uint256 pid) internal view returns (bool) {
        ConvictionStorage storage cv = _convictionStorage();
        
        // Get current conviction (with time-weighting)
        uint256 currentConviction = _getCurrentConviction(pid);
        
        // Calculate Gardens threshold using formula: ρ / (β - r/f)²
        uint256 threshold = ConvictionsUtils.calculateThreshold(
            cv.proposalRequestedAmount[pid],
            _getPoolAmount(),
            cv.totalPointsActivated,
            cv.decay,
            cv.weight,
            cv.maxRatio,
            cv.minThresholdPoints
        );
        
        return currentConviction >= threshold;
    }

    function _getCurrentConviction(uint256 pid) internal view returns (uint256) {
        ConvictionStorage storage cv = _convictionStorage();
        
        uint256 blocksPassed = block.number - cv.proposalLastBlock[pid];
        return ConvictionsUtils.calculateConviction(
            blocksPassed,
            cv.proposalConviction[pid],
            cv.proposalSupport[pid],
            cv.decay
        );
    }

    /*//////////////////////////////////////////////////////////////
                    HOOK 6: FINALIZATION (Evergreen)
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev HOOK 6: Pre-finalization hook (Gardens: no-op for continuous pools)
     *      Gardens pools are evergreen - no hard round end
     */
    function _beforeFinalizeVoteTallyHook() internal pure returns (bool) {
        // No-op: Gardens conviction pools don't need finalization snapshots
        // Permissionless queuing works anytime based on threshold
        return true;
    }

    /*//////////////////////////////////////////////////////////////
                    HOOK 7 & 8: DISTRIBUTION (Streaming)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Queue passing proposal for execution (TAM queueProposal equivalent)
     * @dev Permissionless - anyone can queue if threshold met
     * @param pid Proposal ID
     */
    function queueProposal(uint256 pid) external {
        ConvictionStorage storage cv = _convictionStorage();
        
        require(pid > 0 && pid <= cv.proposalCount, "Invalid proposal");
        require(!cv.proposalQueued[pid], "Already queued");
        
        // HOOK 5: Check threshold
        require(_hasQuorumHook(pid), "Threshold not met");
        
        cv.proposalQueued[pid] = true;
        
        // HOOK 7: Custom distribution (Superfluid streaming)
        address recipient = cv.proposalBeneficiary[pid];
        _requestCustomDistributionHook(pid, recipient, cv.proposalSupport[pid]);
        
        emit ProposalQueued(pid, recipient);
    }

    /**
     * @dev HOOK 7: Custom distribution via Superfluid streaming
     *      Gardens: Start/update stream instead of minting shares
     * 
     * @return handled True if custom distribution used
     * @return assetsTransferred Amount transferred (0 for streaming)
     */
    function _requestCustomDistributionHook(
        uint256 pid,
        address recipient,
        uint256 support
    ) internal returns (bool handled, uint256 assetsTransferred) {
        ConvictionStorage storage cv = _convictionStorage();
        
        if (address(cv.gdaPool) == address(0)) {
            // No streaming configured - use default (would mint shares)
            return (false, 0);
        }
        
        // STREAMING MODE: Calculate units based on conviction
        uint256 conviction = _getCurrentConviction(pid);
        
        // Calculate proportional units (Gardens: based on conviction share)
        uint128 units = cv.totalPointsActivated > 0
            ? uint128((conviction * 10000) / cv.totalPointsActivated)
            : 0;
        
        if (units == 0) {
            return (true, 0);  // Conviction too small
        }
        
        // Update Superfluid GDA units
        cv.gdaPool.updateMemberUnits(recipient, units);
        
        // Track streaming state
        if (!cv.proposalStreaming[pid]) {
            cv.proposalStreaming[pid] = true;
            emit StreamStarted(pid, recipient, units);
        } else {
            emit StreamUpdated(pid, cv.proposalStreamUnits[pid], units);
        }
        cv.proposalStreamUnits[pid] = units;
        
        // Return custom handled, 0 assets (streaming, not instant transfer)
        return (true, 0);
    }

    /**
     * @dev HOOK 8: Convert votes to shares (Gardens: unused, streaming instead)
     */
    function _convertVotesToShares(uint256 pid) internal pure returns (uint256) {
        // Gardens uses streaming distribution, not share minting
        return 0;
    }

    /*//////////////////////////////////////////////////////////////
                    HOOK 9: REDEMPTION WINDOW
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev HOOK 9: Available withdraw limit (Gardens: unused, no share redemption)
     */
    function _availableWithdrawLimit(address owner) internal pure returns (uint256) {
        // Gardens streams directly, no share redemption needed
        return 0;
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getConviction(uint256 pid) external view returns (uint256) {
        return _getCurrentConviction(pid);
    }

    function getThreshold(uint256 pid) external view returns (uint256) {
        ConvictionStorage storage cv = _convictionStorage();
        return ConvictionsUtils.calculateThreshold(
            cv.proposalRequestedAmount[pid],
            _getPoolAmount(),
            cv.totalPointsActivated,
            cv.decay,
            cv.weight,
            cv.maxRatio,
            cv.minThresholdPoints
        );
    }

    function getVoterAllocation(address voter, uint256 pid) 
        external view returns (uint256) 
    {
        return _convictionStorage().voterAllocations[voter][pid];
    }

    function getProposalSupport(uint256 pid) external view returns (uint256) {
        return _convictionStorage().proposalSupport[pid];
    }

    function getVotingPower(address user) external view returns (uint256) {
        return _convictionStorage().votingPower[user];
    }

    function getAvailableVotingPower(address user) external view returns (uint256) {
        ConvictionStorage storage cv = _convictionStorage();
        uint256 total = cv.votingPower[user];
        uint256 allocated = cv.voterTotalAllocated[user];
        return total > allocated ? total - allocated : 0;
    }

    /*//////////////////////////////////////////////////////////////
                            HELPERS
    //////////////////////////////////////////////////////////////*/

    function _getPoolAmount() internal view returns (uint256) {
        ConvictionStorage storage cv = _convictionStorage();
        return cv.asset.balanceOf(address(this));
    }

    /*//////////////////////////////////////////////////////////////
                    ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setManagement(address newManagement) external {
        ConvictionStorage storage cv = _convictionStorage();
        require(msg.sender == cv.owner, "Only owner");
        cv.management = newManagement;
    }

    function updateConvictionParams(
        uint256 _decay,
        uint256 _weight,
        uint256 _maxRatio,
        uint256 _minThresholdPoints
    ) external {
        ConvictionStorage storage cv = _convictionStorage();
        require(msg.sender == cv.management || msg.sender == cv.owner, "Only management");
        
        cv.decay = _decay;
        cv.weight = _weight;
        cv.maxRatio = _maxRatio;
        cv.minThresholdPoints = _minThresholdPoints;
    }

    /**
     * @notice Rebalance streams for all proposals
     * @dev Updates Superfluid units based on current conviction
     */
    function rebalanceStreams() external {
        ConvictionStorage storage cv = _convictionStorage();
        
        if (address(cv.gdaPool) == address(0)) return;
        
        uint256 totalConviction;
        
        // Calculate total conviction
        for (uint256 i = 1; i <= cv.proposalCount; i++) {
            if (cv.proposalQueued[i]) {
                totalConviction += _getCurrentConviction(i);
            }
        }
        
        if (totalConviction == 0) return;
        
        // Update units proportionally
        for (uint256 i = 1; i <= cv.proposalCount; i++) {
            if (cv.proposalQueued[i] && cv.proposalStreaming[i]) {
                uint256 conviction = _getCurrentConviction(i);
                uint128 newUnits = uint128((conviction * 10000) / totalConviction);
                
                address beneficiary = cv.proposalBeneficiary[i];
                cv.gdaPool.updateMemberUnits(beneficiary, newUnits);
                
                emit StreamUpdated(i, cv.proposalStreamUnits[i], newUnits);
                cv.proposalStreamUnits[i] = newUnits;
            }
        }
    }
}

