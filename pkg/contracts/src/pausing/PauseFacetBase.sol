// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IPauseController} from "../interfaces/IPauseController.sol";
import {LibPauseStorage} from "./LibPauseStorage.sol";
import {LibDiamond} from "../diamonds/libraries/LibDiamond.sol";

abstract contract PauseFacetBase {
    error PauseControllerNotSet();
    error NotOwner(address caller, address owner);

    event PauseControllerUpdated(address indexed controller);
    event PauseFacetUpdated(address indexed facet);

    function setPauseController(address controller) external {
        _enforceOwner();
        _registerPauseFacet();
        LibPauseStorage.layout().pauseController = controller;
        emit PauseControllerUpdated(controller);
    }

    function setPauseFacet(address facet) external {
        _enforceOwner();
        _setPauseFacet(facet);
    }

    function pauseFacet() external view returns (address) {
        return LibPauseStorage.layout().pauseFacet;
    }

    function pauseController() external view returns (address) {
        return LibPauseStorage.layout().pauseController;
    }

    function pause(uint256 duration) external {
        _enforceOwner();
        _registerPauseFacet();
        _pauseController().pause(address(this), duration);
    }

    function pause(bytes4 selector, uint256 duration) external {
        _enforceOwner();
        _registerPauseFacet();
        _pauseController().pauseSelector(address(this), selector, duration);
    }

    function unpause() external {
        _enforceOwner();
        _registerPauseFacet();
        _pauseController().unpause(address(this));
    }

    function unpause(bytes4 selector) external {
        _enforceOwner();
        _registerPauseFacet();
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

    function _registerPauseFacet() internal {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address facet = ds.facetAddressAndSelectorPosition[msg.sig].facetAddress;
        if (facet != address(0)) {
            _setPauseFacet(facet);
        }
    }

    function _setPauseFacet(address facet) internal {
        if (facet == address(0)) {
            return;
        }
        LibPauseStorage.Layout storage layout = LibPauseStorage.layout();
        if (layout.pauseFacet != facet) {
            layout.pauseFacet = facet;
            emit PauseFacetUpdated(facet);
        }
    }

    function _pauseController() internal view returns (IPauseController) {
        address controller = LibPauseStorage.layout().pauseController;
        if (controller == address(0)) {
            revert PauseControllerNotSet();
        }
        return IPauseController(controller);
    }

    function _enforceOwner() internal view {
        address currentOwner = _pauseOwner();
        if (msg.sender != currentOwner) {
            revert NotOwner(msg.sender, currentOwner);
        }
    }

    function _pauseOwner() internal view virtual returns (address);
}
