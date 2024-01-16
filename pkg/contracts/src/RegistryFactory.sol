// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "../src/RegistryCommunity.sol";

contract RegistryFactory {
    mapping(RegistryCommunity => bool) registries;
    uint256 public nonce = 0;

    function createRegistry(RegistryCommunity.InitializeParams memory params)
        public
        returns (address _createdRegistryAddress)
    {
        RegistryCommunity gardenRegistry = new RegistryCommunity();
        params._nonce = nonce++;
        gardenRegistry.initialize(params);
        return address(gardenRegistry);
    }
}
