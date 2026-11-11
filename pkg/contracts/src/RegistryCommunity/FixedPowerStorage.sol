// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

library FixedPowerStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("registrycommunity.storage.fixed-power.v1");

    struct Layout {
        // An offset distinguishes an unset legacy member from a zero-stake registration.
        mapping(address => uint256) registrationBasisPlusOne;
        mapping(address => mapping(address => uint256)) legacyStrategyBasisPlusOne;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
