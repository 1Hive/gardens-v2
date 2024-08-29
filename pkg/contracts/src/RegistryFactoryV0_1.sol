// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunityV0_0} from "../src/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactoryV0_0.sol";

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

    function initializeV2(address _owner) public reinitializer(2) {
        transferOwnership(_owner);
    }
}
