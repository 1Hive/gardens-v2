// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "../src/RegistryGardens.sol";

contract RegistryFactory {
    mapping(RegistryGardens => bool) registries;
    uint256 public nonce = 0;

    function createRegistry(RegistryGardens.InitializeParams memory params)
        public
        returns (address _createdRegistryAddress)
    {
        RegistryGardens gardenRegistry = new RegistryGardens();
        params._nonce = nonce++;
        params.owner = msg.sender;
        gardenRegistry.initialize(params);
        return address(gardenRegistry);
    }
}
