// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunity} from "../src/RegistryCommunity.sol";

import {RegistryFactoryV0_0} from "../src/RegistryFactoryV0_0.sol";

import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";

struct CommunityInfo {
    uint256 fee;
    bool valid;
}
/// @custom:oz-upgrades-from RegistryFactoryV0_0

contract RegistryFactoryV0_1 is RegistryFactoryV0_0 {
    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    /*|--------------------------------------------|*/
    /*|                 ERRORS                     |*/
    /*|--------------------------------------------|*/

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/

    function initializeV2() public reinitializer(2) {
        __Ownable_init();
    }
}