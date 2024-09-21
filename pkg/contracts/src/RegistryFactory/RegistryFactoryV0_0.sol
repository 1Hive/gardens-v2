// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {
    RegistryCommunityV0_0,
    RegistryCommunityInitializeParamsV0_0
} from "../RegistryCommunity/RegistryCommunityV0_0.sol";
import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";

struct CommunityInfo {
    uint256 fee;
    bool valid;
}

/// @custom:oz-upgrades-from RegistryFactoryV0_0
contract RegistryFactoryV0_0 is ProxyOwnableUpgrader {
    // string public constant  VERSION = "0.0";
    uint256 public nonce;

    mapping(address => CommunityInfo) communityToInfo;
    address public gardensFeeReceiver;
    address public registryCommunityTemplate;
    address public strategyTemplate;
    address public collateralVaultTemplate;

    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    event FeeReceiverSet(address _newFeeReceiver);
    event ProtocolFeeSet(address _community, uint256 _newProtocolFee);
    event CommunityCreated(address _registryCommunity);
    event CommunityValiditySet(address _community, bool _isValid);

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

    function createRegistry(RegistryCommunityInitializeParamsV0_0 memory params)
        public
        virtual
        returns (address _createdRegistryAddress)
    {
        params._nonce = nonce++;
        params._registryFactory = address(this);

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(registryCommunityTemplate),
            abi.encodeWithSelector(RegistryCommunityV0_0.initialize.selector, params, strategyTemplate, collateralVaultTemplate, owner())
        );

        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(payable(address(proxy)));

        // registryCommunity.initialize(params);
        communityToInfo[address(registryCommunity)].valid = true;
        emit CommunityCreated(address(registryCommunity));
        return address(registryCommunity);
    }

    function setReceiverAddress(address _newFeeReceiver) public virtual onlyOwner {
        _revertZeroAddress(_newFeeReceiver);
        gardensFeeReceiver = _newFeeReceiver;
        emit FeeReceiverSet(_newFeeReceiver);
    }

    function getGardensFeeReceiver() external view virtual returns (address) {
        return gardensFeeReceiver;
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

    function getProtocolFee(address _community) external view virtual returns (uint256) {
        if (!communityToInfo[_community].valid) {
            revert CommunityInvalid(_community);
        }

        return communityToInfo[_community].fee;
    }


    function VERSION() public pure virtual returns (string memory) {
        return "0.0";
    }
    uint256[50] private __gap;
}
