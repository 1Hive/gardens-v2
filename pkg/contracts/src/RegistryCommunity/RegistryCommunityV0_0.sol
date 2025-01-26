// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {AccessControlUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";

import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";
import {IRegistry, Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {FAllo} from "../interfaces/FAllo.sol";
import {ISafe} from "../interfaces/ISafe.sol";
import {IRegistryFactory} from "../IRegistryFactory.sol";
import {
    CVStrategyV0_0,
    IPointStrategy,
    CVStrategyInitializeParamsV0_1,
    PointSystem
} from "../CVStrategy/CVStrategyV0_0.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {ISybilScorer} from "../ISybilScorer.sol";

/*|--------------------------------------------|*/
/*|              STRUCTS/ENUMS                 |*/
/*|--------------------------------------------|*/

/// @dev Initialize parameters for the contract
/// @param _allo The Allo contract address
/// @param _gardenToken The token used to stake in the community
/// @param _registerStakeAmount The amount of tokens required to register a member
/// @param _communityFee The fee charged to the community for each registration
/// @param _nonce The nonce used to create new strategy clones
/// @param _registryFactory The address of the registry factory
/// @param _feeReceiver The address that receives the community fee
/// @param _metadata The covenant IPFS hash of the community
/// @param _councilSafe The council safe contract address
/// @param _communityName The community name
/// @param _isKickEnabled Enable or able the kick feature
struct RegistryCommunityInitializeParamsV0_0 {
    address _allo;
    IERC20 _gardenToken;
    uint256 _registerStakeAmount;
    uint256 _communityFee;
    uint256 _nonce;
    address _registryFactory;
    address _feeReceiver;
    Metadata _metadata;
    address payable _councilSafe;
    string _communityName;
    bool _isKickEnabled;
    string covenantIpfsHash;
}

struct Member {
    address member;
    uint256 stakedAmount;
    bool isRegistered;
}

struct CommunityParams {
    address councilSafe;
    address feeReceiver;
    uint256 communityFee;
    string communityName;
    // Empty community only params
    uint256 registerStakeAmount;
    bool isKickEnabled;
    string covenantIpfsHash;
}

struct Strategies {
    address[] strategies;
}

/// @custom:oz-upgrades-from RegistryCommunityV0_0
contract RegistryCommunityV0_0 is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    event CouncilSafeUpdated(address _safe);
    event CouncilSafeChangeStarted(address _safeOwner, address _newSafeOwner);
    event MemberRegistered(address _member, uint256 _amountStaked);
    event MemberRegisteredWithCovenant(address _member, uint256 _amountStaked, string _covenantSig);
    event MemberUnregistered(address _member, uint256 _amountReturned);
    event MemberKicked(address _member, address _transferAddress, uint256 _amountReturned);
    event CommunityFeeUpdated(uint256 _newFee);
    event RegistryInitialized(bytes32 _profileId, string _communityName, Metadata _metadata);
    event StrategyAdded(address _strategy);
    event StrategyRemoved(address _strategy);
    event MemberActivatedStrategy(address _member, address _strategy, uint256 _pointsToIncrease);
    event MemberDeactivatedStrategy(address _member, address _strategy);
    event BasisStakedAmountUpdated(uint256 _newAmount);
    event MemberPowerIncreased(address _member, uint256 _stakedAmount);
    event MemberPowerDecreased(address _member, uint256 _unstakedAmount);
    event CommunityNameUpdated(string _communityName);
    event CovenantIpfsHashUpdated(string _covenantIpfsHash);
    event KickEnabledUpdated(bool _isKickEnabled);
    event FeeReceiverChanged(address _feeReceiver);
    event PoolCreated(uint256 _poolId, address _strategy, address _community, address _token, Metadata _metadata); // 0x778cac0a
    event PoolRejected(address _strategy);

    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/

    error AllowlistTooBig(uint256 size);
    // error AddressCannotBeZero();
    error OnlyEmptyCommunity(uint256 totalMembers);
    error UserNotInCouncil(address _user);
    error UserNotInRegistry();
    error UserAlreadyActivated();
    error UserAlreadyDeactivated();
    error StrategyExists();
    error StrategyDisabled();
    error SenderNotNewOwner();
    error SenderNotStrategy();
    error ValueCannotBeZero();
    error NewFeeGreaterThanMax();
    error KickNotEnabled();
    error PointsDeactivated();
    error DecreaseUnderMinimum();
    error CantDecreaseMoreThanPower(uint256 _decreaseAmount, uint256 _currentPower);

    using ERC165Checker for address;
    using SafeERC20 for IERC20;
    using Clone for address;

    string public constant VERSION = "0.0";
    /// @notice The native address to represent native token eg: ETH in mainnet
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    /// @notice The precision scale used in the contract to avoid loss of precision
    uint256 public constant PRECISION_SCALE = 10 ** 4;
    /// @notice The maximum fee that can be charged to the community
    uint256 public constant MAX_FEE = 10 * PRECISION_SCALE;
    /// @notice The amount of tokens required to register a member
    uint256 public registerStakeAmount;
    /// @notice The fee charged to the community for each registration
    uint256 public communityFee;
    /// @notice The nonce used to create new strategy clones
    uint256 public cloneNonce;
    /// @notice The profileId of the community in the Allo Registry
    bytes32 public profileId;
    /// @notice Enable or disable the kick feature
    bool public isKickEnabled;

    /// @notice The address that receives the community fee
    address public feeReceiver;
    /// @notice The address of the registry factory
    address public registryFactory;
    /// @notice The address of the collateral vault template
    address public collateralVaultTemplate;
    /// @notice The address of the strategy template
    address public strategyTemplate;
    /// @notice The address of the pending council safe owner
    address payable public pendingCouncilSafe;

    /// @notice The Registry Allo contract
    IRegistry public registry;
    /// @notice The token used to stake in the community
    IERC20 public gardenToken;
    /// @notice The council safe contract address
    ISafe public councilSafe;
    /// @notice The Allo contract address
    FAllo public allo;

    /// @notice The community name
    string public communityName;
    /// @notice The covenant IPFS hash of community
    string public covenantIpfsHash;

    // mapping(address => bool) public tribunalMembers;

    /// @notice List of enabled/disabled strategies
    mapping(address strategy => bool isEnabled) public enabledStrategies;
    /// @notice Power points for each member in each strategy
    mapping(address strategy => mapping(address member => uint256 power)) public memberPowerInStrategy;
    /// @notice Member information as the staked amount and if is registered in the community
    mapping(address member => Member) public addressToMemberInfo;
    /// @notice List of strategies for each member are activated
    mapping(address member => address[] strategiesAddresses) public strategiesByMember;
    /// @notice Mapping to check if a member is activated in a strategy
    mapping(address member => mapping(address strategy => bool isActivated)) public memberActivatedInStrategies;

    /// @notice List of initial members to be added as pool managers in the Allo Pool
    address[] initialMembers;

    /// @notice The total number of members in the community
    uint256 public totalMembers;

    /*|--------------------------------------------|*/
    /*|                 ROLES                      |*/
    /*|--------------------------------------------|*/
    /// @notice Role to council safe members
    bytes32 public constant COUNCIL_MEMBER = keccak256("COUNCIL_MEMBER");

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/

    function onlyCouncilSafe() internal view virtual {
        if (!hasRole(COUNCIL_MEMBER, msg.sender)) {
            revert UserNotInCouncil(msg.sender);
        }
    }

    function onlyRegistryMemberSender() internal view virtual {
        if (!isMember(msg.sender)) {
            revert UserNotInRegistry();
        }
    }

    function onlyRegistryMemberAddress(address _sender) internal view {
        if (!isMember(_sender)) {
            revert UserNotInRegistry();
        }
    }

    function onlyStrategyEnabled(address _strategy) public view {
        if (!enabledStrategies[_strategy]) {
            revert StrategyDisabled();
        }
    }

    function onlyEmptyCommunity() internal view {
        if (totalMembers > 0) {
            revert OnlyEmptyCommunity(totalMembers);
        }
    }

    function onlyStrategyAddress(address _sender, address _strategy) internal pure {
        if (_sender != _strategy) {
            revert SenderNotStrategy();
        }
    }

    function onlyActivatedInStrategy(address _strategy) internal view {
        if (!memberActivatedInStrategies[msg.sender][_strategy]) {
            revert PointsDeactivated();
        }
    }

    // function _revertZeroAddress(address _address) internal pure {
    //     if (_address == address(0)) revert AddressCannotBeZero();
    // }

    function setStrategyTemplate(address template) external onlyOwner {
        strategyTemplate = template;
    }

    function setCollateralVaultTemplate(address template) external onlyOwner {
        collateralVaultTemplate = template;
    }

    // AUDIT: acknowledged upgradeable contract hat does not protect initialize functions,
    // slither-disable-next-line unprotected-upgrade
    function initialize(
        RegistryCommunityInitializeParamsV0_0 memory params,
        address _strategyTemplate,
        address _collateralVaultTemplate,
        address _owner
    ) public initializer {
        super.initialize(_owner);
        __ReentrancyGuard_init();
        __AccessControl_init();

        _setRoleAdmin(COUNCIL_MEMBER, DEFAULT_ADMIN_ROLE);

        // _revertZeroAddress(address(params._gardenToken));
        // _revertZeroAddress(params._councilSafe);
        // _revertZeroAddress(params._allo);
        // _revertZeroAddress(params._registryFactory);

        // if (params._communityFee != 0) {
        //     _revertZeroAddress(params._feeReceiver);
        // }
        allo = FAllo(params._allo);
        gardenToken = params._gardenToken;
        if (params._registerStakeAmount == 0) {
            revert ValueCannotBeZero();
        }
        registerStakeAmount = params._registerStakeAmount;
        communityFee = params._communityFee;
        isKickEnabled = params._isKickEnabled;
        communityName = params._communityName;
        covenantIpfsHash = params.covenantIpfsHash;

        registryFactory = params._registryFactory;
        feeReceiver = params._feeReceiver;
        councilSafe = ISafe(params._councilSafe);
        totalMembers = 0;

        _grantRole(COUNCIL_MEMBER, params._councilSafe);

        registry = IRegistry(allo.getRegistry());

        address[] memory pool_initialMembers;
        // Support EOA as coucil safe
        if (address(councilSafe).code.length == 0) {
            pool_initialMembers = new address[](3);
            pool_initialMembers[0] = msg.sender;
        } else {
            address[] memory owners = councilSafe.getOwners();
            pool_initialMembers = new address[](owners.length + 2);
            for (uint256 i = 0; i < owners.length; i++) {
                pool_initialMembers[i] = owners[i];
            }
        }

        pool_initialMembers[pool_initialMembers.length - 1] = address(councilSafe);
        pool_initialMembers[pool_initialMembers.length - 2] = address(this);

        // console.log("initialMembers length", pool_initialMembers.length);
        profileId =
            registry.createProfile(params._nonce, communityName, params._metadata, address(this), pool_initialMembers);

        initialMembers = pool_initialMembers;

        strategyTemplate = _strategyTemplate;
        collateralVaultTemplate = _collateralVaultTemplate;

        emit RegistryInitialized(profileId, communityName, params._metadata);
    }

    function createPool(address _token, CVStrategyInitializeParamsV0_1 memory _params, Metadata memory _metadata)
        public
        virtual
        returns (uint256 poolId, address strategy)
    {
        address strategyProxy = address(
            new ERC1967Proxy(
                address(strategyTemplate),
                abi.encodeWithSelector(
                    CVStrategyV0_0.init.selector, address(allo), collateralVaultTemplate, proxyOwner()
                )
            )
        );
        (poolId, strategy) = createPool(strategyProxy, _token, _params, _metadata);

        if (address(_params.sybilScorer) == address(0)) {
            if (_params.initialAllowlist.length > 10000) {
                revert AllowlistTooBig(_params.initialAllowlist.length);
            }
            bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
            for (uint256 i = 0; i < _params.initialAllowlist.length; i++) {
                _grantRole(allowlistRole, _params.initialAllowlist[i]);
            }
        }

        // Grant the strategy to grant for startegy specific allowlist
        _setRoleAdmin(
            keccak256(abi.encodePacked("ALLOWLIST", poolId)), keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId))
        );
        _grantRole(keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId)), strategy);
    }

    function createPool(
        address _strategy,
        address _token,
        CVStrategyInitializeParamsV0_1 memory _params,
        Metadata memory _metadata
    ) public virtual returns (uint256 poolId, address strategy) {
        address token = NATIVE;
        if (_token != address(0)) {
            token = _token;
        }
        strategy = _strategy;

        poolId = allo.createPoolWithCustomStrategy(
            profileId, strategy, abi.encode(_params), token, 0, _metadata, initialMembers
        );

        emit PoolCreated(poolId, strategy, address(this), _token, _metadata);
    }

    function activateMemberInStrategy(address _member, address _strategy) public virtual nonReentrant {
        onlyRegistryMemberAddress(_member);
        onlyStrategyEnabled(_strategy);
        onlyStrategyAddress(msg.sender, _strategy);
        // _revertZeroAddress(_strategy);

        if (memberActivatedInStrategies[_member][_strategy]) {
            revert UserAlreadyActivated();
        }

        Member memory member = addressToMemberInfo[_member];

        uint256 totalStakedAmount = member.stakedAmount;
        uint256 pointsToIncrease = registerStakeAmount;

        if (IPointStrategy(_strategy).getPointSystem() == PointSystem.Quadratic) {
            pointsToIncrease = IPointStrategy(_strategy).increasePower(_member, 0);
        } else if (IPointStrategy(_strategy).getPointSystem() != PointSystem.Fixed) {
            pointsToIncrease = IPointStrategy(_strategy).increasePower(_member, totalStakedAmount);
        }

        memberPowerInStrategy[_member][_strategy] = pointsToIncrease; // can be all zero
        memberActivatedInStrategies[_member][_strategy] = true;

        strategiesByMember[_member].push(_strategy);

        emit MemberActivatedStrategy(_member, _strategy, pointsToIncrease);
    }

    function deactivateMemberInStrategy(address _member, address _strategy) public virtual {
        onlyRegistryMemberAddress(_member);
        // _revertZeroAddress(_strategy);
        onlyStrategyAddress(msg.sender, _strategy);

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

    function removeStrategyFromMember(address _member, address _strategy) internal virtual {
        address[] storage memberStrategies = strategiesByMember[_member];
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            if (memberStrategies[i] == _strategy) {
                memberStrategies[i] = memberStrategies[memberStrategies.length - 1];
                memberStrategies.pop();
            }
        }
    }

    function increasePower(uint256 _amountStaked) public virtual nonReentrant {
        onlyRegistryMemberSender();
        address member = msg.sender;
        uint256 pointsToIncrease;

        for (uint256 i = 0; i < strategiesByMember[member].length; i++) {
            //FIX support interface check
            //if (address(strategiesByMember[member][i]) == _strategy) {
            pointsToIncrease = IPointStrategy(strategiesByMember[member][i]).increasePower(member, _amountStaked);
            if (pointsToIncrease != 0) {
                memberPowerInStrategy[member][strategiesByMember[member][i]] += pointsToIncrease;
                // console.log("Strategy power", memberPowerInStrategy[member][strategiesByMember[member][i]]);
            }
            //}
        }

        gardenToken.safeTransferFrom(member, address(this), _amountStaked);
        addressToMemberInfo[member].stakedAmount += _amountStaked;
        emit MemberPowerIncreased(member, _amountStaked);
    }

    /*
     * @notice Decrease the power of a member in a strategy
     * @param _amountUnstaked The amount of tokens to unstake
     */
    function decreasePower(uint256 _amountUnstaked) public virtual nonReentrant {
        onlyRegistryMemberSender();
        address member = msg.sender;
        address[] storage memberStrategies = strategiesByMember[member];

        uint256 pointsToDecrease;

        if (addressToMemberInfo[member].stakedAmount - _amountUnstaked < registerStakeAmount) {
            revert DecreaseUnderMinimum();
        }
        gardenToken.safeTransfer(member, _amountUnstaked);
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            address strategy = memberStrategies[i];
            if (strategy.supportsInterface(type(IPointStrategy).interfaceId)) {
                pointsToDecrease = IPointStrategy(strategy).decreasePower(member, _amountUnstaked);
                uint256 currentPower = memberPowerInStrategy[member][memberStrategies[i]];
                if (pointsToDecrease > currentPower) {
                    revert CantDecreaseMoreThanPower(pointsToDecrease, currentPower);
                } else {
                    memberPowerInStrategy[member][memberStrategies[i]] -= pointsToDecrease;
                }
            } else {
                // emit StrategyShouldBeRemoved(strategy, member);
                memberStrategies[i] = memberStrategies[memberStrategies.length - 1];
                memberStrategies.pop();
                _removeStrategy(strategy);
            }
            // }
        }
        addressToMemberInfo[member].stakedAmount -= _amountUnstaked;
        emit MemberPowerDecreased(member, _amountUnstaked);
    }

    function getMemberPowerInStrategy(address _member, address _strategy) public view virtual returns (uint256) {
        return memberPowerInStrategy[_member][_strategy];
    }

    function getMemberStakedAmount(address _member) public view virtual returns (uint256) {
        return addressToMemberInfo[_member].stakedAmount;
    }

    function addStrategyByPoolId(uint256 poolId) public virtual {
        onlyCouncilSafe();
        address strategy = address(allo.getPool(poolId).strategy);
        // _revertZeroAddress(strategy);
        if (strategy.supportsInterface(type(IPointStrategy).interfaceId)) {
            _addStrategy(strategy);
        }
    }

    function addStrategy(address _newStrategy) public virtual {
        onlyCouncilSafe();
        _addStrategy(_newStrategy);
    }

    function _addStrategy(address _newStrategy) internal virtual {
        if (enabledStrategies[_newStrategy]) {
            revert StrategyExists();
        }
        enabledStrategies[_newStrategy] = true;
        ISybilScorer sybilScorer = CVStrategyV0_0(payable(_newStrategy)).sybilScorer();
        if (address(sybilScorer) != address(0)) {
            sybilScorer.activateStrategy(_newStrategy);
        }
        emit StrategyAdded(_newStrategy);
    }

    function rejectPool(address _strategy) public virtual {
        onlyCouncilSafe();
        if (enabledStrategies[_strategy]) {
            _removeStrategy(_strategy);
        }
        emit PoolRejected(_strategy);
    }

    function removeStrategyByPoolId(uint256 poolId) public virtual {
        onlyCouncilSafe();
        address strategy = address(allo.getPool(poolId).strategy);
        // _revertZeroAddress(strategy);
        _removeStrategy(strategy);
    }

    function _removeStrategy(address _strategy) internal virtual {
        // _revertZeroAddress(_strategy);
        enabledStrategies[_strategy] = false;
        emit StrategyRemoved(_strategy);
    }

    function removeStrategy(address _strategy) public virtual {
        onlyCouncilSafe();
        _removeStrategy(_strategy);
    }

    function setCouncilSafe(address payable _safe) public virtual {
        onlyCouncilSafe();
        // _revertZeroAddress(_safe);
        pendingCouncilSafe = _safe;
        emit CouncilSafeChangeStarted(address(councilSafe), pendingCouncilSafe);
    }

    function acceptCouncilSafe() public virtual {
        if (msg.sender != pendingCouncilSafe) {
            revert SenderNotNewOwner();
        }
        _grantRole(COUNCIL_MEMBER, pendingCouncilSafe);
        _revokeRole(COUNCIL_MEMBER, address(councilSafe));
        councilSafe = ISafe(pendingCouncilSafe);
        delete pendingCouncilSafe;
        emit CouncilSafeUpdated(address(councilSafe));
    }

    function isMember(address _member) public view virtual returns (bool) {
        return addressToMemberInfo[_member].isRegistered;
    }

    function stakeAndRegisterMember(string memory covenantSig) public virtual nonReentrant {
        IRegistryFactory gardensFactory = IRegistryFactory(registryFactory);
        uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
        uint256 gardensFeeAmount =
            (registerStakeAmount * gardensFactory.getProtocolFee(address(this))) / (100 * PRECISION_SCALE);
        if (!isMember(msg.sender)) {
            addressToMemberInfo[msg.sender].isRegistered = true;

            addressToMemberInfo[msg.sender].stakedAmount = registerStakeAmount;
            // console.log("registerStakeAmount", registerStakeAmount);
            // console.log("gardenToken", address(gardenToken));

            gardenToken.safeTransferFrom(
                msg.sender, address(this), registerStakeAmount + communityFeeAmount + gardensFeeAmount
            );
            //TODO: Test if revert because of approve on contract, if doesnt work, transfer all to this contract, and then transfer to each receiver
            //individually. Check vulnerabilites for that with Felipe
            // gardenToken.approve(feeReceiver,communityFeeAmount);
            //Error: ProtocolFee is equal to zero
            // console.log("communityFeeAmount", communityFeeAmount);
            if (communityFeeAmount > 0) {
                // console.log("feeReceiver", feeReceiver);
                gardenToken.safeTransfer(feeReceiver, communityFeeAmount);
            }
            // console.log("gardensFeeAmount", gardensFeeAmount);
            if (gardensFeeAmount > 0) {
                // console.log("gardensFactory.getGardensFeeReceiver()", gardensFactory.getGardensFeeReceiver());
                gardenToken.safeTransfer(gardensFactory.getGardensFeeReceiver(), gardensFeeAmount);
            }
            totalMembers += 1;

            emit MemberRegisteredWithCovenant(msg.sender, registerStakeAmount, covenantSig);
        }
    }

    function getStakeAmountWithFees() public view virtual returns (uint256) {
        uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
        uint256 gardensFeeAmount = (
            registerStakeAmount * IRegistryFactory(registryFactory).getProtocolFee(address(this))
        ) / (100 * PRECISION_SCALE);

        return registerStakeAmount + communityFeeAmount + gardensFeeAmount;
    }

    function getBasisStakedAmount() external view virtual returns (uint256) {
        return registerStakeAmount;
    }

    function setBasisStakedAmount(uint256 _newAmount) public virtual {
        onlyCouncilSafe();
        onlyEmptyCommunity();
        registerStakeAmount = _newAmount;
        emit BasisStakedAmountUpdated(_newAmount);
    }

    function setCommunityParams(CommunityParams memory _params) external {
        onlyCouncilSafe();
        if (
            _params.registerStakeAmount != registerStakeAmount || _params.isKickEnabled != isKickEnabled
                || keccak256(bytes(_params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))
        ) {
            onlyEmptyCommunity();
            if (_params.registerStakeAmount != registerStakeAmount) {
                setBasisStakedAmount(_params.registerStakeAmount);
            }
            if (_params.isKickEnabled != isKickEnabled) {
                isKickEnabled = _params.isKickEnabled;
                emit KickEnabledUpdated(_params.isKickEnabled);
            }
            if (keccak256(bytes(_params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))) {
                covenantIpfsHash = _params.covenantIpfsHash;
                emit CovenantIpfsHashUpdated(_params.covenantIpfsHash);
            }
        }
        if (keccak256(bytes(_params.communityName)) != keccak256(bytes(communityName))) {
            communityName = _params.communityName;
            emit CommunityNameUpdated(_params.communityName);
        }
        if (_params.communityFee != communityFee) {
            setCommunityFee(_params.communityFee);
        }
        if (_params.feeReceiver != feeReceiver) {
            feeReceiver = _params.feeReceiver;
            emit FeeReceiverChanged(_params.feeReceiver);
        }
        if (_params.councilSafe != address(0)) {
            setCouncilSafe(payable(_params.councilSafe));
        }
    }

    function setCommunityFee(uint256 _newCommunityFee) public virtual {
        onlyCouncilSafe();
        // TODO: I dont think we want this to be restricted
        if (_newCommunityFee > MAX_FEE) {
            revert NewFeeGreaterThanMax();
        }
        communityFee = _newCommunityFee;
        emit CommunityFeeUpdated(_newCommunityFee);
    }

    function isCouncilMember(address _member) public view virtual returns (bool) {
        return hasRole(COUNCIL_MEMBER, _member);
    }

    function unregisterMember() public virtual nonReentrant {
        onlyRegistryMemberSender();
        address _member = msg.sender;
        deactivateAllStrategies(_member);
        Member memory member = addressToMemberInfo[_member];
        delete addressToMemberInfo[_member];
        delete strategiesByMember[_member];
        // In order to resync older contracts that skipped this counter until upgrade (community-params-editable)
        if (totalMembers > 0) {
            totalMembers -= 1;
        }
        gardenToken.safeTransfer(_member, member.stakedAmount);
        emit MemberUnregistered(_member, member.stakedAmount);
    }

    function deactivateAllStrategies(address _member) internal virtual {
        address[] memory memberStrategies = strategiesByMember[_member];
        // bytes4 interfaceId = IPointStrategy.withdraw.selector;
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            //FIX support interface check
            //if(memberStrategies[i].supportsInterface(interfaceId)){
            IPointStrategy(memberStrategies[i]).deactivatePoints(_member);
        }
    }

    function kickMember(address _member, address _transferAddress) public virtual nonReentrant {
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
        totalMembers -= 1;

        gardenToken.safeTransfer(_transferAddress, member.stakedAmount);
        emit MemberKicked(_member, _transferAddress, member.stakedAmount);
    }

    uint256[49] private __gap;
}
