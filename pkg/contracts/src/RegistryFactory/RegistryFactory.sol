// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunity, RegistryCommunityInitializeParams} from "../RegistryCommunity/RegistryCommunity.sol";
import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ISafe} from "../interfaces/ISafe.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";
import {IDiamondCut} from "../diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../diamonds/interfaces/IDiamond.sol";

struct CommunityInfo {
    uint256 fee;
    bool valid;
}

/// @custom:oz-upgrades-from RegistryFactory
contract RegistryFactory is ProxyOwnableUpgrader {
    string public constant VERSION = "0.0";
    uint256 public nonce;

    mapping(address => CommunityInfo) communityToInfo;
    address public gardensFeeReceiver;
    address public registryCommunityTemplate;
    address public strategyTemplate;
    address public collateralVaultTemplate;
    mapping(address => bool) public protopiansAddresses;
    mapping(address => bool) public keepersAddresses;

    IDiamondCut.FacetCut[] internal communityFacetCuts;
    address internal communityInit;
    bytes internal communityInitCalldata;
    IDiamondCut.FacetCut[] internal strategyFacetCuts;
    address internal strategyInit;
    bytes internal strategyInitCalldata;
    mapping(address => bool) public registeredContracts;

    address public streamingEscrowFactory;
    address public globalPauseController;
    mapping(address => bool) public authorizedWallets;
    mapping(address => address) public protopianDelegate;
    mapping(address => bool) public canonicalProtopians;
    mapping(address => address) public protopianDelegatedFrom;

    uint256[38] private __gap;

    // Shared routing is opt-in. Existing proxies keep their local diamond until migrated.
    address public strategyImplementation;
    address public communityImplementation;
    mapping(bytes4 => address) private strategyFacetBySelector;
    mapping(bytes4 => address) private communityFacetBySelector;
    bytes4[] private strategyRoutedSelectors;
    bytes4[] private communityRoutedSelectors;

    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    event FeeReceiverSet(address _newFeeReceiver);
    event ProtocolFeeSet(address _community, uint256 _newProtocolFee);
    event CommunityCreated(address _registryCommunity);
    event CommunityValiditySet(address _community, bool _isValid);
    event ProtopiansChanged(address[] _new, address[] _removed);
    event KeepersChanged(address[] _new, address[] _removed);
    event StreamingEscrowFactorySet(address _newFactory);
    event GlobalPauseControllerSet(address _newController);
    event AuthorizedWalletSet(address indexed wallet, bool authorized);
    event ProtopianDelegated(address indexed holder, address indexed to);
    event ProtopianDelegationMigrated(address indexed holder, address indexed to);
    event ContractRegistered(address indexed target);
    event ContractUnregistered(address indexed target);
    event StrategyImplementationSet(address indexed implementation);
    event CommunityImplementationSet(address indexed implementation);
    event StrategyRoutingSet(address indexed implementation);
    event CommunityRoutingSet(address indexed implementation);

    /*|--------------------------------------------|*/
    /*|                 ERRORS                     |*/
    /*|--------------------------------------------|*/

    error CommunityInvalid(address _community);
    error AddressCannotBeZero();
    error UnauthorizedProtopianDelegation(address caller, address holder);
    error ProtopianHolderRequired(address holder);
    error ProtopianDelegateUnavailable(address delegate);
    error InvalidRoutingTarget(address target);
    error DuplicateRoutingSelector(bytes4 selector);
    error UnsupportedRoutingCut();
    error ReservedRoutingSelector(bytes4 selector);
    error UseAtomicRoutingRelease();

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/

    function _revertZeroAddress(address _address) internal pure virtual {
        if (_address == address(0)) revert AddressCannotBeZero();
    }

    modifier onlyOwnerOrAuthorizedWallet() {
        if (msg.sender != owner() && !authorizedWallets[msg.sender]) revert CallerNotOwner(msg.sender, owner());
        _;
    }

    function setRegistryCommunityTemplate(address template) external virtual onlyOwner {
        if (communityImplementation != address(0) && !_isRouterForThisFactory(template)) {
            revert InvalidRoutingTarget(template);
        }
        registryCommunityTemplate = template;
    }

    function setStrategyTemplate(address template) external virtual onlyOwner {
        if (strategyImplementation != address(0) && !_isRouterForThisFactory(template)) {
            revert InvalidRoutingTarget(template);
        }
        strategyTemplate = template;
    }

    function setStrategyImplementation(address implementation) external onlyOwner {
        _setStrategyImplementation(implementation);
        if (strategyRoutedSelectors.length == 0 && strategyFacetCuts.length > 0) {
            _syncFacetRouting(strategyFacetCuts, strategyFacetBySelector, strategyRoutedSelectors);
        }
    }

    function setCommunityImplementation(address implementation) external onlyOwner {
        _setCommunityImplementation(implementation);
        if (communityRoutedSelectors.length == 0 && communityFacetCuts.length > 0) {
            _syncFacetRouting(communityFacetCuts, communityFacetBySelector, communityRoutedSelectors);
        }
    }

    /// @notice Atomically activate new code and a complete selector set for all routed strategies.
    function setStrategyRelease(IDiamondCut.FacetCut[] memory cuts, address implementation) external onlyOwner {
        _setStrategyImplementation(implementation);
        _setFacetCuts(cuts, strategyFacetCuts);
        _syncFacetRouting(strategyFacetCuts, strategyFacetBySelector, strategyRoutedSelectors);
        emit StrategyRoutingSet(implementation);
    }

    /// @notice Atomically activate new code and a complete selector set for all routed communities.
    function setCommunityRelease(IDiamondCut.FacetCut[] memory cuts, address implementation) external onlyOwner {
        _setCommunityImplementation(implementation);
        _setFacetCuts(cuts, communityFacetCuts);
        _syncFacetRouting(communityFacetCuts, communityFacetBySelector, communityRoutedSelectors);
        emit CommunityRoutingSet(implementation);
    }

    function strategyFacet(bytes4 selector) external view returns (address) {
        return strategyFacetBySelector[selector];
    }

    function communityFacet(bytes4 selector) external view returns (address) {
        return communityFacetBySelector[selector];
    }

    function _setStrategyImplementation(address implementation) internal {
        if (implementation.code.length == 0 || _routerFactory(implementation) != address(0)) {
            revert InvalidRoutingTarget(implementation);
        }
        strategyImplementation = implementation;
        emit StrategyImplementationSet(implementation);
    }

    function _setCommunityImplementation(address implementation) internal {
        if (implementation.code.length == 0 || _routerFactory(implementation) != address(0)) {
            revert InvalidRoutingTarget(implementation);
        }
        communityImplementation = implementation;
        emit CommunityImplementationSet(implementation);
    }

    function _isRouterForThisFactory(address target) internal view returns (bool) {
        return _routerFactory(target) == address(this);
    }

    function _routerFactory(address target) internal view returns (address) {
        (bool ok, bytes memory data) = target.staticcall(abi.encodeWithSignature("routingFactory()"));
        return ok && data.length == 32 ? abi.decode(data, (address)) : address(0);
    }

    function _syncFacetRouting(
        IDiamondCut.FacetCut[] storage cuts,
        mapping(bytes4 => address) storage targets,
        bytes4[] storage selectors
    ) internal {
        for (uint256 i; i < selectors.length; i++) delete targets[selectors[i]];
        while (selectors.length > 0) selectors.pop();
        for (uint256 i; i < cuts.length; i++) {
            IDiamondCut.FacetCut storage cut = cuts[i];
            if (cut.action == IDiamond.FacetCutAction.Remove) revert UnsupportedRoutingCut();
            if (cut.facetAddress.code.length == 0 || _routerFactory(cut.facetAddress) != address(0)) {
                revert InvalidRoutingTarget(cut.facetAddress);
            }
            for (uint256 j; j < cut.functionSelectors.length; j++) {
                bytes4 selector = cut.functionSelectors[j];
                if (_isLoupeSelector(selector)) continue;
                if (_isRouterSelector(selector)) revert ReservedRoutingSelector(selector);
                if (targets[selector] != address(0)) revert DuplicateRoutingSelector(selector);
                targets[selector] = cut.facetAddress;
                selectors.push(selector);
            }
        }
    }

    function _isRouterSelector(bytes4 selector) internal pure returns (bool) {
        return selector == bytes4(keccak256("initialize(address)"))
            || selector == bytes4(keccak256("owner()"))
            || selector == bytes4(keccak256("proxyOwner()"))
            || selector == bytes4(keccak256("transferOwnership(address)"))
            || selector == bytes4(keccak256("renounceOwnership()"))
            || selector == bytes4(keccak256("upgradeTo(address)"))
            || selector == bytes4(keccak256("upgradeToAndCall(address,bytes)"))
            || selector == bytes4(keccak256("proxiableUUID()"))
            || selector == bytes4(keccak256("routingFactory()"))
            || selector == bytes4(keccak256("runImplementationMigration(bytes)"))
            || selector == bytes4(keccak256("getFacets()"))
            || selector == IDiamondCut.diamondCut.selector;
    }

    function _isLoupeSelector(bytes4 selector) internal pure returns (bool) {
        return selector == bytes4(keccak256("facets()"))
            || selector == bytes4(keccak256("facetFunctionSelectors(address)"))
            || selector == bytes4(keccak256("facetAddresses()"))
            || selector == bytes4(keccak256("facetAddress(bytes4)"))
            || selector == bytes4(keccak256("supportsInterface(bytes4)"));
    }

    function setCollateralVaultTemplate(address template) external virtual onlyOwner {
        collateralVaultTemplate = template;
    }

    function setStreamingEscrowFactory(address factory) external virtual onlyOwner {
        _revertZeroAddress(factory);
        streamingEscrowFactory = factory;
        emit StreamingEscrowFactorySet(factory);
    }

    function setGlobalPauseController(address controller) external virtual onlyOwner {
        _revertZeroAddress(controller);
        globalPauseController = controller;
        emit GlobalPauseControllerSet(controller);
    }

    function setAuthorizedWallet(address wallet, bool authorized) external virtual onlyOwner {
        _revertZeroAddress(wallet);
        authorizedWallets[wallet] = authorized;
        emit AuthorizedWalletSet(wallet, authorized);
    }

    function isAuthorizedWallet(address wallet) external view virtual returns (bool) {
        return authorizedWallets[wallet];
    }

    function registerContract(address target) external virtual onlyOwner {
        _revertZeroAddress(target);
        registeredContracts[target] = true;
        emit ContractRegistered(target);
    }

    function unregisterContract(address target) external virtual onlyOwner {
        _revertZeroAddress(target);
        registeredContracts[target] = false;
        emit ContractUnregistered(target);
    }

    function isContractRegistered(address target) external view virtual returns (bool) {
        return registeredContracts[target];
    }

    function initialize(
        address _owner,
        address _gardensFeeReceiver,
        address _registryCommunityTemplate,
        address _strategyTemplate,
        address _collateralVaultTemplate
    ) public initializer {
        super.initialize(_owner);
        nonce = 0;
        _revertZeroAddress(_gardensFeeReceiver);
        _revertZeroAddress(_registryCommunityTemplate);
        _revertZeroAddress(_collateralVaultTemplate);
        gardensFeeReceiver = _gardensFeeReceiver;
        registryCommunityTemplate = _registryCommunityTemplate;
        strategyTemplate = _strategyTemplate;
        collateralVaultTemplate = _collateralVaultTemplate;
        emit FeeReceiverSet(_gardensFeeReceiver);
        // setReceiverAddress(_gardensFeeReceiver); //onlyOwner
    }

    function setCommunityFacets(
        IDiamondCut.FacetCut[] memory communityFacetCuts_,
        address communityInit_,
        bytes memory communityInitCalldata_
    ) public onlyOwner {
        _setFacetCuts(communityFacetCuts_, communityFacetCuts);
        if (communityImplementation != address(0)) {
            _syncFacetRouting(communityFacetCuts, communityFacetBySelector, communityRoutedSelectors);
        }
        communityInit = communityInit_;
        communityInitCalldata = communityInitCalldata_;
    }

    function setStrategyFacets(
        IDiamondCut.FacetCut[] memory strategyFacetCuts_,
        address strategyInit_,
        bytes memory strategyInitCalldata_
    ) public onlyOwner {
        _setFacetCuts(strategyFacetCuts_, strategyFacetCuts);
        if (strategyImplementation != address(0)) {
            _syncFacetRouting(strategyFacetCuts, strategyFacetBySelector, strategyRoutedSelectors);
        }
        strategyInit = strategyInit_;
        strategyInitCalldata = strategyInitCalldata_;
    }

    function clearCommunityFacetCuts() external onlyOwner {
        if (communityImplementation != address(0)) revert UseAtomicRoutingRelease();
        _clearFacetCuts(communityFacetCuts);
    }

    function clearStrategyFacetCuts() external onlyOwner {
        if (strategyImplementation != address(0)) revert UseAtomicRoutingRelease();
        _clearFacetCuts(strategyFacetCuts);
    }

    function upsertCommunityFacetCut(
        uint256 index,
        address facetAddress,
        IDiamondCut.FacetCutAction action,
        bytes4[] memory selectors
    ) external onlyOwner {
        if (communityImplementation != address(0)) revert UseAtomicRoutingRelease();
        _upsertFacetCut(communityFacetCuts, index, facetAddress, action, selectors);
    }

    function upsertStrategyFacetCut(
        uint256 index,
        address facetAddress,
        IDiamondCut.FacetCutAction action,
        bytes4[] memory selectors
    ) external onlyOwner {
        if (strategyImplementation != address(0)) revert UseAtomicRoutingRelease();
        _upsertFacetCut(strategyFacetCuts, index, facetAddress, action, selectors);
    }

    function setCommunityFacetInit(address init, bytes memory initCalldata) external onlyOwner {
        communityInit = init;
        communityInitCalldata = initCalldata;
    }

    function setStrategyFacetInit(address init, bytes memory initCalldata) external onlyOwner {
        strategyInit = init;
        strategyInitCalldata = initCalldata;
    }

    function createRegistry(RegistryCommunityInitializeParams memory params)
        public
        virtual
        returns (address _createdRegistryAddress)
    {
        require(communityFacetCuts.length > 0, "Community facets not set");
        require(strategyFacetCuts.length > 0, "Strategy facets not set");
        return _createRegistry(params);
    }

    function _createRegistry(RegistryCommunityInitializeParams memory params)
        internal
        returns (address _createdRegistryAddress)
    {
        params._nonce = nonce++;
        params._registryFactory = address(this);

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(registryCommunityTemplate),
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, strategyTemplate, collateralVaultTemplate, proxyOwner()
            )
        );

        RegistryCommunity registryCommunity = RegistryCommunity(payable(address(proxy)));
        address createdRegistry = address(registryCommunity);

        communityToInfo[createdRegistry].valid = true;
        emit CommunityCreated(createdRegistry);
        return createdRegistry;
    }

    function _setFacetCuts(IDiamondCut.FacetCut[] memory source, IDiamondCut.FacetCut[] storage target) internal {
        _clearFacetCuts(target);
        for (uint256 i = 0; i < source.length; i++) {
            _upsertFacetCut(target, i, source[i].facetAddress, source[i].action, source[i].functionSelectors);
        }
    }

    function _clearFacetCuts(IDiamondCut.FacetCut[] storage target) internal {
        assembly {
            sstore(target.slot, 0)
        }
    }

    function _upsertFacetCut(
        IDiamondCut.FacetCut[] storage target,
        uint256 index,
        address facetAddress,
        IDiamondCut.FacetCutAction action,
        bytes4[] memory selectors
    ) internal {
        require(index <= target.length, "invalid facet index");
        if (index == target.length) {
            target.push();
        }

        IDiamondCut.FacetCut storage dest = target[index];
        dest.facetAddress = facetAddress;
        dest.action = action;

        while (dest.functionSelectors.length > 0) {
            dest.functionSelectors.pop();
        }
        for (uint256 j = 0; j < selectors.length; j++) {
            dest.functionSelectors.push(selectors[j]);
        }
    }

    function _copyFacetCuts(IDiamondCut.FacetCut[] storage source)
        internal
        view
        returns (IDiamondCut.FacetCut[] memory)
    {
        IDiamondCut.FacetCut[] memory dest = new IDiamondCut.FacetCut[](source.length);
        for (uint256 i = 0; i < source.length; i++) {
            dest[i].facetAddress = source[i].facetAddress;
            dest[i].action = source[i].action;
            bytes4[] storage selectors = source[i].functionSelectors;
            dest[i].functionSelectors = new bytes4[](selectors.length);
            for (uint256 j = 0; j < selectors.length; j++) {
                dest[i].functionSelectors[j] = selectors[j];
            }
        }
        return dest;
    }

    function setReceiverAddress(address _newFeeReceiver) public virtual onlyOwner {
        _revertZeroAddress(_newFeeReceiver);
        gardensFeeReceiver = _newFeeReceiver;
        emit FeeReceiverSet(_newFeeReceiver);
    }

    function getGardensFeeReceiver() external view virtual returns (address) {
        return gardensFeeReceiver;
    }

    function getStreamingEscrowFactory() external view virtual returns (address) {
        return streamingEscrowFactory;
    }

    function getCommunityFacets()
        external
        view
        virtual
        returns (IDiamondCut.FacetCut[] memory facetCuts, address init, bytes memory initCalldata)
    {
        return (_copyFacetCuts(communityFacetCuts), communityInit, communityInitCalldata);
    }

    function getStrategyFacets()
        external
        view
        virtual
        returns (IDiamondCut.FacetCut[] memory facetCuts, address init, bytes memory initCalldata)
    {
        return (_copyFacetCuts(strategyFacetCuts), strategyInit, strategyInitCalldata);
    }

    function setProtocolFee(address _community, uint256 _newProtocolFee) public virtual onlyOwner {
        communityToInfo[_community].fee = _newProtocolFee;
        emit ProtocolFeeSet(_community, _newProtocolFee);
    }

    function setCommunityValidity(address _community, bool _isValid) public virtual onlyOwner {
        communityToInfo[_community].valid = _isValid;
        emit CommunityValiditySet(_community, _isValid);
    }

    function getCommunityValidity(address _community) external view virtual returns (bool) {
        return communityToInfo[_community].valid;
    }

    function setProtopianAddress(address[] memory _protopians, bool _isProtopian)
        public
        virtual
        onlyOwnerOrAuthorizedWallet
    {
        for (uint256 i = 0; i < _protopians.length; i++) {
            address holder = _protopians[i];
            _revertZeroAddress(holder);

            canonicalProtopians[holder] = _isProtopian;
            if (!_isProtopian) {
                _clearProtopianDelegation(holder);
                protopiansAddresses[holder] = isProtopianAddress(holder);
                continue;
            }

            _clearIncomingProtopianDelegation(holder);
            address delegated = protopianDelegate[holder];
            if (!_restoreProtopianDelegation(holder, delegated)) {
                protopianDelegate[holder] = address(0);
                protopiansAddresses[holder] = true;
                emit ProtopianDelegated(holder, address(0));
            }
        }

        if (_isProtopian) {
            emit ProtopiansChanged(_protopians, new address[](0));
        } else {
            emit ProtopiansChanged(new address[](0), _protopians);
        }
    }

    function setKeeperAddress(address[] memory _keepers, bool _isKeeper) public virtual onlyOwnerOrAuthorizedWallet {
        for (uint256 i = 0; i < _keepers.length; i++) {
            keepersAddresses[_keepers[i]] = _isKeeper;
        }

        if (_isKeeper) {
            emit KeepersChanged(_keepers, new address[](0));
        } else {
            emit KeepersChanged(new address[](0), _keepers);
        }
    }

    function delegateProtopian(address holder, address to) external virtual {
        _revertZeroAddress(holder);

        if (msg.sender != owner() && !authorizedWallets[msg.sender] && msg.sender != holder) {
            revert UnauthorizedProtopianDelegation(msg.sender, holder);
        }

        if (!canonicalProtopians[holder]) {
            revert ProtopianHolderRequired(holder);
        }

        address currentDelegate = protopianDelegate[holder];
        if (currentDelegate == to) {
            return;
        }

        if (to != address(0) && !_isAvailableProtopianDelegate(to)) {
            revert ProtopianDelegateUnavailable(to);
        }

        _clearProtopianDelegation(holder);

        if (to == address(0)) {
            protopiansAddresses[holder] = true;
            emit ProtopianDelegated(holder, address(0));
            return;
        }

        protopianDelegate[holder] = to;
        protopianDelegatedFrom[to] = holder;
        protopiansAddresses[holder] = false;
        protopiansAddresses[to] = true;

        emit ProtopianDelegated(holder, to);
    }

    function getProtocolFee(address _community) external view virtual returns (uint256) {
        if (!communityToInfo[_community].valid) {
            revert CommunityInvalid(_community);
        }

        // Check for keepers (free if keeper)
        if (keepersAddresses[_community]) {
            return 0;
        }

        bool isProtopianCommunity = isProtopianAddress(_community);
        if (isProtopianCommunity) {
            return 0;
        }

        return communityToInfo[_community].fee;
    }

    function isProtopianAddress(address account) public view returns (bool) {
        address delegatedFrom = protopianDelegatedFrom[account];
        if (delegatedFrom != address(0)) {
            return canonicalProtopians[delegatedFrom] && protopianDelegate[delegatedFrom] == account;
        }
        return canonicalProtopians[account] && protopianDelegate[account] == address(0);
    }

    /// @notice Seed canonical and reverse delegation state when upgrading an existing factory.
    /// @dev Invalid legacy delegation chains are collapsed back to their canonical holder.
    function reinitializeV3MigrateProtopians(address[] calldata holders) external reinitializer(3) onlyOwner {
        for (uint256 i = 0; i < holders.length; i++) {
            _revertZeroAddress(holders[i]);
            canonicalProtopians[holders[i]] = true;
        }

        for (uint256 i = 0; i < holders.length; i++) {
            address holder = holders[i];
            address delegated = protopianDelegate[holder];
            bool restored = _restoreProtopianDelegation(holder, delegated);
            if (!restored) {
                protopianDelegate[holder] = address(0);
                protopiansAddresses[holder] = true;
                if (delegated != address(0)) {
                    protopiansAddresses[delegated] = isProtopianAddress(delegated);
                    emit ProtopianDelegated(holder, address(0));
                }
            }
            emit ProtopianDelegationMigrated(holder, restored ? delegated : address(0));
        }
    }

    function _isAvailableProtopianDelegate(address delegate) internal view returns (bool) {
        return !canonicalProtopians[delegate] && protopianDelegatedFrom[delegate] == address(0)
            && protopianDelegate[delegate] == address(0) && !protopiansAddresses[delegate];
    }

    function _restoreProtopianDelegation(address holder, address delegated) internal returns (bool) {
        if (delegated == address(0)) {
            protopiansAddresses[holder] = true;
            return true;
        }

        address delegatedFrom = protopianDelegatedFrom[delegated];
        if (
            delegated == holder || canonicalProtopians[delegated] || protopianDelegate[delegated] != address(0)
                || (delegatedFrom != address(0) && delegatedFrom != holder)
        ) {
            return false;
        }

        protopianDelegatedFrom[delegated] = holder;
        protopiansAddresses[holder] = false;
        protopiansAddresses[delegated] = true;
        return true;
    }

    function _clearProtopianDelegation(address holder) internal {
        address delegated = protopianDelegate[holder];
        if (delegated == address(0)) {
            return;
        }

        delete protopianDelegate[holder];
        if (protopianDelegatedFrom[delegated] == holder) {
            delete protopianDelegatedFrom[delegated];
        }
        protopiansAddresses[delegated] = isProtopianAddress(delegated);
    }

    function _clearIncomingProtopianDelegation(address delegate) internal {
        address source = protopianDelegatedFrom[delegate];
        if (source == address(0)) {
            return;
        }

        delete protopianDelegatedFrom[delegate];
        delete protopianDelegate[source];
        protopiansAddresses[source] = canonicalProtopians[source];
        emit ProtopianDelegated(source, address(0));
    }
}
