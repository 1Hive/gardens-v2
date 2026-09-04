// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @dev Minimal stand-in for `RegistryCommunity`'s public `councilSafe`
/// getter, with rotation support to simulate Safe changes. Test-only.
contract MockRegistryCommunity {
    address public councilSafe;

    constructor(address _councilSafe) {
        councilSafe = _councilSafe;
    }

    function setCouncilSafe(address _councilSafe) external {
        councilSafe = _councilSafe;
    }
}
