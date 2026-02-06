// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

library LibPauseStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("gardens.pause.storage");

    struct Layout {
        address pauseController;
        address pauseFacet;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT; assembly { l.slot := slot }
    }
}
