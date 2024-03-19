// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import {BaseStrategy, IAllo} from "allo-v2-contracts/strategies/BaseStrategy.sol";
// import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
// import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {RegistryCommunity, Metadata} from "./RegistryCommunity.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

interface IPointStrategy {
    function withdraw(address _member) external;
    function deactivatePoints(address _member) external;
    function increasePower(address _member, uint256 _amountToStake) external returns (uint256);
    function decreasePower(address _member, uint256 _amountToUntake) external returns (uint256);
    function getPointsPerMember() external view returns (uint256);
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
        Executed // A vote that has been executed

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
        mapping(address => uint256) voterStakedPointsPct; // voter staked points
        mapping(address => uint256) voterStake; // voter staked tokens
        Metadata metadata;
    }

    struct ProposalSupport {
        uint256 proposalId;
        int256 deltaSupport; // use int256 to allow negative values
    }

    struct PointSystemConfig {
        //Unlimited and Capped systems
        uint256 pointsPerTokenStaked;
        //Capped point system
        uint256 maxAmount;
        //Fixed point system
        uint256 pointsPerMember;
        //Quadratic point system
        uint256 tokensPerPoint;
    }

    struct InitializeParams {
        address registryCommunity;
        // Alpha | Decay | a
        uint256 decay;
        // MaxRatio | Beta | b | SpendingLimit
        uint256 maxRatio;
        // Weight | RHO | p
        uint256 weight;
        // Proposal Type
        ProposalType proposalType;
        //NEXT: use this for tests
        PointSystem pointSystem;
        PointSystemConfig pointConfig;
    }
}

