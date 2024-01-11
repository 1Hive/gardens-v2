// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IAllo, Metadata} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";

import {Safe} from "safe-contracts/contracts/Safe.sol";

import "forge-std/console.sol";

contract RegistryGardens is ReentrancyGuard, AccessControl {
    // todo rename all RegistryGardens to RegistryCommunity
    /*|--------------------------------------------|*/
    /*|                 ROLES                      |*/
    /*|--------------------------------------------|*/
    bytes32 public constant COUNCIL_MEMBER_CHANGE = keccak256("COUNCIL_MEMBER_CHANGE");
    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    event StrategyAdded(address _strategy);
    event StrategyRemoved(address _strategy);
    event MemberRegistered(address _member, uint256 _amountStaked);
    event MemberUnregistered(address _member, uint256 _amountReturned);
    event StakeAmountUpdated(address _member, uint256 _newAmount);
    event CouncilSafeSet(address _safe);
    event CouncilSafeChangeStarted(address _safeOwner, address _newSafeOwner);
    event ProtocolFeeUpdated(uint256 _newFee);
    event AlloSet(address _allo);
    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/

    modifier onlyCouncilMember() {
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
    error StrategyExists();
    error StrategyDisabled();
    error CallerIsNotNewOnwer();
    error ValueCannotBeZero();

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
        uint256 _minimumStakeAmount;
        uint256 _protocolFee; //@todo if remove the protocol fee, also remove it here
        uint256 _nonce;
        Metadata _metadata;
        address payable _councilSafe;
    }

    //TODO: can change to uint32 with optimized storage order
    IAllo public allo;
    IRegistry public registry;
    IERC20 public gardenToken;

    uint256 fixedStakeAmount;
    uint256 public protocolFee;
    bytes32 public profileId;

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

    function initialize(RegistryGardens.InitializeParams memory params) public {
        revertZeroAddress(address(params._gardenToken));
        revertZeroAddress(params._councilSafe);

        allo = IAllo(params._allo);
        gardenToken = params._gardenToken;
        if (params._minimumStakeAmount == 0) {
            revert ValueCannotBeZero();
        }
        fixedStakeAmount = params._minimumStakeAmount; //@todo can be zero?
        protocolFee = params._protocolFee;

        councilSafe = Safe(params._councilSafe);
        _grantRole(COUNCIL_MEMBER_CHANGE, params._councilSafe);

        registry = IRegistry(allo.getRegistry());
        address[] memory initialMembers = new address[](0);
        profileId = registry.createProfile(params._nonce, communityName, params._metadata, msg.sender, initialMembers);
        //@todo emit events
    }

    function activateMemberInStrategy(address _member, address _strategy) public onlyRegistryMemberAddress(_member) {
        revertZeroAddress(_strategy);

        if (memberActivatedInStrategies[_member][_strategy]) {
            revert UserAlreadyActivated();
        }

        memberActivatedInStrategies[_member][_strategy] = true;
        totalPointsActivatedInStrategy[_strategy] += DEFAULT_POINTS;

        emit StrategyAdded(_strategy);
    }

    function addStrategy(address _newStrategy) public onlyCouncilMember {
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

    function removeStrategy(address _strategy) public onlyCouncilMember {
        revertZeroAddress(_strategy);
        enabledStrategies[_strategy] = false;
        emit StrategyRemoved(_strategy);
    }

    function setAllo(address _allo) public {
        allo = IAllo(_allo); //@todo if used, write tests
        emit AlloSet(_allo);
    }

    function setCouncilSafe(address payable _safe) public onlyCouncilMember {
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

    function stakeAndRegisterMember() public {
        stakeAndRegisterMember(msg.sender);
    }
    //Todo: change minimumStaked to fixedStakedAmount (==)
    //ADD fee when staking

    function stakeAndRegisterMember(address _member) public nonReentrant {
        console.log("msg.sender", msg.sender);
        console.log("msg.sender", _member);
        Member storage newMember = addressToMemberInfo[_member];
        //Check if already member
        newMember.isRegistered = true;
        newMember.stakedAmount = fixedStakeAmount;
        // gardenToken.transferFrom(msg.sender, address(this), minimumStakeAmount);
        emit MemberRegistered(_member, fixedStakeAmount);
    }
    //Check use of payable and msg.value

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
        return fixedStakeAmount; //@todo need consider adding protocol fee or not here
    }

    function setBasisStakedAmount(uint256 _newAmount) external onlyCouncilMember {
        fixedStakeAmount = _newAmount;
    }

    function updateProtocolFee(uint256 _newProtocolFee) public onlyCouncilMember {
        protocolFee = _newProtocolFee;
        emit ProtocolFeeUpdated(_newProtocolFee);
    }
    //function updateMinimumStake()

    function isCouncilMember(address _member) public view returns (bool) {
        return hasRole(COUNCIL_MEMBER_CHANGE, _member);
    }

    function unregisterMember(address _member) public nonReentrant {
        //@todo create test for this function
        require(isMember(_member) || isCouncilMember(msg.sender), "[Registry]: Must be active member to unregister");
        Member memory member = addressToMemberInfo[msg.sender];
        delete addressToMemberInfo[msg.sender];
        gardenToken.transfer(msg.sender, member.stakedAmount);
        emit MemberUnregistered(msg.sender, member.stakedAmount);
    }
}
