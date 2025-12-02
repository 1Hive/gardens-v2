// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract ProxyOwnableUpgrader is OwnableUpgradeable, UUPSUpgradeable {
    error CallerNotOwner(address _caller, address _owner);

    function initialize(address initialOwner) public initializer {
        _transferOwnership(initialOwner);
    }

    function proxyOwner() public view returns (address) {
        return OwnableUpgradeable.owner();
    }

    function owner() public view override returns (address) {
        // Check if the current owner is a contract
        if (address(proxyOwner()).code.length == 0) {
            // The owner is an EOA or a non-contract address
            return proxyOwner();
        } else {
            try OwnableUpgradeable(proxyOwner()).owner() returns (address _owner) {
                return _owner;
            } catch {
                // Handle the case where the recursive call fails
                return proxyOwner();
            }
        }
    }

    function _authorizeUpgrade(address) internal view override {
        if (owner() != msg.sender) {
            revert CallerNotOwner(msg.sender, owner());
        }
    }
}
