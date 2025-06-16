// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library RevertMsg {
    function reason(string memory) internal pure returns (string memory) {
        assembly {
            revert(0, 0) // revert without data
        }
    }
}