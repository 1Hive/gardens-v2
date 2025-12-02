// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./UpgradeCVDiamond.s.sol";

/**
 * @title UpgradeCVDiamondTest
 * @notice Wrapper that forces direct-broadcast mode for local/test execution
 */
contract UpgradeCVDiamondTest is UpgradeCVDiamond {
    constructor() {
        directBroadcastOverride = true;
    }
}
