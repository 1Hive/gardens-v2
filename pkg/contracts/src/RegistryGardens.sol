// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IAllo, Metadata} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {ISafe} from "./interfaces/ISafe.sol";

contract RegistryGardens is ReentrancyGuard {
    event StrategyAdded(address _strategy);
    event StrategyRemove(address _strategy);

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

    function addStrategy(address _newStrategy) public {
        require(isMember(msg.sender), "[Registry]: Sender must be a garden member");
        if (enabledStrategies[_newStrategy]) revert("[Registry]: Strategy already in allowed list");
        enabledStrategies[_newStrategy] = true;
        emit StrategyAdded(_newStrategy);
    }
    //TODO

    function setAllo(address _allo) public {
        allo = IAllo(_allo);
    }

    function setCouncilSafe(address _safe) public {
        require(msg.sender == gardenOwner, "Only the owner can call this method.");
        councilSafe = ISafe(_safe);
    }

    // function removeStrategy(address _strategy) {
    //     require(isGovernance(), "[Registry]: Caller is not the governance");
    //     enabledStrategies[_strategy] = false;
    //     emit StrategyRemoved(_strategy);

    // }

    function isMember(address _member) public view returns (bool _isMember) {
        Member storage newMember = addressToMemberInfo[_member];
        return newMember.isRegistered;
    }

    //Todo: change minimumStaked to fixedStakedAmount (==)
    //ADD fee when staking
    function stakeAndregisterMember() public payable nonReentrant {
        require(
            gardenToken.balanceOf(msg.sender) >= minimumStakeAmount,
            "[Registry]: Amount staked must be greater than minimum staked amount"
        );
        Member storage newMember = addressToMemberInfo[msg.sender];
        newMember.isRegistered = true;
        newMember.stakedAmount += minimumStakeAmount;
        gardenToken.transferFrom(msg.sender, address(this), minimumStakeAmount);
        //emit event
    }
    //Check use of payable and msg.value

    function modifyStakeAmount(uint256 newTotalAmount) public payable nonReentrant {
        require(isMember(msg.sender), "[Registry]: Must be member of garden");
        //How to transfer funds?
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
    }

    function getBasisStakedAmount() external view returns (uint256) {
        return 50;
    }

    //TODO
    //function updateProtocolFee()
    //function updateMinimumStake()
    function isCouncilMember(address _member) public view returns (bool) {
        return councilMembers[_member];
    }

    function unregisterMember(address _member) public nonReentrant {
        //TODO add require|| isCouncilMember()
        require(isMember(_member) || isCouncilMember(msg.sender), "[Registry]: Must be active member to unregister");
        Member memory member = addressToMemberInfo[msg.sender];
        delete addressToMemberInfo[msg.sender];
        gardenToken.transferFrom(address(this), msg.sender, member.stakedAmount);
        //We can do it like that too to keep track
        //We can also
        //member.isregistered = false;
    }
}
