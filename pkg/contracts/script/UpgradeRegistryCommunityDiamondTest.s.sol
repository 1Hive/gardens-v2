// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./UpgradeRegistryCommunityDiamond.s.sol";

/**
 * @title UpgradeRegistryCommunityDiamondTest
 * @notice Convenience wrapper that forces direct broadcast mode for local/test runs
 */
contract UpgradeRegistryCommunityDiamondTest is UpgradeRegistryCommunityDiamond {
    constructor() {
        directBroadcastOverride = true;
    }
}
