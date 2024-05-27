// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunity} from "../src/RegistryCommunity.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RegistryFactory is Ownable {
    uint256 public nonce = 0;

    //TODO: change from bool to uint (confirm if bool is bigger than uint8)
    struct CommunityInfo {
        bool valid;
        uint256 fee;
    }

    mapping(address => CommunityInfo) communityToInfo;
    //uint256 public protocolFee;
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

    function createRegistry(RegistryCommunity.InitializeParams memory params)
        public
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

    function setReceiverAddress(address _newFeeReceiver) public onlyOwner {
        _revertZeroAddress(_newFeeReceiver);
        gardensFeeReceiver = _newFeeReceiver;
        emit FeeReceiverSet(_newFeeReceiver);
    }

    function getGardensFeeReceiver() external view returns (address) {
        return gardensFeeReceiver;
    }

    function setProtocolFee(address _community, uint256 _newProtocolFee) public onlyOwner {
        communityToInfo[_community].fee = _newProtocolFee;
        emit ProtocolFeeSet(_community, _newProtocolFee);
    }

    function setCommunityValidity(address _community, bool _isValid) public onlyOwner {
        communityToInfo[_community].valid = _isValid;
        emit CommunityValiditySet(_community, _isValid);
    }

    function getProtocolFee(address _community) external view returns (uint256) {
        if (!communityToInfo[_community].valid) {
            revert CommunityInvalid(_community);
        }

        return communityToInfo[_community].fee;
    }
}
