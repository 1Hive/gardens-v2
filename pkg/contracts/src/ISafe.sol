// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.19;

interface ISafe {
    function getOwners() external view returns (address[] memory);
}
