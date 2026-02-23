// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IPauseController} from "../../src/interfaces/IPauseController.sol";

contract MockPauseController is IPauseController {
    bool public globalPaused;
    mapping(bytes4 => bool) public selectorPaused;

    function setGlobalPaused(bool paused) external {
        globalPaused = paused;
    }

    function setSelectorPaused(bytes4 selector, bool paused) external {
        selectorPaused[selector] = paused;
    }

    function pause(address, uint256) external {
        globalPaused = true;
    }

    function unpause(address) external {
        globalPaused = false;
    }

    function pauseSelector(address, bytes4 selector, uint256) external {
        selectorPaused[selector] = true;
    }

    function unpauseSelector(address, bytes4 selector) external {
        selectorPaused[selector] = false;
    }

    function isPaused(address) external view returns (bool) {
        return globalPaused;
    }

    function isPaused(address, bytes4 selector) external view returns (bool) {
        return globalPaused || selectorPaused[selector];
    }

    function pausedUntil(address) external view returns (uint256) {
        return globalPaused ? 1 : 0;
    }

    function pausedSelectorUntil(address, bytes4 selector) external view returns (uint256) {
        return selectorPaused[selector] ? 1 : 0;
    }
}
