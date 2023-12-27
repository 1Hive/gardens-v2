// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IAllo, Metadata} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {ISafe} from "./interfaces/ISafe.sol";

contract RegistryGardens is ReentrancyGuard {
    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/
    event StrategyAdded(address _strategy);
    event StrategyRemoved(address _strategy);
    event MemberRegistered(address _member, uint256 _amountStaked);
    event MemberUnregistered(address _member, uint256 _amountReturned);
    event StakeAmountUpdated(address _member, uint256 _newAmount);
    event CouncilMemberSet(address[] _councilMembers);
    event CouncilSafeSet(address _safe);
    event ProtocolFeeUpdated(uint256 _newFee);
    event AlloSet(address _allo);
    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/

    modifier onlyCouncilMember() {
        if (!isCouncilMember(msg.sender)) {
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

    modifier onlyGardenOwner() {
        if (msg.sender != gardenOwner) {
            revert UserNotGardenOwner();
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
    }

    //TODO: can change to uint32 with optimized storage order
    IAllo public allo;
    IRegistry public registry;
    string public communityName;
    uint256 minimumStakeAmount;
    IERC20 public gardenToken;
    uint256 public protocolFee;
    string private covenantIpfsHash;
    address private gardenOwner;
    bytes32 public profileId;

    ISafe public councilSafe;
    mapping(address => bool) public councilMembers;

    mapping(address => bool) public tribunalMembers;

    mapping(address => Member) public addressToMemberInfo;
    mapping(address => bool) public enabledStrategies;

    constructor() {}

    function initialize(RegistryGardens.InitializeParams memory params) public {
        allo = IAllo(params._allo);
        gardenToken = params._gardenToken;
        minimumStakeAmount = params._minimumStakeAmount;
        protocolFee = params._protocolFee;
        gardenOwner = msg.sender;
        registry = IRegistry(allo.getRegistry());
        address[] memory initialmembers = new address[](0);
        profileId = registry.createProfile(params._nonce, communityName, params._metadata, msg.sender, initialmembers);
    }

    function setCouncilMembers(address[] memory _members) public {}

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

    function setCouncilSafe(address _safe) public {
        require(msg.sender == gardenOwner, "Only the owner can call this method.");
        councilSafe = ISafe(_safe);
        emit CouncilSafeSet(_safe);
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

    function updateProtocolFee(uint256 _newProtocolFee) public {
        if (!isCouncilMember(msg.sender)) {
            revert("Must be in council safe");
        }
        protocolFee = _newProtocolFee;
        emit ProtocolFeeUpdated(_newProtocolFee);
    }
    //function updateMinimumStake()

    function isCouncilMember(address _member) public view returns (bool) {
        return councilMembers[_member];
    }

    function unregisterMember(address _member) public nonReentrant {
        require(isMember(_member) || isCouncilMember(msg.sender), "[Registry]: Must be active member to unregister");
        Member memory member = addressToMemberInfo[msg.sender];
        delete addressToMemberInfo[msg.sender];
        gardenToken.transfer(msg.sender, member.stakedAmount);
        emit MemberUnregistered(msg.sender, member.stakedAmount);
    }
}
