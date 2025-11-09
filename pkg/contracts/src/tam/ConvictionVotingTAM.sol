// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ConvictionVotingTAM
 * @notice Tokenized Allocation Mechanism for Conviction Voting (Octant TAM pattern)
 * @dev Shared implementation following Yearn V3 delegatecall architecture
 * 
 * Architecture (from Octant TAM docs):
 * - This is the shared IMPLEMENTATION contract
 * - Storage lives in minimal PROXY (BaseConvictionVotingMechanism)
 * - Proxies delegatecall this contract for lifecycle and accounting
 * - Policy injected via onlySelf-gated HOOKS
 * 
 * Lifecycle:
 * 1. Registration: Users signup() with voting power
 * 2. Voting: Users castVote() on proposals (linear cost, not quadratic)
 * 3. Finalize: Owner finalizes tallies
 * 4. Queueing: Anyone can queue proposals that meet threshold
 * 5. Distribution: Start streams or mint shares
 * 
 * Key Differences from Octant QF:
 * - Linear voting cost (not quadratic)
 * - Time-weighted conviction (not instant votes)
 * - No fixed voting window (continuous)
 * - Streaming distribution (not share redemption)
 */
contract ConvictionVotingTAM is ERC20 {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyOwner();
    error OnlyManagement();
    error OnlySelf();
    error WrongPhase();
    error AlreadyVoted();
    error ProposalNotFound();
    error InsufficientVotingPower();
    error NoQuorum();
    error ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event PhaseUpdated(Phase oldPhase, Phase newPhase);
    event UserRegistered(address indexed user, uint256 deposit, uint256 votingPower);
    event ProposalCreated(uint256 indexed proposalId, address indexed recipient, string metadata);
    event VoteCast(address indexed voter, uint256 indexed proposalId, uint256 weight);
    event VotingFinalized(uint256 timestamp);
    event ProposalQueued(uint256 indexed proposalId, address indexed recipient);
    event StreamDistributed(uint256 indexed proposalId, address indexed recipient, uint256 units);

    /*//////////////////////////////////////////////////////////////
                                 ENUMS
    //////////////////////////////////////////////////////////////*/

    enum Phase {
        Registration,  // Users can signup and get voting power
        Voting,        // Users can cast votes
        Finalized,     // Voting closed, tallies final
        Queueing,      // Proposals can be queued
        Redemption,    // Shares can be redeemed (if not streaming)
        Swept          // Unclaimed funds swept
    }

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    // NOTE: This state is defined for clarity but lives in PROXY storage
    // The proxy must declare these in exact same order

    Phase public currentPhase;
    address public owner;
    address public management;
    IERC20 public asset;
    
    // Timing
    uint256 public votingStart;
    uint256 public votingEnd;
    uint256 public timelockDuration;
    uint256 public redemptionWindow;
    
    // Conviction parameters
    uint256 public decay;
    uint256 public weight;
    uint256 public maxRatio;
    uint256 public minThresholdPoints;
    
    // Voting state
    mapping(address => uint256) public votingPower;
    mapping(address => mapping(uint256 => uint256)) public votes;
    mapping(uint256 => uint256) public proposalSupport;
    mapping(uint256 => uint256) public proposalConviction;
    mapping(uint256 => uint256) public proposalLastBlock;
    
    uint256 public totalVotingPower;
    uint256 public proposalCount;
    
    // Proposals
    struct Proposal {
        address recipient;
        uint256 requestedAmount;
        string metadata;
        bool queued;
    }
    mapping(uint256 => Proposal) public proposals;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() ERC20("Conviction TAM Shares", "cvTAM") {}

    /*//////////////////////////////////////////////////////////////
                            LIFECYCLE: REGISTRATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register user and grant voting power
     * @param deposit Amount to deposit (if required)
     * @return power Voting power granted
     */
    function signup(uint256 deposit) external returns (uint256 power) {
        if (currentPhase != Phase.Registration && currentPhase != Phase.Voting) {
            revert WrongPhase();
        }
        
        // Transfer assets if deposit required
        if (deposit > 0) {
            asset.safeTransferFrom(msg.sender, address(this), deposit);
        }
        
        // Call hook to check eligibility
        _beforeSignupHook(msg.sender, deposit);
        
        // Call hook to calculate voting power
        power = _getVotingPowerHook(deposit);
        
        // Grant power
        votingPower[msg.sender] += power;
        totalVotingPower += power;
        
        emit UserRegistered(msg.sender, deposit, power);
    }

    /*//////////////////////////////////////////////////////////////
                            LIFECYCLE: VOTING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Cast vote for a proposal
     * @dev Linear cost (unlike Octant QF's quadratic cost)
     * @param proposalId Proposal to support
     * @param voteWeight Amount of voting power to allocate
     */
    function castVote(uint256 proposalId, uint256 voteWeight) external {
        if (currentPhase != Phase.Voting) revert WrongPhase();
        if (votes[msg.sender][proposalId] > 0) revert AlreadyVoted();
        if (proposalId == 0 || proposalId > proposalCount) revert ProposalNotFound();
        
        uint256 currentPower = votingPower[msg.sender];
        if (currentPower < voteWeight) revert InsufficientVotingPower();
        
        // Hook: Process vote (linear cost for conviction, not quadratic)
        uint256 newPower = _processVoteHook(msg.sender, proposalId, voteWeight, currentPower);
        
        // Update state
        votingPower[msg.sender] = newPower;
        votes[msg.sender][proposalId] = voteWeight;
        proposalSupport[proposalId] += voteWeight;
        
        // Initialize conviction tracking
        if (proposalLastBlock[proposalId] == 0) {
            proposalLastBlock[proposalId] = block.number;
        }
        
        emit VoteCast(msg.sender, proposalId, voteWeight);
    }

    /*//////////////////////////////////////////////////////////////
                            LIFECYCLE: FINALIZE
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Finalize voting (owner only)
     * @dev Transitions to Finalized phase
     */
    function finalizeVoteTally() external {
        if (msg.sender != owner && msg.sender != management) revert OnlyManagement();
        if (currentPhase != Phase.Voting) revert WrongPhase();
        if (block.timestamp < votingEnd) revert WrongPhase();
        
        currentPhase = Phase.Finalized;
        emit VotingFinalized(block.timestamp);
        emit PhaseUpdated(Phase.Voting, Phase.Finalized);
    }

    /*//////////////////////////////////////////////////////////////
                            LIFECYCLE: QUEUEING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Queue passing proposal (permissionless)
     * @dev Anyone can queue if proposal meets threshold
     * @param proposalId Proposal to queue
     */
    function queueProposal(uint256 proposalId) external {
        if (currentPhase != Phase.Finalized && currentPhase != Phase.Queueing) {
            revert WrongPhase();
        }
        
        Proposal storage proposal = proposals[proposalId];
        if (proposal.queued) return; // Already queued
        
        // Hook: Check if threshold met (conviction-based)
        if (!_hasQuorumHook(proposalId)) revert NoQuorum();
        
        // Mark as queued
        proposal.queued = true;
        
        // Hook: Custom distribution (start stream or mint shares)
        (bool custom, uint256 transferred) = _requestCustomDistributionHook(
            proposal.recipient,
            proposalSupport[proposalId]
        );
        
        if (custom) {
            // Custom distribution executed (e.g., stream started)
            // No shares minted
        } else {
            // Default: Mint shares
            uint256 shares = _convertVotesToShares(proposalId);
            _mint(proposal.recipient, shares);
        }
        
        currentPhase = Phase.Queueing;
        emit ProposalQueued(proposalId, proposal.recipient);
    }

    /*//////////////////////////////////////////////////////////////
                            PROPOSAL MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create new proposal
     * @param recipient Beneficiary address
     * @param requestedAmount Amount requested
     * @param metadata IPFS hash or description
     * @return proposalId New proposal ID
     */
    function propose(
        address recipient,
        uint256 requestedAmount,
        string calldata metadata
    ) external returns (uint256 proposalId) {
        if (recipient == address(0)) revert ZeroAddress();
        
        proposalId = ++proposalCount;
        
        proposals[proposalId] = Proposal({
            recipient: recipient,
            requestedAmount: requestedAmount,
            metadata: metadata,
            queued: false
        });
        
        emit ProposalCreated(proposalId, recipient, metadata);
    }

    /*//////////////////////////////////////////////////////////////
                            HOOKS (CALLED VIA PROXY)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Hook: Check user eligibility before signup
     * @dev Override in proxy with onlySelf modifier
     */
    function _beforeSignupHook(address user, uint256 deposit) internal virtual {}

    /**
     * @notice Hook: Calculate voting power from deposit
     * @dev Override in proxy with onlySelf modifier
     */
    function _getVotingPowerHook(uint256 deposit) internal virtual returns (uint256) {
        return deposit; // Default: 1:1
    }

    /**
     * @notice Hook: Process vote and return new power
     * @dev Override in proxy with onlySelf modifier
     * @return newPower Remaining voting power after allocation
     */
    function _processVoteHook(
        address voter,
        uint256 proposalId,
        uint256 voteWeight,
        uint256 currentPower
    ) internal virtual returns (uint256 newPower) {
        // Default: Linear cost (deduct voteWeight from power)
        return currentPower - voteWeight;
    }

    /**
     * @notice Hook: Check if proposal has reached quorum
     * @dev Override in proxy with onlySelf modifier
     */
    function _hasQuorumHook(uint256 proposalId) internal virtual view returns (bool) {
        // Default: Simple threshold
        return proposalSupport[proposalId] >= (totalVotingPower * 10) / 100;
    }

    /**
     * @notice Hook: Convert votes to shares
     * @dev Override in proxy with onlySelf modifier
     */
    function _convertVotesToShares(uint256 proposalId) internal virtual returns (uint256) {
        // Default: 1:1 support to shares
        return proposalSupport[proposalId];
    }

    /**
     * @notice Hook: Custom distribution (e.g., start stream)
     * @dev Override in proxy with onlySelf modifier
     * @return useCustom Whether custom distribution was used
     * @return transferred Amount of assets transferred (for accounting)
     */
    function _requestCustomDistributionHook(address recipient, uint256 support)
        internal
        virtual
        returns (bool useCustom, uint256 transferred)
    {
        // Default: No custom distribution
        return (false, 0);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setPhase(Phase newPhase) external {
        if (msg.sender != owner && msg.sender != management) revert OnlyManagement();
        Phase oldPhase = currentPhase;
        currentPhase = newPhase;
        emit PhaseUpdated(oldPhase, newPhase);
    }

    function setManagement(address newManagement) external {
        if (msg.sender != owner) revert OnlyOwner();
        management = newManagement;
    }
}


