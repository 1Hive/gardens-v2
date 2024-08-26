// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";

contract ProxyOwner is OwnableUpgradeable {
    function initialize(address initialOwner) public initializer {
        _transferOwnership(initialOwner);
    }
}
