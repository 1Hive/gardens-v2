// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunity, RegistryCommunityInitializeParams} from "../RegistryCommunity/RegistryCommunity.sol";
import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ISafe} from "../interfaces/ISafe.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";
import {IDiamondCut} from "../diamonds/interfaces/IDiamondCut.sol";

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

    uint256[42] private __gap;

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
    event ContractRegistered(address indexed target);
    event ContractUnregistered(address indexed target);

    /*|--------------------------------------------|*/
    /*|                 ERRORS                     |*/
    /*|--------------------------------------------|*/

    error CommunityInvalid(address _community);
    error AddressCannotBeZero();

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/

    function _revertZeroAddress(address _address) internal pure virtual {
        if (_address == address(0)) revert AddressCannotBeZero();
    }

    function setRegistryCommunityTemplate(address template) external virtual onlyOwner {
        registryCommunityTemplate = template;
    }

    function setStrategyTemplate(address template) external virtual onlyOwner {
        strategyTemplate = template;
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

    function initializeV2(
        IDiamondCut.FacetCut[] memory communityFacetCuts_,
        address communityInit_,
        bytes memory communityInitCalldata_,
        IDiamondCut.FacetCut[] memory strategyFacetCuts_,
        address strategyInit_,
        bytes memory strategyInitCalldata_
    ) public reinitializer(2) onlyOwner {
        setCommunityFacets(communityFacetCuts_, communityInit_, communityInitCalldata_);
        setStrategyFacets(strategyFacetCuts_, strategyInit_, strategyInitCalldata_);
    }

    function setCommunityFacets(
        IDiamondCut.FacetCut[] memory communityFacetCuts_,
        address communityInit_,
        bytes memory communityInitCalldata_
    ) public onlyOwner {
        _setFacetCuts(communityFacetCuts_, communityFacetCuts);
        communityInit = communityInit_;
        communityInitCalldata = communityInitCalldata_;
    }

    function setStrategyFacets(
        IDiamondCut.FacetCut[] memory strategyFacetCuts_,
        address strategyInit_,
        bytes memory strategyInitCalldata_
    ) public onlyOwner {
        _setFacetCuts(strategyFacetCuts_, strategyFacetCuts);
        strategyInit = strategyInit_;
        strategyInitCalldata = strategyInitCalldata_;
    }

    function clearCommunityFacetCuts() external onlyOwner {
        _clearFacetCuts(communityFacetCuts);
    }

    function clearStrategyFacetCuts() external onlyOwner {
        _clearFacetCuts(strategyFacetCuts);
    }

    function upsertCommunityFacetCut(
        uint256 index,
        address facetAddress,
        IDiamondCut.FacetCutAction action,
        bytes4[] memory selectors
    ) external onlyOwner {
        _upsertFacetCut(communityFacetCuts, index, facetAddress, action, selectors);
    }

    function upsertStrategyFacetCut(
        uint256 index,
        address facetAddress,
        IDiamondCut.FacetCutAction action,
        bytes4[] memory selectors
    ) external onlyOwner {
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

    function _createRegistry(RegistryCommunityInitializeParams memory params) internal returns (address _createdRegistryAddress) {
        params._nonce = nonce++;
        params._registryFactory = address(this);

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(registryCommunityTemplate),
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                strategyTemplate,
                collateralVaultTemplate,
                proxyOwner()
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

    function setProtopianAddress(address[] memory _protopians, bool _isProtopian) public virtual onlyOwner {
        for (uint256 i = 0; i < _protopians.length; i++) {
            protopiansAddresses[_protopians[i]] = _isProtopian;
        }

        if (_isProtopian) {
            emit ProtopiansChanged(_protopians, new address[](0));
        } else {
            emit ProtopiansChanged(new address[](0), _protopians);
        }
    }

    function setKeeperAddress(address[] memory _keepers, bool _isKeeper) public virtual onlyOwner {
        for (uint256 i = 0; i < _keepers.length; i++) {
            keepersAddresses[_keepers[i]] = _isKeeper;
        }

        if (_isKeeper) {
            emit KeepersChanged(_keepers, new address[](0));
        } else {
            emit KeepersChanged(new address[](0), _keepers);
        }
    }

    function getProtocolFee(address _community) external view virtual returns (uint256) {
        if (!communityToInfo[_community].valid) {
            revert CommunityInvalid(_community);
        }

        // Check for keepers (free if keeper)
        if (keepersAddresses[_community]) {
            return 0;
        }

        // Check for protopians (free if they are owners of the community)

        ISafe councilSafe = ISafe(RegistryCommunity(_community).councilSafe());
        bool isProtopianSafe = protopiansAddresses[address(councilSafe)];
        if (isProtopianSafe) {
            return 0;
        }

        // Make sure council address is not EOA
        if (address(councilSafe).code.length != 0) {
            address[] memory communityOwners = councilSafe.getOwners();
            for (uint256 i = 0; i < communityOwners.length; i++) {
                if (protopiansAddresses[communityOwners[i]]) {
                    return 0;
                }
            }
        }

        return communityToInfo[_community].fee;
    }
}
