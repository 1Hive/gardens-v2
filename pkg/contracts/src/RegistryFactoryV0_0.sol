// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunity} from "../src/RegistryCommunity.sol";

import {RegistryFactory} from "../src/RegistryFactory.sol";

import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

struct CommunityInfo {
    uint256 fee;
    bool valid;
}
/// @custom:oz-upgrades-from RegistryFactory

contract RegistryFactoryV0_0 is OwnableUpgradeable, UUPSUpgradeable {
    uint256 public nonce;

    mapping(address => CommunityInfo) communityToInfo;
    address public gardensFeeReceiver;

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

    function _revertZeroAddress(address _address) internal pure {
        if (_address == address(0)) revert AddressCannotBeZero();
    }

    function initialize(address _gardensFeeReceiver) public virtual initializer {
        __Ownable_init();
        nonce = 0;
        gardensFeeReceiver = _gardensFeeReceiver;
        emit FeeReceiverSet(_gardensFeeReceiver);
        // setReceiverAddress(_gardensFeeReceiver); //onlyOwner
    }

    function createRegistry(RegistryCommunity.InitializeParams memory params)
        public
        virtual
        returns (address _createdRegistryAddress)
    {
        RegistryCommunity registryCommunity = new RegistryCommunity();
        params._nonce = nonce++;
        params._registryFactory = address(this);

        registryCommunity.initialize(params);
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

    function _authorizeUpgrade(address) internal override onlyOwner {}

    uint256[50] private __gap;
}
