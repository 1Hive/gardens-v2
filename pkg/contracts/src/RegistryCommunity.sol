// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IAllo, Metadata} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";

import {Safe} from "safe-contracts/contracts/Safe.sol";

import "forge-std/console.sol";

contract RegistryCommunity is ReentrancyGuard, AccessControl {
    // todo rename all RegistryCommunity to RegistryCommunity
    /*|--------------------------------------------|*/
    /*|                 ROLES                      |*/
    /*|--------------------------------------------|*/
    bytes32 public constant COUNCIL_MEMBER_CHANGE = keccak256("COUNCIL_MEMBER_CHANGE");
    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    event AlloSet(address _allo);
    event CouncilSafeSet(address _safe);
    event CouncilSafeChangeStarted(address _safeOwner, address _newSafeOwner);
    event MemberRegistered(address _member, uint256 _amountStaked);
    event MemberUnregistered(address _member, uint256 _amountReturned);
    event MemberKicked(address _member, address _transferAddress, uint256 _amountReturned);
    event ProtocolFeeUpdated(uint256 _newFee);
    event RegistryInitialized(bytes32 _profileId, string _communityName, Metadata _metadata);
    event StrategyAdded(address _strategy);
    event StrategyRemoved(address _strategy);
    event MemberActivatedStrategy(address _member, address _strategy);
    event MemberDeactivatedStrategy(address _member, address _strategy);
    event StakeAmountUpdated(address _member, uint256 _newAmount);
    event BasisStakedAmountSet(uint256 _newAmount);
    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/

    modifier onlyCouncilSafe() {
        if (!hasRole(COUNCIL_MEMBER_CHANGE, msg.sender)) {
            revert UserNotInCouncil();
        }
        _;
    }

    modifier onlyRegistryMemberSender() {
        if (!isMember(msg.sender)) {
            revert UserNotInRegistry();
        }
        _;
    }

    modifier onlyRegistryMemberAddress(address _sender) {
        if (!isMember(_sender)) {
            revert UserNotInRegistry();
        }
        _;
    }

    modifier onlyStrategyEnabled(address _strategy) {
        if (!enabledStrategies[_strategy]) {
            revert StrategyDisabled();
        }
        _;
    }
    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/

    error AddressCannotBeZero();
    error RegistryCannotBeZero();
    error UserNotInCouncil();
    error UserNotInRegistry();
    error UserAlreadyRegistered();
    error UserNotGardenOwner();
    error UserAlreadyActivated();
    error UserAlreadyDeactivated();
    error StrategyExists();
    error StrategyDisabled();
    error CallerIsNotNewOnwer();
    error ValueCannotBeZero();
    error KickNotEnabled();

    /*|--------------------------------------------|*o
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/
    struct Member {
        address member;
        uint256 stakedAmount;
        bool isRegistered;
    }

    struct InitializeParams {
        address _allo;
        IERC20 _gardenToken;
        uint256 _registerStakeAmount;
        uint256 _protocolFee; //@todo if remove the protocol fee, also remove it here
        uint256 _nonce;
        Metadata _metadata;
        address payable _councilSafe;
        string _communityName;
        bool _isKickEnabled;
    }

    //TODO: can change to uint32 with optimized storage order
    IAllo public allo;
    IRegistry public registry;
    IERC20 public gardenToken;

    uint256 public registerStakeAmount;
    uint256 public protocolFee;
    bytes32 public profileId;
    bool public isKickEnabled;

    address payable public pendingCouncilSafe; //@todo write test for change owner in 2 step
    Safe public councilSafe;

    string public communityName; //@todo comunityName is never defined, need be get from metadata probably.
    string private covenantIpfsHash;

    mapping(address => bool) public tribunalMembers;

    mapping(address => Member) public addressToMemberInfo;
    mapping(address => bool) public enabledStrategies;
    mapping(address => mapping(address => bool)) public memberActivatedInStrategies;
    mapping(address => uint256) public totalPointsActivatedInStrategy;

    uint256 public constant DEFAULT_POINTS = 100;

    constructor() {
        // _grantRole(DEFAULT_ADMIN_ROLE, address(this));
        _setRoleAdmin(COUNCIL_MEMBER_CHANGE, DEFAULT_ADMIN_ROLE);
    }

    function initialize(RegistryCommunity.InitializeParams memory params) public {
        revertZeroAddress(address(params._gardenToken));
        revertZeroAddress(params._councilSafe);
        revertZeroAddress(params._allo);

        allo = IAllo(params._allo);
        gardenToken = params._gardenToken;
        if (params._registerStakeAmount == 0) {
            revert ValueCannotBeZero();
        }
        registerStakeAmount = params._registerStakeAmount; //@todo can be zero?
        protocolFee = params._protocolFee;
        isKickEnabled = params._isKickEnabled;
        communityName = params._communityName;

        councilSafe = Safe(params._councilSafe);
        _grantRole(COUNCIL_MEMBER_CHANGE, params._councilSafe);

        registry = IRegistry(allo.getRegistry());

        address[] memory initialMembers = new address[](1);
        initialMembers[0] = address(councilSafe);

        profileId =
            registry.createProfile(params._nonce, communityName, params._metadata, address(this), initialMembers);

        emit RegistryInitialized(profileId, communityName, params._metadata);
    }

    function activateMemberInStrategy(address _member, address _strategy)
        public
        onlyRegistryMemberAddress(_member)
        onlyStrategyEnabled(_strategy)
    {
        revertZeroAddress(_strategy);

        if (memberActivatedInStrategies[_member][_strategy]) {
            revert UserAlreadyActivated();
        }

        memberActivatedInStrategies[_member][_strategy] = true;
        totalPointsActivatedInStrategy[_strategy] += DEFAULT_POINTS;

        emit MemberActivatedStrategy(_member, _strategy);
    }

    function deactivateMemberInStrategy(address _member, address _strategy) public onlyRegistryMemberAddress(_member) {
        revertZeroAddress(_strategy);

        if (!memberActivatedInStrategies[_member][_strategy]) {
            revert UserAlreadyDeactivated();
        }

        memberActivatedInStrategies[_member][_strategy] = false;
        totalPointsActivatedInStrategy[_strategy] -= DEFAULT_POINTS;

        // emit StrategyRemoved(_strategy);
        emit MemberDeactivatedStrategy(_member, _strategy);
    }

    function addStrategy(address _newStrategy) public onlyCouncilSafe {
        if (enabledStrategies[_newStrategy]) {
            //@todo we dont use, if gonna use also write tests
            revert StrategyExists();
        }
        enabledStrategies[_newStrategy] = true;
        emit StrategyAdded(_newStrategy);
    }

    function revertZeroAddress(address _address) internal pure {
        if (_address == address(0)) revert AddressCannotBeZero();
    }

    function removeStrategy(address _strategy) public onlyCouncilSafe {
        revertZeroAddress(_strategy);
        enabledStrategies[_strategy] = false;
        emit StrategyRemoved(_strategy);
    }

    function setAllo(address _allo) public {
        allo = IAllo(_allo); //@todo if used, write tests
        emit AlloSet(_allo);
    }

    function setCouncilSafe(address payable _safe) public onlyCouncilSafe {
        revertZeroAddress(_safe);
        pendingCouncilSafe = _safe; //@todo write tests
        emit CouncilSafeChangeStarted(address(councilSafe), pendingCouncilSafe);
    }

    function _changeCouncilSafe() internal {
        councilSafe = Safe(pendingCouncilSafe);
        delete pendingCouncilSafe;
        emit CouncilSafeSet(pendingCouncilSafe);
    }

    function acceptCouncilSafe() public {
        if (msg.sender != pendingCouncilSafe) {
            revert CallerIsNotNewOnwer();
        }
        _changeCouncilSafe();
    }

    function isMember(address _member) public view returns (bool _isMember) {
        Member memory newMember = addressToMemberInfo[_member];
        return newMember.isRegistered;
    }

    function stakeAndRegisterMember() public nonReentrant {
        address _member = msg.sender;
        Member storage newMember = addressToMemberInfo[_member];
        if (!isMember(_member)) {
            newMember.isRegistered = true;

            newMember.stakedAmount = registerStakeAmount;

            gardenToken.transferFrom(_member, address(this), registerStakeAmount);

            emit MemberRegistered(_member, registerStakeAmount);
        }
    }

    function modifyStakeAmount(uint256 newTotalAmount) public payable nonReentrant onlyRegistryMemberSender {
        Member storage member = addressToMemberInfo[msg.sender];
        uint256 oldAmount = member.stakedAmount;
        member.stakedAmount = newTotalAmount;
        //if the user increases his staking amount he will receive GARD tokens as a reward
        if (oldAmount < newTotalAmount) {
            gardenToken.transfer(msg.sender, newTotalAmount - oldAmount);
        }
        //if the user reduce his staking amount he will lose some GARD tokens
        else {
            gardenToken.transferFrom(address(this), msg.sender, oldAmount - newTotalAmount);
        }

        emit StakeAmountUpdated(msg.sender, newTotalAmount);
    }

    function getBasisStakedAmount() external view returns (uint256) {
        return registerStakeAmount; //@todo need consider adding protocol fee or not here
    }

    function setBasisStakedAmount(uint256 _newAmount) external onlyCouncilSafe {
        registerStakeAmount = _newAmount;
        emit BasisStakedAmountSet(_newAmount);
    }

    function updateProtocolFee(uint256 _newProtocolFee) public onlyCouncilSafe {
        protocolFee = _newProtocolFee;
        emit ProtocolFeeUpdated(_newProtocolFee);
    }
    //function updateMinimumStake()

    function isCouncilMember(address _member) public view returns (bool) {
        return hasRole(COUNCIL_MEMBER_CHANGE, _member);
    }

    function unregisterMember() public nonReentrant {
        address _member = msg.sender;
        if (!isMember(_member)) {
            revert UserNotInRegistry();
        }
        Member memory member = addressToMemberInfo[_member];
        delete addressToMemberInfo[_member];

        gardenToken.transfer(_member, member.stakedAmount);
        emit MemberUnregistered(_member, member.stakedAmount);
    }

    function kickMember(address _member, address _transferAddress) public nonReentrant onlyCouncilSafe {
        if (!isKickEnabled) {
            revert KickNotEnabled();
        }
        if (!isMember(_member)) {
            revert UserNotInRegistry();
        }
        Member memory member = addressToMemberInfo[_member];
        delete addressToMemberInfo[_member];

        gardenToken.transfer(_transferAddress, member.stakedAmount);
        emit MemberKicked(_member, _transferAddress, member.stakedAmount);
    }
}
