// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "../src/RegistryCommunity.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
contract RegistryFactory is Ownable{
    
    
    //TODO: change from bool to uint (confirm if bool is bigger than uint8) 
    struct CommunityInfo{
        bool valid;
        uint256 fee;
    }
    mapping(address => CommunityInfo) communityToInfo;
    uint256 public nonce = 0;
    //uint256 public protocolFee;
    address public gardensFeeReceiver;

    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    event FeeReceiverSet(address _newFeeReceiver);
    event ProtocolFeeSet(address _community, uint256 _newProtocolFee);
    event RegistryCreated(address _newRegistry);
    event CommunityValiditySet(address _community, bool _isValid);
    
    /*|--------------------------------------------|*/
    /*|                 ERRORS                     |*/
    /*|--------------------------------------------|*/

    error CommunityInvalid(address _community);
    function createRegistry(RegistryCommunity.InitializeParams memory params)
        public
        returns (address _createdRegistryAddress)
    {
        RegistryCommunity gardenRegistry = new RegistryCommunity();
        params._nonce = nonce++;
        params._registryFactory = address(this);
        communityToInfo[address(gardenRegistry)].valid = true;
        gardenRegistry.initialize(params);
        emit RegistryCreated(address(gardenRegistry));
        return address(gardenRegistry);
    }

    function setReceiverAddress(address _newFeeReceiver) public onlyOwner{
        gardensFeeReceiver = _newFeeReceiver;
        emit FeeReceiverSet(_newFeeReceiver);
    }

    function getGardensFeeReceiver() external view returns (address) {
        return gardensFeeReceiver;
    }

    function setProtocolFee(address _community, uint256 _newProtocolFee) public onlyOwner{
        communityToInfo[_community].fee = _newProtocolFee;
        emit ProtocolFeeSet(_community,_newProtocolFee);
    }

    function setCommunityValidity(address _community, bool _isValid) public onlyOwner{
        communityToInfo[_community].valid = _isValid;
        emit CommunityValiditySet(_community, _isValid);
    }

    function getProtocolFee(address _community) external view returns (uint256) {
        if(!communityToInfo[_community].valid) {
            revert CommunityInvalid(_community);
        }
        
        return communityToInfo[_community].fee;
    }
}
