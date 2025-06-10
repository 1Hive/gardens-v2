// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

library RevertMsg {
    // Uncomment when Test
    function reason(string memory s) internal pure returns (string memory) {
        return s;
    }

    // // Uncomment when Prod
    // function reason(string memory) internal pure returns (string memory) {
    //     revert();
    // }
}
