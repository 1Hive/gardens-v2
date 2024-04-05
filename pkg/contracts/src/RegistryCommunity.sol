// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import {Metadata} from "allo-v2-contracts/core/interfaces/IAllo.sol";
// import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry, Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {RegistryFactory} from "./RegistryFactory.sol";
import {ISafe} from "./ISafe.sol";
// import {Safe} from "safe-contracts/contracts/Safe.sol";
// import "forge-std/console.sol";
// import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {IPointStrategy, CVStrategy, StrategyStruct} from "./CVStrategy.sol";

// import {Native} from "allo-v2-contracts/core/libraries/Native.sol";

interface FAllo {
    function createPoolWithCustomStrategy(
        bytes32 _profileId,
        address _strategy,
        bytes memory _initStrategyData,
        address _token,
        uint256 _amount,
        Metadata memory _metadata,
        address[] memory _managers
    ) external payable returns (uint256 poolId);

    function getRegistry() external view returns (address);
}

contract RegistryCommunity is ReentrancyGuard, AccessControl {
    // using ERC165Checker for address;
    using SafeERC20 for IERC20;

    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
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
    event CommunityFeeUpdated(uint256 _newFee);
    event RegistryInitialized(bytes32 _profileId, string _communityName, Metadata _metadata);
    event StrategyAdded(address _strategy);
    event StrategyRemoved(address _strategy);
    event MemberActivatedStrategy(address _member, address _strategy);
    event MemberDeactivatedStrategy(address _member, address _strategy);
    event BasisStakedAmountSet(uint256 _newAmount);
    // event MemberPowerIncreased(address _member, address _strategy, uint256 _power);
    // event MemberPowerDecreased(address _member, address _strategy, uint256 _power);
    event PoolCreated(uint256 _poolId, address _strategy, address _community, address _token, Metadata _metadata);
    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/

    function onlyCouncilSafe() private view {
        if (!hasRole(COUNCIL_MEMBER_CHANGE, msg.sender)) {
            revert UserNotInCouncil();
        }
    }

    function onlyRegistryMemberSender() private view {
        if (!isMember(msg.sender)) {
            revert UserNotInRegistry();
        }
    }

    function onlyRegistryMemberAddress(address _sender) private view {
        if (!isMember(_sender)) {
            revert UserNotInRegistry();
        }
    }

    function onlyStrategyEnabled(address _strategy) private view {
        if (!enabledStrategies[_strategy]) {
            revert StrategyDisabled();
        }
    }

    function onlyActivatedInStrategy(address _strategy) private view {
        if (!memberActivatedInStrategies[msg.sender][_strategy]) {
            revert PointsDeactivated();
        }
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
    error PointsDeactivated();
    error DecreaseUnderMinimum();

    /*|--------------------------------------------|*o
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/
    struct Member {
        address member;
        uint256 stakedAmount;
        bool isRegistered;
    }

    struct Strategies {
        address[] strategies;
    }

    struct InitializeParams {
        address _allo;
        IERC20 _gardenToken;
        uint256 _registerStakeAmount;
        uint256 _communityFee; //@todo if remove the protocol fee, also remove it here
        uint256 _nonce;
        address _registryFactory;
        address _feeReceiver;
        Metadata _metadata;
        address payable _councilSafe;
        string _communityName;
        bool _isKickEnabled;
        string covenantIpfsHash;
    }

    //TODO: can change to uint32 with optimized storage order
    FAllo public allo;
    IRegistry public registry;
    IERC20 public gardenToken;

    uint256 public registerStakeAmount;
    uint256 public communityFee;
    address public feeReceiver;
    bytes32 public profileId;
    bool public isKickEnabled;
    address public registryFactory;

    address payable public pendingCouncilSafe; //@todo write test for change owner in 2 step
    ISafe public councilSafe;

    string public communityName;
    string public covenantIpfsHash; //@todo maybe should be bytes32

    mapping(address => bool) public tribunalMembers;

    mapping(address => Member) public addressToMemberInfo;
    mapping(address => bool) public enabledStrategies;
    mapping(address => mapping(address => bool)) public memberActivatedInStrategies;
    mapping(address => address[]) public strategiesByMember;
    //      strategy           member     power
    mapping(address => mapping(address => uint256)) public memberPowerInStrategy;

    address[] initialMembers;

    uint256 public constant PRECISION_SCALE = 10 ** 4;

    constructor() {
        // _grantRole(DEFAULT_ADMIN_ROLE, address(this));
        _setRoleAdmin(COUNCIL_MEMBER_CHANGE, DEFAULT_ADMIN_ROLE);
    }

    function initialize(RegistryCommunity.InitializeParams memory params) public {
        revertZeroAddress(address(params._gardenToken));
        revertZeroAddress(params._councilSafe);
        revertZeroAddress(params._allo);
        revertZeroAddress(params._registryFactory);

        allo = FAllo(params._allo);
        gardenToken = params._gardenToken;
        if (params._registerStakeAmount == 0) {
            revert ValueCannotBeZero();
        }
        registerStakeAmount = params._registerStakeAmount; //@todo can be zero?
        communityFee = params._communityFee;
        isKickEnabled = params._isKickEnabled;
        communityName = params._communityName;
        covenantIpfsHash = params.covenantIpfsHash;
        registryFactory = params._registryFactory;
        feeReceiver = params._feeReceiver;
        councilSafe = ISafe(params._councilSafe);
        _grantRole(COUNCIL_MEMBER_CHANGE, params._councilSafe);

        registry = IRegistry(allo.getRegistry());

        address[] memory owners = councilSafe.getOwners();
        address[] memory pool_initialMembers = new address[](owners.length + 2);

        for (uint256 i = 0; i < owners.length; i++) {
            pool_initialMembers[i] = owners[i];
        }

        pool_initialMembers[pool_initialMembers.length - 1] = address(councilSafe);
        pool_initialMembers[pool_initialMembers.length - 2] = address(this);

        // console.log("initialMembers length", pool_initialMembers.length);
        profileId =
            registry.createProfile(params._nonce, communityName, params._metadata, address(this), pool_initialMembers);

        initialMembers = pool_initialMembers;

        emit RegistryInitialized(profileId, communityName, params._metadata);
    }

    function createPool(
        address _strategy,
        address _token,
        StrategyStruct.InitializeParams memory _params,
        Metadata memory _metadata
    ) public returns (uint256 poolId, address strategy) {
        address token = NATIVE;
        if (_token != address(0)) {
            token = _token;
        }
        strategy = _strategy;

        address[] memory _pool_managers = initialMembers;

        poolId = allo.createPoolWithCustomStrategy(
            profileId, strategy, abi.encode(_params), token, 0, _metadata, _pool_managers
        );

        emit PoolCreated(poolId, strategy, address(this), _token, _metadata);
    }

    function activateMemberInStrategy(address _member, address _strategy) public 
    // onlyRegistryMemberAddress(_member)
    // onlyStrategyEnabled(_strategy)
    {
        onlyRegistryMemberAddress(_member);
        onlyStrategyEnabled(_strategy);
        revertZeroAddress(_strategy);

        if (memberActivatedInStrategies[_member][_strategy]) {
            revert UserAlreadyActivated();
        }
  
        uint256 pointsPerMember = IPointStrategy(_strategy).getPointsPerMember(); //@kev can be zero for some kind strategies

        Member memory member = addressToMemberInfo[_member];

        uint256 extraStakedAmount = member.stakedAmount - registerStakeAmount;
        uint256 pointsToIncrease = 0;
        if (extraStakedAmount > 0) {
            
            if(IPointStrategy(_strategy).getPointSystem() == 3){
            memberPowerInStrategy[_member][_strategy] = pointsPerMember;
            pointsToIncrease = IPointStrategy(_strategy).increasePower(_member,0);
            }
            else{
            pointsToIncrease = IPointStrategy(_strategy).increasePower(_member, extraStakedAmount);
            }
        }

        if (pointsPerMember > 0 || pointsToIncrease > 0) {
            memberPowerInStrategy[_member][_strategy] = pointsPerMember + pointsToIncrease; // can be all zero
        }
        memberActivatedInStrategies[_member][_strategy] = true;

        strategiesByMember[_member].push(_strategy);

        emit MemberActivatedStrategy(_member, _strategy);
    }

    function deactivateMemberInStrategy(address _member, address _strategy) public {
        onlyRegistryMemberAddress(_member);
        revertZeroAddress(_strategy);

        if (!memberActivatedInStrategies[_member][_strategy]) {
            revert UserAlreadyDeactivated();
        }

        memberActivatedInStrategies[_member][_strategy] = false;
        memberPowerInStrategy[_member][_strategy] = 0;
        removeStrategyFromMember(_member, _strategy);
        //totalPointsActivatedInStrategy[_strategy] -= DEFAULT_POINTS;
        // emit StrategyRemoved(_strategy);
        emit MemberDeactivatedStrategy(_member, _strategy);
    }

    function removeStrategyFromMember(address _member, address _strategy) internal {
        address[] storage memberStrategies = strategiesByMember[_member];
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            if (memberStrategies[i] == _strategy) {
                memberStrategies[i] = memberStrategies[memberStrategies.length - 1];
                memberStrategies.pop();
            }
        }
    }

    function increasePower(uint256 _amountStaked) public nonReentrant {
        onlyRegistryMemberSender();
        address member = msg.sender;
        address[] memory memberStrategies = strategiesByMember[member];

        uint256 pointsToIncrease;
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            //FIX support interface check
            //if (address(memberStrategies[i]) == _strategy) {
            pointsToIncrease = IPointStrategy(memberStrategies[i]).increasePower(member, _amountStaked);
            if (pointsToIncrease != 0) {
                memberPowerInStrategy[member][memberStrategies[i]] += pointsToIncrease;
            }
            //}
        }

        gardenToken.safeTransferFrom(member, address(this), _amountStaked);
        addressToMemberInfo[member].stakedAmount += _amountStaked;
    }

    /*
    * @notice Decrease the power of a member in a strategy
    * @param _amountUnstaked The amount of tokens to unstake
    */
    function decreasePower(uint256 _amountUnstaked) public nonReentrant {
        onlyRegistryMemberSender();
        address member = msg.sender;
        address[] memory memberStrategies = strategiesByMember[member];

        uint256 pointsToDecrease;

        if (addressToMemberInfo[member].stakedAmount - _amountUnstaked < registerStakeAmount) {
            revert DecreaseUnderMinimum();
        }
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            // if (address(memberStrategies[i]) == _strategy) {
            pointsToDecrease = IPointStrategy(memberStrategies[i]).decreasePower(member, _amountUnstaked);
            memberPowerInStrategy[member][memberStrategies[i]] -= pointsToDecrease;
            // }
        }
        gardenToken.safeTransfer(member, _amountUnstaked);
        addressToMemberInfo[member].stakedAmount -= _amountUnstaked;
    }

    function getMemberPowerInStrategy(address _member, address _strategy) public view returns (uint256) {
        return memberPowerInStrategy[_member][_strategy];
    }

    function getMemberStakedAmount(address _member) public view returns (uint256) {
        return addressToMemberInfo[_member].stakedAmount;
    }

    // function getGardenTokenDecimals() public view returns (uint256){
    //     return gardenToken.decimals();
    // }

    function addStrategy(address _newStrategy) public {
        onlyCouncilSafe();
        if (enabledStrategies[_newStrategy]) {
            revert StrategyExists();
        }
        enabledStrategies[_newStrategy] = true;
        emit StrategyAdded(_newStrategy);
    }

    function revertZeroAddress(address _address) internal pure {
        if (_address == address(0)) revert AddressCannotBeZero();
    }

    function removeStrategy(address _strategy) public {
        onlyCouncilSafe();
        revertZeroAddress(_strategy);
        enabledStrategies[_strategy] = false;
        emit StrategyRemoved(_strategy);
    }

    function setAllo(address _allo) public {
        allo = FAllo(_allo); //@todo if used, write tests
        emit AlloSet(_allo);
    }

    function setCouncilSafe(address payable _safe) public {
        onlyCouncilSafe();
        revertZeroAddress(_safe);
        pendingCouncilSafe = _safe; //@todo write tests
        emit CouncilSafeChangeStarted(address(councilSafe), pendingCouncilSafe);
    }

    function _changeCouncilSafe() internal {
        councilSafe = ISafe(pendingCouncilSafe);
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
        RegistryFactory gardensFactory = RegistryFactory(registryFactory);
        uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
        uint256 gardensFeeAmount =
            (registerStakeAmount * gardensFactory.getProtocolFee(address(this))) / (100 * PRECISION_SCALE);
        if (!isMember(_member)) {
            newMember.isRegistered = true;

            newMember.stakedAmount = registerStakeAmount;
            gardenToken.safeTransferFrom(
                _member, address(this), registerStakeAmount + communityFeeAmount + gardensFeeAmount
            );
            //TODO: Test if revert because of approve on contract, if doesnt work, transfer all to this contract, and then transfer to each receiver
            //individually. Check vulnerabilites for that with Felipe
            // gardenToken.approve(feeReceiver,communityFeeAmount);
            //Error: ProtocolFee is equal to zero
            if (communityFeeAmount > 0) {
                gardenToken.safeTransfer(feeReceiver, communityFeeAmount);
            }
            // gardenToken.approve(gardensFactory.getGardensFeeReceiver(),gardensFeeAmount);
            if (gardensFeeAmount > 0) {
                gardenToken.safeTransfer(gardensFactory.getGardensFeeReceiver(), gardensFeeAmount);
            }

            emit MemberRegistered(_member, registerStakeAmount);
        }
    }

    function getStakeAmountWithFees() public view returns (uint256) {
        RegistryFactory gardensFactory = RegistryFactory(registryFactory);
        uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
        uint256 gardensFeeAmount =
            (registerStakeAmount * gardensFactory.getProtocolFee(address(this))) / (100 * PRECISION_SCALE);

        return registerStakeAmount + communityFeeAmount + gardensFeeAmount;
    }

    function getBasisStakedAmount() external view returns (uint256) {
        return registerStakeAmount;
    }

    function setBasisStakedAmount(uint256 _newAmount) external {
        onlyCouncilSafe();
        registerStakeAmount = _newAmount;
        emit BasisStakedAmountSet(_newAmount);
    }

    function updateCommunityFee(uint256 _newCommunityFee) public {
        onlyCouncilSafe();
        communityFee = _newCommunityFee;
        emit CommunityFeeUpdated(_newCommunityFee);
    }
    //function updateMinimumStake()

    function isCouncilMember(address _member) public view returns (bool) {
        return hasRole(COUNCIL_MEMBER_CHANGE, _member);
    }

    function unregisterMember() public nonReentrant {
        address _member = msg.sender;
        onlyRegistryMemberAddress(_member);
        deactivateAllStrategies(_member);
        Member memory member = addressToMemberInfo[_member];
        delete addressToMemberInfo[_member];
        delete strategiesByMember[_member];

        gardenToken.transfer(_member, member.stakedAmount);
        emit MemberUnregistered(_member, member.stakedAmount);
    }

    function deactivateAllStrategies(address _member) internal {
        address[] memory memberStrategies = strategiesByMember[_member];
        // bytes4 interfaceId = IPointStrategy.withdraw.selector;
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            //FIX support interface check
            //if(memberStrategies[i].supportsInterface(interfaceId)){
            IPointStrategy(memberStrategies[i]).deactivatePoints(_member);
        }
    }

    function kickMember(address _member, address _transferAddress) public nonReentrant {
        onlyCouncilSafe();
        if (!isKickEnabled) {
            revert KickNotEnabled();
        }
        if (!isMember(_member)) {
            revert UserNotInRegistry();
        }
        Member memory member = addressToMemberInfo[_member];
        deactivateAllStrategies(_member);
        delete addressToMemberInfo[_member];

        gardenToken.transfer(_transferAddress, member.stakedAmount);
        emit MemberKicked(_member, _transferAddress, member.stakedAmount);
    }
}
