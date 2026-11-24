// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {IPauseController} from "../interfaces/IPauseController.sol";
import {LibPauseStorage} from "./LibPauseStorage.sol";
import {PauseOwnerLib} from "./PauseOwnerLib.sol";

abstract contract ControlledPauseUpgradeable is ProxyOwnableUpgrader {
    error InvalidPauseController(address controller);
    error PauseControllerNotSet();
    error ContractPaused(address controller);

    event PauseControllerUpdated(address indexed controller);

    function setPauseController(address controller) external {
        _enforcePauseOwner();
        if (controller == address(0) || controller.code.length == 0) revert InvalidPauseController(controller);
        LibPauseStorage.layout().pauseController = controller;
        emit PauseControllerUpdated(controller);
    }

    function pause(uint256 duration) external {
        _enforcePauseOwner();
        _pauseController().pause(address(this), duration);
    }

    function pause(bytes4 selector, uint256 duration) external {
        _enforcePauseOwner();
        _pauseController().pauseSelector(address(this), selector, duration);
    }

    function unpause() external {
        _enforcePauseOwner();
        _pauseController().unpause(address(this));
    }

    function unpause(bytes4 selector) external {
        _enforcePauseOwner();
        _pauseController().unpauseSelector(address(this), selector);
    }

    function pauseController() public view returns (address) {
        return LibPauseStorage.layout().pauseController;
    }

    function isPaused() public view returns (bool) {
        address controller = pauseController();
        return controller != address(0) && IPauseController(controller).isPaused(address(this));
    }

    function isPaused(bytes4 selector) public view returns (bool) {
        address controller = pauseController();
        return controller != address(0) && IPauseController(controller).isPaused(address(this), selector);
    }

    modifier whenNotPaused() {
        if (isPaused(msg.sig)) revert ContractPaused(pauseController());
        _;
    }

    function _pauseController() internal view returns (IPauseController) {
        address controller = pauseController();
        if (controller == address(0)) revert PauseControllerNotSet();
        return IPauseController(controller);
    }

    function _enforcePauseOwner() internal view {
        address currentOwner = owner();
        if (msg.sender != currentOwner && !PauseOwnerLib.isMainOwner(proxyOwner(), msg.sender)) {
            revert CallerNotOwner(msg.sender, currentOwner);
        }
    }
}
