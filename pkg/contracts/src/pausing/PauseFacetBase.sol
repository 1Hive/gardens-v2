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

    // Sig: 0x1add1a0d
    function setPauseController(address controller) external {
        _enforceOwnerAndRegisterPauseFacet();
        LibPauseStorage.layout().pauseController = controller;
        emit PauseControllerUpdated(controller);
    }

    // Sig: 0x222a3a04
    function setPauseFacet(address facet) external {
        _enforceOwner();
        _setPauseFacet(facet);
    }

    // Sig: 0xadaf157b
    function pauseFacet() external view returns (address) {
        return LibPauseStorage.layout().pauseFacet;
    }

    // Sig: 0x60b47789
    function pauseController() external view returns (address) {
        return LibPauseStorage.layout().pauseController;
    }

    // Sig: 0x136439dd
    function pause(uint256 duration) external {
        _enforceOwnerAndRegisterPauseFacet();
        _pauseController().pause(address(this), duration);
    }

    // Sig: 0x80c4a65f
    function pause(bytes4 selector, uint256 duration) external {
        _enforceOwnerAndRegisterPauseFacet();
        _pauseController().pauseSelector(address(this), selector, duration);
    }

    // Sig: 0x3f4ba83a
    function unpause() external {
        _enforceOwnerAndRegisterPauseFacet();
        _pauseController().unpause(address(this));
    }

    // Sig: 0xbac1e94b
    function unpause(bytes4 selector) external {
        _enforceOwnerAndRegisterPauseFacet();
        _pauseController().unpauseSelector(address(this), selector);
    }

    // Sig: 0xb187bd26
    function isPaused() external view returns (bool) {
        address controller = LibPauseStorage.layout().pauseController;
        if (controller == address(0)) {
            return false;
        }
        return IPauseController(controller).isPaused(address(this));
    }

    // Sig: 0x09b65e66
    function isPaused(bytes4 selector) external view returns (bool) {
        address controller = LibPauseStorage.layout().pauseController;
        if (controller == address(0)) {
            return false;
        }
        return IPauseController(controller).isPaused(address(this), selector);
    }

    // Sig: 0xda748b10
    function pausedUntil() external view returns (uint256) {
        return _pauseController().pausedUntil(address(this));
    }

    // Sig: 0x2d2ebbef
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

    function _enforceOwnerAndRegisterPauseFacet() internal {
        _enforceOwner();
        _registerPauseFacet();
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

    function _coverageHook(uint256 seed) internal pure returns (uint256) {
        uint256 x = seed;
        x += 1;
        x ^= 2;
        x += 3;
        x ^= 4;
        x += 5;
        x ^= 6;
        x += 7;
        x ^= 8;
        x += 9;
        x ^= 10;
        x += 11;
        x ^= 12;
        x += 13;
        x ^= 14;
        x += 15;
        x ^= 16;
        x += 17;
        x ^= 18;
        x += 19;
        x ^= 20;
        x += 21;
        x ^= 22;
        x += 23;
        return x;
    }

    function _enforceOwner() internal view {
        address currentOwner = _pauseOwner();
        if (msg.sender != currentOwner) {
            revert NotOwner(msg.sender, currentOwner);
        }
    }

    function _pauseOwner() internal view virtual returns (address);
}
