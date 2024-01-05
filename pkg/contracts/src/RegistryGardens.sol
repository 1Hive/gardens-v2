// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IAllo, Metadata} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";

import {Safe} from "safe-contracts/contracts/Safe.sol";

contract RegistryGardens is ReentrancyGuard, AccessControl {
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

    modifier onlyRegistryMember() {
        if (!isMember(msg.sender)) {
            revert UserNotInRegistry();
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
    error UserNotGardenOwner();
    error StrategyExists();
    error CallerIsNotNewOnwer();

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
        uint256 _protocolFee;
        uint256 _nonce;
        Metadata _metadata;
        address payable _councilSafe;
    }

    //TODO: can change to uint32 with optimized storage order
    IAllo public allo;
    IRegistry public registry;
    string public communityName;
    uint256 minimumStakeAmount;
    IERC20 public gardenToken;
    uint256 public protocolFee;
    string private covenantIpfsHash;
    bytes32 public profileId;

    address payable public pendingCouncilSafe;
    Safe public councilSafe;

    mapping(address => bool) public tribunalMembers;

    mapping(address => Member) public addressToMemberInfo;
    mapping(address => bool) public enabledStrategies;

    constructor() {
        // _grantRole(DEFAULT_ADMIN_ROLE, address(this));
        _setRoleAdmin(COUNCIL_MEMBER_CHANGE, DEFAULT_ADMIN_ROLE);
    }

    function initialize(RegistryGardens.InitializeParams memory params) public {
        allo = IAllo(params._allo);
        gardenToken = params._gardenToken;
        minimumStakeAmount = params._minimumStakeAmount;
        protocolFee = params._protocolFee;
        if (params._councilSafe == address(0)) {
            revert AddressCannotBeZero();
        }
        councilSafe = Safe(params._councilSafe);
        _grantRole(COUNCIL_MEMBER_CHANGE, params._councilSafe);

        // gardenOwner = msg.sender; //@todo: RegistryFactory is the onwer of that contract, that need be able to change the owner
        // gardenOwner = params.owner; //@todo: check if address(0) is a valid owner
        registry = IRegistry(allo.getRegistry());
        address[] memory initialmembers = new address[](0);
        profileId = registry.createProfile(params._nonce, communityName, params._metadata, msg.sender, initialmembers);
    }

    function addStrategy(address _newStrategy) public onlyRegistryMember {
        if (enabledStrategies[_newStrategy]) {
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
        allo = IAllo(_allo);
        emit AlloSet(_allo);
    }

    function setCouncilSafe(address payable _safe) public onlyCouncilMember {
        pendingCouncilSafe = _safe;
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

    //Todo: change minimumStaked to fixedStakedAmount (==)
    //ADD fee when staking
    function stakeAndregisterMember() public payable nonReentrant {
        Member storage newMember = addressToMemberInfo[msg.sender];
        require(
            //If fee percentage => minimumStakeAmount*protocolFee/100
            gardenToken.balanceOf(msg.sender) >= minimumStakeAmount + protocolFee,
            "[Registry]: Amount staked must be greater than minimum staked amount"
        );
        if (newMember.stakedAmount >= minimumStakeAmount) revert("already Staked");
        //Check if already member
        newMember.isRegistered = true;
        newMember.stakedAmount = minimumStakeAmount;
        gardenToken.transferFrom(msg.sender, address(this), minimumStakeAmount);
        emit MemberRegistered(msg.sender, minimumStakeAmount);
    }
    //Check use of payable and msg.value

    function modifyStakeAmount(uint256 newTotalAmount) public payable nonReentrant onlyRegistryMember {
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
        return minimumStakeAmount;
    }

    function setBasisStakedAmount(uint256 _newAmount) external onlyCouncilMember {
        minimumStakeAmount = _newAmount;
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
        require(isMember(_member) || isCouncilMember(msg.sender), "[Registry]: Must be active member to unregister");
        Member memory member = addressToMemberInfo[msg.sender];
        delete addressToMemberInfo[msg.sender];
        gardenToken.transfer(msg.sender, member.stakedAmount);
        emit MemberUnregistered(msg.sender, member.stakedAmount);
    }
}
