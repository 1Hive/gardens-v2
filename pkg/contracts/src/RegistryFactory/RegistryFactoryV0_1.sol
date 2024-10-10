// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryFactoryV0_0} from "../RegistryFactory/RegistryFactoryV0_0.sol";

/// @custom:oz-upgrades-from RegistryFactoryV0_0
contract RegistryFactoryV0_1 is RegistryFactoryV0_0 {
    function initializeV2() public reinitializer(2) {}
}
