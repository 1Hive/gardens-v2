// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import {BaseStrategy} from "allo-v2-contracts/strategies/BaseStrategy.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {RegistryGardens} from "./RegistryGardens.sol";

interface IWithdrawMember {
    function withdraw(address _member) external;
}

contract CVStrategy is BaseStrategy, IWithdrawMember {
    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/
    error UserCannotBeZero();
    error RegistryCannotBeZero();
    error UserNotInRegistry();
    error ProposalIdCannotBeZero();
    error AmountOverMaxRatio();
    error ProposalNotInList(uint256 _proposalId);
    error PoolIsEmpty();
    error SupportUnderflow(uint256 _support, int256 _delta, int256 _result);
    error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance);
    error TokenCannotBeZero();
    error ProposalSupportDuplicated(uint256 _proposalId, uint256 index);
    /*|--------------------------------------------|*o
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/

    enum ProposalType {
        Signaling,
        Funding,
        Streaming
    }

    struct CreateProposal {
        uint256 proposalId;
        uint256 poolId;
        address beneficiary;
        address creator;
        ProposalType proposalType;
        uint256 amountRequested;
        address requestedToken;
    }

    enum ProposalStatus {
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
        uint256 agreementActionId;
        address beneficiary;
        address submitter;
        address requestedToken;
        uint256 blockLast;
        ProposalStatus proposalStatus;
        ProposalType proposalType;
        mapping(address => uint256) voterStakedPointsPct; // voter staked percentage
        mapping(address => uint256) voterStake; // voter staked percentage
    }

    struct ProposalSupport {
        uint256 proposalId;
        int256 deltaSupport; // use int256 to allow negative values
    }

    struct InitializeParams {
        address registryGardens;
        uint256 decay;
        uint256 maxRatio;
        uint256 weight;
        uint256 minThresholdStakePercentage;
    }
    /*|--------------------------------------------|*/
    /*|                VARIABLES                   |*/
    /*|--------------------------------------------|*/

    uint256 internal surpressStateMutabilityWarning;
    RegistryGardens registryGardens;

    mapping(uint256 => Proposal) internal proposals;
    mapping(address => uint256) internal totalVoterStakePct; // maybe should be replace to fixed max amount like 100 points
    mapping(address => uint256[]) internal voterStakedProposals; // voter

    uint256 public decay;
    uint256 public maxRatio;
    uint256 public weight;
    uint256 public minThresholdStakePercentage;
    uint256 public proposalCounter;
    uint256 public totalStaked;

    uint256 public constant D = 10000000;
    uint256 public constant ONE_HUNDRED_PERCENT = 1e18;
    uint256 private constant TWO_128 = 0x100000000000000000000000000000000; // 2^128
    uint256 private constant TWO_127 = 0x80000000000000000000000000000000; // 2^127
    uint256 private constant TWO_64 = 0x10000000000000000; // 2^64
    //    uint256 public constant ABSTAIN_PROPOSAL_ID = 1;
    uint256 public constant MAX_STAKED_PROPOSALS = 10;

    /*|--------------------------------------------|*/
    /*|              CONSTRUCTORS                  |*/
    /*|--------------------------------------------|*/
    constructor(address _allo) BaseStrategy(address(_allo), "CVStrategy") {}

    function initialize(uint256 _poolId, bytes memory _data) external {
        __BaseStrategy_init(_poolId);
        InitializeParams memory ip = abi.decode(_data, (InitializeParams));
        console.log("InitializeParams.decay", ip.decay);
        console.log("InitializeParams.maxRatio", ip.maxRatio);
        console.log("InitializeParams.weight", ip.weight);
        console.log("InitializeParams.minThresholdStakePercentage", ip.minThresholdStakePercentage);

        registryGardens = RegistryGardens(ip.registryGardens);
        decay = ip.decay;
        maxRatio = ip.maxRatio;
        weight = ip.weight;
        minThresholdStakePercentage = ip.minThresholdStakePercentage;

        emit Initialized(_poolId, _data);
    }
    /*|--------------------------------------------|*/
    /*|                 FALLBACK                  |*/
    /*|--------------------------------------------|*/

    fallback() external payable {
        surpressStateMutabilityWarning++;
    }

    receive() external payable {
        surpressStateMutabilityWarning++;
    }

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/
    modifier checkSenderIsMember(address _sender) {
        //        @todo: check if user is in registry
        //        require(_user != address(0), "CVStrategy: User is not valid");
        if (_sender == address(0)) {
            revert UserCannotBeZero();
        }
        if (address(registryGardens) == address(0)) {
            revert RegistryCannotBeZero();
        }
        if (!registryGardens.isMember(_sender)) {
            revert UserNotInRegistry();
        }
        _;
    }

    // this is called via allo.sol to register recipients
    // it can change their status all the way to Accepted, or to Pending if there are more steps
    // if there are more steps, additional functions should be added to allow the owner to check
    // this could also check attestations directly and then Accept

    function _registerRecipient(bytes memory _data, address _sender) internal override returns (address) {
        surpressStateMutabilityWarning++;
        _data;
        CreateProposal memory proposal = abi.decode(_data, (CreateProposal));

        if (proposal.proposalId == 0) {
            revert ProposalIdCannotBeZero();
        }
        if (proposal.beneficiary == address(0)) {
            revert UserCannotBeZero();
        }
        if (proposal.creator == address(0)) {
            revert UserCannotBeZero();
        }
        if (proposal.requestedToken == address(0)) {
            revert UserCannotBeZero();
        }
        if (proposal.amountRequested == 0) {
            revert UserCannotBeZero();
        }
        Proposal storage p = proposals[proposal.proposalId];
        p.proposalId = proposal.proposalId;
        p.submitter = _sender;
        p.beneficiary = proposal.beneficiary;
        p.requestedToken = proposal.requestedToken;
        p.requestedAmount = proposal.amountRequested;
        p.proposalType = proposal.proposalType;
        p.proposalStatus = ProposalStatus.Active;
        p.blockLast = block.number;
        p.convictionLast = 0;
        p.agreementActionId = 0;

        return address(uint160(proposal.proposalId));
        //        @TODO: emit events
    }

    // only called via allo.sol by users to allocate to a recipient
    // this will update some data in this contract to store votes, etc.
    function _allocate(bytes memory _data, address _sender) internal override {
        surpressStateMutabilityWarning++;
        //        _data;
        //        _sender;

        ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
        _addSupport(_sender, pv);
    }

    // this will distribute tokens to recipients
    // most strategies will track a TOTAL amount per recipient, and a PAID amount, and pay the difference
    // this contract will need to track the amount paid already, so that it doesn't double pay
    function _distribute(address[] memory _recipientIds, bytes memory _data, address _sender) internal override {
        surpressStateMutabilityWarning++;
        _recipientIds;
        _data;
        _sender;
    }

    // simply returns the status of a recipient
    // probably tracked in a mapping, but will depend on the implementation
    // for example, the OpenSelfRegistration only maps users to bool, and then assumes Accepted for those
    // since there is no need for Pending or Rejected
    function _getRecipientStatus(address _recipientId) internal view override returns (Status) {
        surpressStateMutabilityWarning;
        return _recipientId == address(0) ? Status.Rejected : Status.Accepted;
    }

    /// @return Input the values you would send to distribute(), get the amounts each recipient in the array would receive
    function getPayouts(address[] memory _recipientIds, bytes[] memory _data)
        external
        view
        override
        returns (PayoutSummary[] memory)
    {
        surpressStateMutabilityWarning;

        PayoutSummary[] memory payouts = new PayoutSummary[](_recipientIds.length);

        for (uint256 i; i < _recipientIds.length; i++) {
            payouts[i] = abi.decode(_data[i], (PayoutSummary));
        }

        return payouts;
    }

    function _getPayout(address _recipientId, bytes memory _data)
        internal
        view
        override
        returns (PayoutSummary memory)
    {
        surpressStateMutabilityWarning;
        _data;
        return PayoutSummary(_recipientId, 0);
    }

    // simply returns whether a allocator is valid or not, will usually be true for all
    function _isValidAllocator(address _allocator) internal view override returns (bool) {
        surpressStateMutabilityWarning;
        return _allocator == address(0) ? false : true;
    }

    function setPoolActive(bool _active) external {
        _setPoolActive(_active);
    }

    //    @TODO: onlyOnwer onlyRegistryGardens{
    function withdraw(address _member) external override {
        //        _withdraw(_member);
    }

    /**
     * @dev Get proposal details
     * @param _proposalId Proposal id
     * @return submitter Proposal submitter
     * @return beneficiary Proposal beneficiary
     * @return requestedToken Proposal requested token
     * @return requestedAmount Proposal requested amount
     * @return stakedTokens Proposal staked tokens
     * @return proposalType Proposal type
     * @return proposalStatus Proposal status
     * @return blockLast Last block when conviction was calculated
     * @return convictionLast Last conviction calculated
     * @return agreementActionId Agreement action id
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
            ProposalType proposalType,
            ProposalStatus proposalStatus,
            uint256 blockLast,
            uint256 convictionLast,
            uint256 agreementActionId,
            uint256 threshold
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
            proposal.proposalType,
            proposal.proposalStatus,
            proposal.blockLast,
            proposal.convictionLast,
            proposal.agreementActionId,
            threshold
        );
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
        return proposals[_proposalId].voterStake[_voter];
    }

    function convertPctToTokens(uint256 _pct) internal view returns (uint256) {
        return _pct * getBasisPoint() / 100;
    }

    function convertTokensToPct(uint256 _tokens) internal view returns (uint256) {
        return _tokens * 100 / getBasisPoint();
    }

    function getBasisPoint() internal view returns (uint256) {
        return registryGardens.getBasisStakedAmount(); // 50 HNY = 100%
    }

    function proposalExists(uint256 _proposalID) internal view returns (bool) {
        return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
    }

    function _addSupport(address _sender, ProposalSupport[] memory _proposalSupport) internal {
        int256 deltaSupportSum = 0;
        // int256[] memory deltaSupportByID = new int256[](_proposalSupport.length); //@audit-issue the length that arrays dont match with what they are doing
        for (uint256 i = 0; i < _proposalSupport.length; i++) {
            // check if _proposalSupport index i exist
            if (_proposalSupport[i].proposalId == 0) {
                //@todo: check better way to do that.
                console.log("proposalId == 0");
                continue;
            }
            uint256 proposalId = _proposalSupport[i].proposalId;
            if (!proposalExists(proposalId)) {
                revert ProposalNotInList(proposalId); //@TODO: maybe we should skip emitting a event instead of revert
            }
            deltaSupportSum += _proposalSupport[i].deltaSupport;
        }
        console.log("deltaSupportSum");
        console.logInt(deltaSupportSum);
        uint256 newTotalVotingSupport = _applyDelta(getTotalVoterStakePct(_sender), deltaSupportSum);
        console.log("newTotalVotingSupport", newTotalVotingSupport);
        uint256 participantBalance = convertTokensToPct(registryGardens.getBasisStakedAmount());
        console.log("participantBalance", participantBalance);
        // Check that the sum of support is not greater than the participant balance
        // require(newTotalVotingSupport <= participantBalance, "NOT_ENOUGH_BALANCE");
        if (newTotalVotingSupport > participantBalance) {
            revert NotEnoughPointsToSupport(newTotalVotingSupport, participantBalance);
        }

        totalVoterStakePct[_sender] = newTotalVotingSupport;
        //        totalParticipantSupportAt[currentRound][_sender] = newTotalVotingSupport;

        //        totalSupportAt[currentRound] = _applyDelta(getTotalSupport(), deltaSupportSum);
        _addSupport_(_sender, _proposalSupport);
    }

    function _addSupport_(address _sender, ProposalSupport[] memory _proposalSupport) internal {
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

            uint256 beforeStakedPointsPct = proposal.voterStakedPointsPct[_sender];
            uint256 previousStakedAmount = proposal.voterStake[_sender];
            // console.log("beforeStakedPointsPct", beforeStakedPointsPct);
            // console.log("previousStakedAmount", previousStakedAmount);

            uint256 stakedPointsPct = _applyDelta(beforeStakedPointsPct, delta);

            console.log("proposalID", proposalId);
            console.log("stakedPointsPct%", stakedPointsPct);

            proposal.voterStakedPointsPct[_sender] = stakedPointsPct;

            // console.log("_sender", _sender);
            uint256 stakedAmount = convertPctToTokens(stakedPointsPct);
            console.log("stakedAmount", stakedAmount);
            proposal.voterStake[_sender] = stakedAmount;
            proposal.stakedAmount += proposal.voterStake[_sender];

            //@todo: should emit event
            if (proposal.blockLast == 0) {
                proposal.blockLast = block.number;
            } else {
                _calculateAndSetConviction(proposal, previousStakedAmount);
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
        return (((atTWO_128 * _lastConv) + (_oldAmount * D * (TWO_128 - atTWO_128) / (D - decay))) + TWO_127) >> 128;
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
        // console.log("funds", funds);
        // console.log("_requestedAmount", _requestedAmount);
        // console.log("D", D);
        // console.log("maxRatio * funds", maxRatio * funds);
        // console.log("_requestedAmount * D", _requestedAmount * D);

        if (maxRatio * funds <= _requestedAmount * D) {
            revert AmountOverMaxRatio();
        }
        // denom = maxRatio * 2 ** 64 / D  - requestedAmount * 2 ** 64 / funds
        uint256 denom = (maxRatio * 2 ** 64) / D - (_requestedAmount * 2 ** 64) / funds;
        // console.log("denom", denom);
        //        uint256 denom = (maxRatio << 64).div(D).sub((_requestedAmount << 64).div(funds));
        // _threshold = (weight * 2 ** 128 / D) / (denom ** 2 / 2 ** 64) * totalStaked * D / 2 ** 128
        //         _threshold = ((weight * 2 ** 128) / D) / ((denom ** 2) / 2 ** 64) * D / (D - decay) * (_totalStaked()) / 2 ** 64;
        //        _threshold =
        //            ((weight << 128).div(D).div(denom.mul(denom) >> 64)).mul(D).div(D.sub(decay)).mul(_totalStaked()) >> 64;
        //        _threshold = (((weight << 128) / D) / (denom.mul(denom) >> 64)) * D / (D - decay) * (_totalStaked()) >> 64;
        _threshold = ((weight * 2 ** 128 / D / (denom * denom >> 64)) * D / (D - decay) * _totalStaked()) >> 64;
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

    /**
     * @dev Calculate conviction and store it on the proposal
     * @param _proposal Proposal
     * @param _oldStaked Amount of tokens staked on a proposal until now
     */
    function _calculateAndSetConviction(Proposal storage _proposal, uint256 _oldStaked) internal {
        uint256 blockNumber = block.number;
        assert(_proposal.blockLast <= blockNumber);
        if (_proposal.blockLast == blockNumber) {
            console.log("blockNumber == _proposal.blockLast");
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

    function _totalStaked() internal view returns (uint256) {
        if (address(registryGardens.gardenToken()) == address(0)) {
            revert TokenCannotBeZero();
        }
        // console.log("totalStaked", totalStaked);
        // console.log("registryGardens.gardenToken.totalSupply()", registryGardens.gardenToken().totalSupply());
        // console.log("minThresholdStakePercentage", minThresholdStakePercentage);
        uint256 minTotalStake =
            (registryGardens.gardenToken().totalSupply() * minThresholdStakePercentage) / ONE_HUNDRED_PERCENT;
        return totalStaked < minTotalStake ? minTotalStake : totalStaked;
    }
}
