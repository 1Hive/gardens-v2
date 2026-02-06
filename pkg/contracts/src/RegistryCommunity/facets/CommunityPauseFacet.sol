// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet} from "../CommunityBaseFacet.sol";
import {IPauseController} from "../../interfaces/IPauseController.sol";
import {LibPauseStorage} from "../../pausing/LibPauseStorage.sol";

/**
 * @title CommunityPauseFacet
 * @notice Pause management for RegistryCommunity using a centralized pause controller
 * @dev This facet is called via delegatecall from RegistryCommunity
 *      CRITICAL: Inherits storage layout from CommunityBaseFacet
 */
contract CommunityPauseFacet is CommunityBaseFacet {
    error PauseControllerNotSet();
    error NotOwner(address caller, address owner);

    event PauseControllerUpdated(address indexed controller);

    function setPauseController(address controller) external {
        _enforceOwner();
        LibPauseStorage.layout().pauseController = controller;
        emit PauseControllerUpdated(controller);
    }

    function pauseController() external view returns (address) {
        return LibPauseStorage.layout().pauseController;
    }

    function pause(uint256 duration) external {
        _enforceOwner();
        _pauseController().pause(address(this), duration);
    }

    function pause(bytes4 selector, uint256 duration) external {
        _enforceOwner();
        _pauseController().pauseSelector(address(this), selector, duration);
    }

    function unpause() external {
        _enforceOwner();
        _pauseController().unpause(address(this));
    }

    function unpause(bytes4 selector) external {
        _enforceOwner();
        _pauseController().unpauseSelector(address(this), selector);
    }

    function isPaused() external view returns (bool) {
        address controller = LibPauseStorage.layout().pauseController;
        if (controller == address(0)) {
            return false;
        }
        return IPauseController(controller).isPaused(address(this));
    }

    function isPaused(bytes4 selector) external view returns (bool) {
        address controller = LibPauseStorage.layout().pauseController;
        if (controller == address(0)) {
            return false;
        }
        return IPauseController(controller).isPaused(address(this), selector);
    }

    function pausedUntil() external view returns (uint256) {
        return _pauseController().pausedUntil(address(this));
    }

    function pausedSelectorUntil(bytes4 selector) external view returns (uint256) {
        return _pauseController().pausedSelectorUntil(address(this), selector);
    }

    function _pauseController() internal view returns (IPauseController) {
        address controller = LibPauseStorage.layout().pauseController;
        if (controller == address(0)) {
            revert PauseControllerNotSet();
        }
        return IPauseController(controller);
    }

    function _enforceOwner() internal view {
        address currentOwner = owner();
        if (msg.sender != currentOwner) {
            revert NotOwner(msg.sender, currentOwner);
        }
    }
}
