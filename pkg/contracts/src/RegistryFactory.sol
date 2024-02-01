// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "../src/RegistryCommunity.sol";

contract RegistryFactory {
    uint256 public nonce = 0;

    mapping(RegistryCommunity => bool) communities;

    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/
    event CommunityCreated(address registryCommunity);

    function createRegistry(RegistryCommunity.InitializeParams memory params)
        public
        returns (address _createdRegistryAddress)
    {
        RegistryCommunity registryCommunity = new RegistryCommunity();
        params._nonce = nonce++;
        registryCommunity.initialize(params);
        emit CommunityCreated(address(registryCommunity));
        return address(registryCommunity);
    }
}