contract CVStrategy is BaseStrategy, IPointStrategy, ERC165 {
    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/
    error UserCannotBeZero(); // 0xd1f28288
    error UserNotInRegistry(); //0x6a5cfb6d
    error UserIsInactive(); //
    error PoolIsEmpty();
    // 0xed4421ad
    error NotImplemented(); //0xd6234725
    error TokenCannotBeZero(); //0x596a094c
    error TokenNotAllowed();
    error AmountOverMaxRatio(); // 0x3bf5ca14
    error PoolIdCannotBeZero(); //0x4e791786
    error AddressCannotBeZero(); //0xe622e040
    error RegistryCannotBeZero(); // 0x5df4b1ef
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result); // 0x3bbc7142
    error MaxPointsReached();
    error CantIncreaseFixedSystem();
    error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance); // 0xd64182fe

    error ProposalDataIsEmpty(); //0xc5f7c4c0
    error ProposalIdCannotBeZero(); //0xf881a10d
    error ProposalNotActive(uint256 _proposalId); // 0x44980d8f
    error ProposalNotInList(uint256 _proposalId); // 0xc1d17bef
    error ProposalSupportDuplicated(uint256 _proposalId, uint256 index); //0xadebb154

    /*|--------------------------------------------|*/
    /*|              CUSTOM EVENTS                 |*/
    /*|--------------------------------------------|*/

    event InitializedCV(uint256 poolId, StrategyStruct.InitializeParams data);
    event Distributed(uint256 proposalId, address beneficiary, uint256 amount);
    event ProposalCreated(uint256 poolId, uint256 proposalId);
    event PoolAmountIncreased(uint256 amount);
    event SupportAdded(address from, uint256 proposalId, uint256 amount, uint256 totalStakedPoints, uint256 convictionLast);
    /*|-------------------------------------/-------|*o
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/

    /*|--------------------------------------------|*/
    /*|                VARIABLES                   |*/
    /*|--------------------------------------------|*/

    // uint256 internal // surpressStateMutabilityWarning;

    RegistryCommunity public registryCommunity;

    mapping(uint256 => StrategyStruct.Proposal) public proposals;
    mapping(address => uint256) public totalVoterStakePct; // maybe should be replace to fixed max amount like 100 points
    mapping(address => uint256[]) public voterStakedProposals; // voter
    //Extra power per member
    // mapping(address => uint256) public memberPowerBalance;

    uint256 public decay;
    uint256 public maxRatio;
    uint256 public weight;
    StrategyStruct.ProposalType public proposalType;

    uint256 public proposalCounter = 0;
    uint256 public totalStaked;
    uint256 public totalPointsActivated;

    uint256 public minPointsActivated = 100 * 10 * PRECISION_SCALE;
    StrategyStruct.PointSystem public pointSystem;
    StrategyStruct.PointSystemConfig public pointConfig;

    uint256 public constant PRECISION_SCALE = 10 ** 4;
    uint256 public constant D = 10000000; //10**7
    uint256 public constant PRECISION_PERCENTAGE = 100 * PRECISION_SCALE;
    // uint256 public constant ONE_HUNDRED_PERCENT = 1e18;
    uint256 private constant TWO_128 = 0x100000000000000000000000000000000; // 2**128
    uint256 private constant TWO_127 = 0x80000000000000000000000000000000; // 2**127
    uint256 private constant TWO_64 = 0x10000000000000000; // 2**64
    //    uint256 public constant ABSTAIN_PROPOSAL_ID = 1;
    uint256 public constant MAX_STAKED_PROPOSALS = 10; //@todo not allow stake more than 10 proposals per user

    /*|--------------------------------------------|*/
    /*|              CONSTRUCTORS                  |*/
    /*|--------------------------------------------|*/
    constructor(address _allo) BaseStrategy(address(_allo), "CVStrategy") {}

    function initialize(uint256 _poolId, bytes memory _data) external {
        __BaseStrategy_init(_poolId);
        StrategyStruct.InitializeParams memory ip = abi.decode(_data, (StrategyStruct.InitializeParams));
        // PointSystemConfig memory pc = abi.decode(_data,(PointSystemConfig));
        // StrategyStruct.PointSystemConfig memory pc = ip.pointConfig;
        // console.log("InitializeParams.decay", ip.decay);
        // console.log("InitializeParams.maxRatio", ip.maxRatio);
        // console.log("InitializeParams.weight", ip.weight);

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

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/
    function checkSenderIsMember(address _sender) private view {
        //        @todo: check if user is in registry
        //        require(_user != address(0), "CVStrategy: User is not valid");
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

    // this is called via allo.sol to register recipients
    // it can change their status all the way to Accepted, or to Pending if there are more steps
    // if there are more steps, additional functions should be added to allow the owner to check
    // this could also check attestations directly and then Accept

    function _registerRecipient(bytes memory _data, address _sender) internal override returns (address) {
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
            if (proposal.beneficiary == address(0)) {
                revert AddressCannotBeZero();
            }
            // getAllo().getPool(poolId).token;
            if (proposal.requestedToken == address(0)) {
                revert TokenCannotBeZero();
            }
            address poolToken = this.getAllo().getPool(poolId).token;
            if (proposal.requestedToken != poolToken) {
                // console.log("::requestedToken", proposal.requestedToken);
                // console.log("::PookToken", poolToken);
                revert TokenNotAllowed();
            }
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

        emit ProposalCreated(poolId, proposalId);
        return address(uint160(proposalId));
    }

    function activatePoints() external {
        address member = msg.sender;
        registryCommunity.activateMemberInStrategy(member, address(this));
        totalPointsActivated += registryCommunity.getMemberPowerInStrategy(member, address(this));
    }

    function deactivatePoints(address _member) external {
        //address member = msg.sender; //@todo wip
        totalPointsActivated -= registryCommunity.getMemberPowerInStrategy(_member, address(this));
        registryCommunity.deactivateMemberInStrategy(_member, address(this));
        // remove support from all proposals
        this.withdraw(_member);
    }

    function increasePower(address _member, uint256 _amountToStake) external view returns (uint256) {
        //requireMemberActivatedInStrategies

        uint256 pointsToIncrease = 0;
        if (pointSystem == StrategyStruct.PointSystem.Unlimited) {
            pointsToIncrease = increasePowerUnlimited(_amountToStake);
        } else if (pointSystem == StrategyStruct.PointSystem.Capped) {
            pointsToIncrease = increasePowerCapped(_member, _amountToStake);
        }
        return pointsToIncrease;
    }

    function decreasePower(address _member, uint256 _amountToUnstake) external view returns (uint256) {
        //requireMemberActivatedInStrategies

        uint256 pointsToDecrease = 0;
        if (pointSystem == StrategyStruct.PointSystem.Unlimited || pointSystem == StrategyStruct.PointSystem.Capped) {
            pointsToDecrease = decreasePowerCappedUnlimited(_member, _amountToUnstake);
        }

        return pointsToDecrease;
    }

    //todo: increase/decrease for all systems, 8 total
    function increasePowerUnlimited(uint256 _amountToStake) internal view returns (uint256) {
        uint256 pointsToIncrease = _amountToStake * pointConfig.pointsPerTokenStaked;
        return pointsToIncrease / (10 ** 18);
    }

    function increasePowerCapped(address _member, uint256 _amountToStake) internal view returns (uint256) {
        uint256 pointsToIncrease = _amountToStake * pointConfig.pointsPerTokenStaked / (10 ** 18);
        uint256 memberPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
        if (memberPower + pointsToIncrease > pointConfig.maxAmount) {
            pointsToIncrease = pointConfig.maxAmount - memberPower;
        }
        return pointsToIncrease;
    }

    function decreasePowerCappedUnlimited(address _member, uint256 _amountToUnstake) internal view returns (uint256) {
        return (_amountToUnstake * pointConfig.pointsPerTokenStaked);
    }

    function getPointsPerMember() external view returns (uint256) {
        return pointConfig.pointsPerMember;
    }

    // function increasePowerQuadratic(uint256 _amountToStake) internal {

    // }

    // [[[proposalId, delta],[proposalId, delta]]]
    // layout.txs -> console.log(data)
    // data = bytes
    function supportProposal(StrategyStruct.ProposalSupport[] memory) public {
        // // surpressStateMutabilityWarning++;
        revert NotImplemented();
        // allo().allocate(poolId, abi.encode(proposalId));
    }

    // only called via allo.sol by users to allocate to a recipient
    // this will update some data in this contract to store votes, etc.
    function _allocate(bytes memory _data, address _sender) internal override {
        checkSenderIsMember(_sender);
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

            if (proposal.proposalStatus != StrategyStruct.ProposalStatus.Active) {
                revert ProposalNotActive(proposalId);
            }
            IAllo.Pool memory pool = allo.getPool(poolId);

            _transferAmount(pool.token, proposal.beneficiary, proposal.requestedAmount);

            emit Distributed(proposalId, proposal.beneficiary, proposal.requestedAmount);
        } //signaling do nothing @todo write tests @todo add end date
    }

    // simply returns the status of a recipient
    // probably tracked in a mapping, but will depend on the implementation
    // for example, the OpenSelfRegistration only maps users to bool, and then assumes Accepted for those
    // since there is no need for Pending or Rejected
    function _getRecipientStatus(address _recipientId) internal view override returns (Status) {
        // surpressStateMutabilityWarning;
        return _recipientId == address(0) ? Status.Rejected : Status.Accepted;
    }

    /// @return Input the values you would send to distribute(), get the amounts each recipient in the array would receive
    function getPayouts(address[] memory, bytes[] memory) external view override returns (PayoutSummary[] memory) {
        // surpressStateMutabilityWarning;
        revert NotImplemented();
        // PayoutSummary[] memory payouts = new PayoutSummary[](0);
        // return payouts;
    }

    function _getPayout(address _recipientId, bytes memory _data)
        internal
        view
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

    function _isValidAllocator(address _allocator) internal view override returns (bool) {
        // surpressStateMutabilityWarning;
        return _allocator == address(0) ? false : true;
    }

    function setPoolActive(bool _active) external {
        _setPoolActive(_active);
    }

    //    @TODO: onlyOnwer onlyRegistryCommunity{
    function withdraw(address _member) external override {
        // remove all proposals from the member
        uint256[] memory proposalsIds = voterStakedProposals[_member];
        for (uint256 i = 0; i < proposalsIds.length; i++) {
            uint256 proposalId = proposalsIds[i];
            StrategyStruct.Proposal storage proposal = proposals[proposalId];
            if (proposalExists(proposalId)) {
                uint256 stakedAmount = proposal.voterStake[_member];
                proposal.voterStake[_member] = 0;
                proposal.voterStakedPointsPct[_member] = 0;
                proposal.stakedAmount -= stakedAmount;
                totalStaked -= stakedAmount;
                _calculateAndSetConviction(proposal, stakedAmount);
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
     * @return stakedTokens Proposal staked tokens
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
            uint256 stakedTokens,
            StrategyStruct.ProposalStatus proposalStatus,
            uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold,
            uint256 voterStakedPointsPct
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
            proposal.voterStakedPointsPct[msg.sender]
        );
    }

    function getMetadata(uint256 _proposalId) external view returns (Metadata memory) {
        StrategyStruct.Proposal storage proposal = proposals[_proposalId];
        return proposal.metadata;
    }

    // function getProposalStatus(uint256 _proposalId) external view returns (StrategyStruct.ProposalStatus) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.proposalStatus;
    // }

    // function getProposalRequestedAmount(uint256 _proposalId) external view returns (uint256) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.requestedAmount;
    // }

    // function getProposalRequestedToken(uint256 _proposalId) external view returns (address) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.requestedToken;
    // }

    // function getProposalBeneficiary(uint256 _proposalId) external view returns (address) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.beneficiary;
    // }

    // function getProposalSubmitter(uint256 _proposalId) external view returns (address) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.submitter;
    // }

    // function getProposalThreshold(uint256 _proposalId) external view returns (uint256) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.requestedAmount == 0 ? 0 : calculateThreshold(proposal.requestedAmount);
    // }

    // function getProposalBlockLast(uint256 _proposalId) external view returns (uint256) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.blockLast;
    // }

    // function getProposalConvictionLast(uint256 _proposalId) external view returns (uint256) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.convictionLast;
    // }

    // function getProposalVoterStakedPointsPct(uint256 _proposalId, address _voter) external view returns (uint256) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.voterStakedPointsPct[_voter];
    // }

    // function getProposalVoterStakedAmount(uint256 _proposalId, address _voter) external view returns (uint256) {
    //     StrategyStruct.Proposal storage proposal = proposals[_proposalId];
    //     return proposal.voterStake[_voter];
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

    function getProposalStakedAmount(uint256 _proposalId) external view returns (uint256) {
        return proposals[_proposalId].stakedAmount;
    }

    //    do a internal function to get the total voter stake

    function getTotalVoterStakePct(address _voter) public view returns (uint256) {
        return totalVoterStakePct[_voter];
    }

    function _internal_getProposalVoterStake(uint256 _proposalId, address _voter) internal view returns (uint256) {
        return proposals[_proposalId].voterStake[_voter];
    }

    function convertPctToTokens(uint256 _pct) internal view returns (uint256) {
        return (_pct * getBasisStakedAmount()) / PRECISION_PERCENTAGE;
    }

    function convertTokensToPct(uint256 _tokens) internal view returns (uint256) {
        return (_tokens * PRECISION_PERCENTAGE) / getBasisStakedAmount();
    }

    function getBasisStakedAmount() internal view returns (uint256) {
        return registryCommunity.getBasisStakedAmount(); // 50 HNY = 100%
    }

    function proposalExists(uint256 _proposalID) internal view returns (bool) {
        return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
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

        // if(pointSystem = 1){
        //     participantBalance+ =
        // }
        // console.log("participantBalance", participantBalance);
        // Check that the sum of support is not greater than the participant balance
        // require(newTotalVotingSupport <= participantBalance, "NOT_ENOUGH_BALANCE");
        if (newTotalVotingSupport > participantBalance) {
            revert NotEnoughPointsToSupport(newTotalVotingSupport, participantBalance);
        }

        totalVoterStakePct[_sender] = newTotalVotingSupport;
        //        totalParticipantSupportAt[currentRound][_sender] = newTotalVotingSupport;

        //        totalSupportAt[currentRound] = _applyDelta(getTotalSupport(), deltaSupportSum);
    }

    function _addSupport(address _sender, StrategyStruct.ProposalSupport[] memory _proposalSupport) internal {
        console.log('SUPPOOOOOORT');
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

            uint256 beforeStakedPointsPct = proposal.voterStakedPointsPct[_sender];
            uint256 previousStakedAmount = proposal.voterStake[_sender];
            // console.log("beforeStakedPointsPct", beforeStakedPointsPct);
            // console.log("previousStakedAmount", previousStakedAmount);

            uint256 stakedPointsPct = _applyDelta(beforeStakedPointsPct, delta);

            // console.log("proposalID", proposalId);
            // console.log("stakedPointsPct%", stakedPointsPct);

            proposal.voterStakedPointsPct[_sender] = stakedPointsPct;

            // console.log("_sender", _sender);
            uint256 stakedAmount = convertPctToTokens(stakedPointsPct);
            // console.log("stakedAmount", stakedAmount);
            proposal.voterStake[_sender] = stakedAmount;
            // proposal.stakedAmount += stakedAmount;
            // uint256 diff =_diffStakedTokens(previousStakedAmount, stakedAmount);
            if (previousStakedAmount <= stakedAmount) {
                totalStaked += stakedAmount - previousStakedAmount;
                proposal.stakedAmount += stakedAmount - previousStakedAmount;
            } else {
                totalStaked -= previousStakedAmount - stakedAmount;
                proposal.stakedAmount -= previousStakedAmount - stakedAmount;
            }
            //@todo: should emit event
            if (proposal.blockLast == 0) {
                proposal.blockLast = block.number;
            } else {
                _calculateAndSetConviction(proposal, previousStakedAmount);
                emit SupportAdded(_sender, proposalId, stakedAmount, proposal.stakedAmount, proposal.convictionLast);
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
        uint256 funds = poolAmount;
        //        require(maxRatio.mul(funds) > _requestedAmount.mul(D), ERROR_AMOUNT_OVER_MAX_RATIO);
        // console.log("maxRatio", maxRatio);
        // console.log("funds=poolAmount", funds);
        // console.log("_requestedAmount", _requestedAmount);
        // console.log("D", D);
        // console.log("maxRatio * funds", maxRatio * funds);
        // console.log("_requestedAmount * D", _requestedAmount * D);

        if (maxRatio * funds <= _requestedAmount * D) {
            revert AmountOverMaxRatio();
        }
        // denom = maxRatio * 2 ** 64 / D  - requestedAmount * 2 ** 64 / funds
        uint256 denom = (maxRatio * 2 ** 64) / D - (_requestedAmount * 2 ** 64) / funds;
        _threshold = (
            (((((weight << 128) / D) / ((denom * denom) >> 64)) * D) / (D - decay)) * totalEffectiveActivePoints()
        ) >> 64;
        //_threshold = ((((((weight * 2**128) / D) / ((denom * denom) / 2 **64)) * D) / (D - decay)) * _totalStaked()) / 2 ** 64;
        // console.log("_threshold", _threshold);
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
        // console.log("totalPointsActivated", totalPointsActivated);
        // console.log("minPointsActivated", minPointsActivated);
        return totalPointsActivated > minPointsActivated ? totalPointsActivated : minPointsActivated;
    }

    /**
     * @dev Calculate conviction and store it on the proposal
     * @param _proposal Proposal
     * @param _oldStaked Amount of tokens staked on a proposal until now
     */
    function _calculateAndSetConviction(StrategyStruct.Proposal storage _proposal, uint256 _oldStaked) internal {
        uint256 blockNumber = block.number;
        assert(_proposal.blockLast <= blockNumber);
        if (_proposal.blockLast == blockNumber) {
            // console.log("blockNumber == _proposal.blockLast");
            return; // Conviction already stored
        }
        // calculateConviction and store it
        uint256 conviction = calculateConviction(
            blockNumber - _proposal.blockLast, // we assert it doesn't overflow above
            _proposal.convictionLast,
            _oldStaked
        );
        _proposal.blockLast = blockNumber;
        _proposal.convictionLast = conviction;
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
    }

    function setMaxRatio(uint256 _maxRatio) external onlyPoolManager(msg.sender) {
        maxRatio = _maxRatio;
    }

    function setWeight(uint256 _weight) external onlyPoolManager(msg.sender) {
        weight = _weight;
    }

    function setRegistryCommunity(address _registryCommunity) external onlyPoolManager(msg.sender) {
        registryCommunity = RegistryCommunity(_registryCommunity);
    }
}
