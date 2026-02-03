// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {
    ReentrancyGuardUpgradeable
} from "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {
    AccessControlUpgradeable
} from "openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";

import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";
import {IRegistry, Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {FAllo} from "../interfaces/FAllo.sol";
import {ISafe} from "../interfaces/ISafe.sol";
import {IRegistryFactory} from "../IRegistryFactory.sol";
import {CVStrategyInitializeParamsV0_2, PointSystem} from "../CVStrategy/ICVStrategy.sol";
import {CVStrategy} from "../CVStrategy/CVStrategy.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {ISybilScorer} from "../ISybilScorer.sol";

// Diamond Pattern imports
import {LibDiamond} from "../diamonds/libraries/LibDiamond.sol";
import {IDiamondCut} from "../diamonds/interfaces/IDiamondCut.sol";

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
struct RegistryCommunityInitializeParams {
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

/// @custom:oz-upgrades-from RegistryCommunity
// slither-disable-start uninitialized-state
contract RegistryCommunity is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
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
    event CommunityArchived(bool _archived);

    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/

    error AllowlistTooBig(uint256 size); // 0x83d888a8
    error OnlyEmptyCommunity(uint256 totalMembers); // 0xfb2aa73e
    error UserNotInCouncil(address _user); // 0xfc4be72f
    error UserNotInRegistry(); // 0x6a5cfb6d
    error UserAlreadyActivated(); // 0xd5b9bc96
    error StrategyExists(); // 0x968a4d2c
    error StrategyDisabled(); // 0x46c26e4b
    error SenderNotNewOwner(); // 0xebcd0d6e
    error SenderNotStrategy(); // 0xbbe79611
    error ValueCannotBeZero(); // 0xc70d18aa
    error NewFeeGreaterThanMax(); // 0xfe925f7d
    error KickNotEnabled(); // 0xcb63dc72
    error PointsDeactivated(); // 0xd4d3290e
    error DecreaseUnderMinimum(); // 0x9c47d02e
    error CantDecreaseMoreThanPower(uint256 _decreaseAmount, uint256 _currentPower); // 0x8a11f318
    error CommunityFunctionDoesNotExist(bytes4 selector); // 0x8e2ba36a

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

    /// @notice Facet configuration for CVStrategy instances
    IDiamondCut.FacetCut[] internal strategyFacetCuts;
    address internal strategyInit;
    bytes internal strategyInitCalldata;

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

    function onlyRegistryMemberSender() internal virtual {
        if (!isMember(msg.sender)) {
            revert UserNotInRegistry();
        }
    }

    function onlyRegistryMemberAddress(address _sender) internal {
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

    function _revertZeroAddress(address _address) internal pure {
        if (_address == address(0)) {
            revert ValueCannotBeZero();
        }
    }

    function setStrategyTemplate(address template) external onlyOwner {
        strategyTemplate = template;
    }

    function setStrategyFacets(
        IDiamondCut.FacetCut[] memory facetCuts,
        address init,
        bytes memory initCalldata
    ) external onlyOwner {
        _setFacetCuts(facetCuts, strategyFacetCuts);
        strategyInit = init;
        strategyInitCalldata = initCalldata;
    }

    function setCollateralVaultTemplate(address template) external onlyOwner {
        collateralVaultTemplate = template;
    }

    // AUDIT: acknowledged upgradeable contract hat does not protect initialize functions,
    // slither-disable-next-line unprotected-upgrade
    function initialize(
        RegistryCommunityInitializeParams memory params,
        address _strategyTemplate,
        address _collateralVaultTemplate,
        address _owner,
        IDiamondCut.FacetCut[] memory facetCuts,
        address init,
        bytes memory initCalldata,
        IDiamondCut.FacetCut[] memory strategyFacetCuts_,
        address strategyInit_,
        bytes memory strategyInitCalldata_
    ) public initializer {
        require(facetCuts.length > 0, "Community facets required");
        require(strategyFacetCuts_.length > 0, "Strategy facets required");
        super.initialize(_owner);
        LibDiamond.setContractOwner(_owner);

        LibDiamond.diamondCut(facetCuts, init, initCalldata);
        _setFacetCuts(strategyFacetCuts_, strategyFacetCuts);
        strategyInit = strategyInit_;
        strategyInitCalldata = strategyInitCalldata_;

        __ReentrancyGuard_init();
        __AccessControl_init();

        _setRoleAdmin(COUNCIL_MEMBER, DEFAULT_ADMIN_ROLE);

        _revertZeroAddress(address(params._gardenToken));
        _revertZeroAddress(params._councilSafe);
        _revertZeroAddress(params._allo);
        _revertZeroAddress(params._registryFactory);

        if (params._communityFee != 0) {
            _revertZeroAddress(params._feeReceiver);
        }
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

        profileId =
            registry.createProfile(params._nonce, communityName, params._metadata, address(this), new address[](0));

        strategyTemplate = _strategyTemplate;
        collateralVaultTemplate = _collateralVaultTemplate;

        emit RegistryInitialized(profileId, communityName, params._metadata);
    }

    function _setFacetCuts(IDiamondCut.FacetCut[] memory source, IDiamondCut.FacetCut[] storage target) internal {
        while (target.length > 0) {
            target.pop();
        }
        for (uint256 i = 0; i < source.length; i++) {
            target.push();
            IDiamondCut.FacetCut storage dest = target[i];
            dest.facetAddress = source[i].facetAddress;
            dest.action = source[i].action;
            bytes4[] memory selectors = source[i].functionSelectors;
            for (uint256 j = 0; j < selectors.length; j++) {
                dest.functionSelectors.push(selectors[j]);
            }
        }
    }

    // Stub - delegates to CommunityPoolFacet
    // slither-disable-next-line incorrect-return
    function createPool(address _token, CVStrategyInitializeParamsV0_2 memory _params, Metadata memory _metadata)
        public
        virtual
        returns (uint256 poolId, address strategy)
    {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityPoolFacet
    // slither-disable-next-line incorrect-return
    function createPool(
        address _strategy,
        address _token,
        CVStrategyInitializeParamsV0_2 memory _params,
        Metadata memory _metadata
    ) public virtual returns (uint256 poolId, address strategy) {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityAdminFacet
    function setArchived(bool) external {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityPowerFacet
    function activateMemberInStrategy(address, address) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityPowerFacet
    function deactivateMemberInStrategy(address, address) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityPowerFacet
    function increasePower(uint256) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityPowerFacet
    function decreasePower(uint256) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityPowerFacet
    // slither-disable-next-line incorrect-return
    function getMemberPowerInStrategy(address, address) public virtual returns (uint256) {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityPowerFacet
    // Signature: getMemberStakedAmount(address) => 0x2c611c4a
    function getMemberStakedAmount(address) public virtual returns (uint256) {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityStrategyFacet
    // Signature: addStrategyByPoolId(uint256) => 0x82d6a1e7
    function addStrategyByPoolId(uint256) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityStrategyFacet
    // Signature: addStrategy(address) => 0x223e5479
    function addStrategy(address) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityStrategyFacet
    // Signature: rejectPool(address) => 0xfb1f6917
    function rejectPool(address) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityStrategyFacet
    // Signature: removeStrategyByPoolId(uint256) => 0x73265c37
    function removeStrategyByPoolId(uint256) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityStrategyFacet
    // Signature: removeStrategy(address) => 0x175188e8
    function removeStrategy(address) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityAdminFacet
    // Signature: setCouncilSafe(address) => 0x397e2543
    function setCouncilSafe(address payable) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityAdminFacet
    // Signature: acceptCouncilSafe() => 0xb5058c50
    function acceptCouncilSafe() public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityMemberFacet
    // slither-disable-next-line incorrect-return
    function isMember(address) public virtual returns (bool) {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityMemberFacet
    // Signature: stakeAndRegisterMember(string) => 0x9a1f46e2
    function stakeAndRegisterMember(string memory) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityMemberFacet
    // Signature: getStakeAmountWithFees() => 0x28c309e9
    function getStakeAmountWithFees() public virtual returns (uint256) {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityMemberFacet
    // Signature: getBasisStakedAmount() => 0x0331383c
    function getBasisStakedAmount() external virtual returns (uint256) {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityAdminFacet
    // Signature: setBasisStakedAmount(uint256) => 0x31f61bca
    function setBasisStakedAmount(uint256) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityAdminFacet
    // Signature: setCommunityParams((address,address,uint256,string,uint256,bool,string)) => 0xf2d774e7
    function setCommunityParams(CommunityParams memory) external {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityAdminFacet
    // Signature: setCommunityFee(uint256) => 0x0d12bbdb
    function setCommunityFee(uint256) public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityAdminFacet
    // Signature: isCouncilMember(address) => 0xebd7dc52
    function isCouncilMember(address) public virtual returns (bool) {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityMemberFacet
    // Signature: unregisterMember() => 0xb99b4370
    function unregisterMember() public virtual {
        _delegateToFacet();
    }

    // Stub - delegates to CommunityMemberFacet
    // Signature: kickMember(address,address) => 0x6871eb4d
    function kickMember(address, address) public virtual {
        _delegateToFacet();
    }

    /// @notice Helper function to delegate to facet using LibDiamond
    /// @dev Used by stub functions to delegate to their respective facets
    /// @dev This function never returns - it either reverts or returns via assembly
    function _delegateToFacet() private {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;

        assembly {
            ds.slot := position
        }

        address facet = ds.facetAddressAndSelectorPosition[msg.sig].facetAddress;
        if (facet == address(0)) {
            revert CommunityFunctionDoesNotExist(msg.sig);
        }

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    /// @notice Manage facets using diamond cut (owner only)
    /// @param _diamondCut Array of FacetCut structs defining facet changes
    /// @param _init Address of contract to execute with delegatecall (can be address(0))
    /// @param _calldata Function call data to execute on _init address
    function diamondCut(IDiamondCut.FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata)
        external
        onlyOwner
    {
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }

    /// @notice Fallback function delegates calls to facets based on function selector
    /// @dev Uses Diamond storage to find facet address for the called function
    fallback() external {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;

        assembly {
            ds.slot := position
        }

        address facet = ds.facetAddressAndSelectorPosition[msg.sig].facetAddress;

        if (facet == address(0)) {
            revert CommunityFunctionDoesNotExist(msg.sig);
        }

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    // receive() external payable {}

    uint256[46] private __gap;
}
// slither-disable-end uninitialized-state
