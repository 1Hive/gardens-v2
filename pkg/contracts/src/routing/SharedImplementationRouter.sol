// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {IRegistryFactory} from "../IRegistryFactory.sol";
import {IDiamondCut} from "../diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "../diamonds/interfaces/IERC165.sol";
import {IERC173} from "../diamonds/interfaces/IERC173.sol";
import {IArbitrable} from "../interfaces/IArbitrable.sol";
import {LibDiamond} from "../diamonds/libraries/LibDiamond.sol";
import {LibPauseStorage} from "../pausing/LibPauseStorage.sol";
import {IPauseController} from "../interfaces/IPauseController.sol";

/// @notice Stable UUPS implementation for one factory's strategies or communities.
/// @dev Runs in each ERC1967 proxy's storage context. The factory is immutable in this code.
abstract contract SharedImplementationRouter is ProxyOwnableUpgrader, IDiamondLoupe {
    address public immutable routingFactory;

    error RoutingTargetUnavailable(bytes4 selector);
    error LocalDiamondCutDisabled();
    error StrategyPaused(address controller);
    error StrategySelectorPaused(bytes4 selector, address controller);
    error CommunityPaused(address controller);
    error CommunitySelectorPaused(bytes4 selector, address controller);

    constructor(address factory) {
        if (factory.code.length == 0) revert RoutingTargetUnavailable(bytes4(0));
        routingFactory = factory;
    }

    /// @dev Pool creation starts with the community as direct owner, which transfers
    /// ownership to ProxyOwner after configuring the strategy's pause controller.
    function transferOwnership(address newOwner) public override {
        address directOwner = proxyOwner();
        if (msg.sender != directOwner && msg.sender != owner()) {
            revert CallerNotOwner(msg.sender, owner());
        }
        _transferOwnership(newOwner);
    }

    function _isStrategy() internal pure virtual returns (bool);

    function _target(bytes4 selector) internal view returns (address target, bool isFacet) {
        IRegistryFactory factory = IRegistryFactory(routingFactory);
        target = _isStrategy() ? factory.strategyFacet(selector) : factory.communityFacet(selector);
        isFacet = target != address(0);
        if (!isFacet) {
            target = _isStrategy() ? factory.strategyImplementation() : factory.communityImplementation();
        }
        if (target.code.length == 0) revert RoutingTargetUnavailable(selector);
    }

    fallback() external payable {
        (address target, bool isFacet) = _target(msg.sig);
        if (isFacet) _enforceNotPaused(msg.sig, target);
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {
        (address target,) = _target(bytes4(0));
        assembly {
            let result := delegatecall(gas(), target, 0, 0, 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    /// @dev A local cut would no longer affect dispatch and must not appear to succeed.
    function diamondCut(IDiamondCut.FacetCut[] calldata, address, bytes calldata) external pure {
        revert LocalDiamondCutDisabled();
    }

    /// @notice Execute a required one-time state migration on this instance while retaining its router.
    function runImplementationMigration(bytes calldata data) external onlyOwner returns (bytes memory result) {
        address target = _isStrategy()
            ? IRegistryFactory(routingFactory).strategyImplementation()
            : IRegistryFactory(routingFactory).communityImplementation();
        if (target.code.length == 0) revert RoutingTargetUnavailable(msg.sig);
        (bool success, bytes memory returned) = target.delegatecall(data);
        if (!success) {
            assembly { revert(add(returned, 32), mload(returned)) }
        }
        return returned;
    }

    function _cuts() internal view returns (IDiamondCut.FacetCut[] memory cuts) {
        if (_isStrategy()) {
            (cuts,,) = IRegistryFactory(routingFactory).getStrategyFacets();
        } else {
            (cuts,,) = IRegistryFactory(routingFactory).getCommunityFacets();
        }
    }

    function getFacets() external view returns (Facet[] memory) {
        return _facets();
    }

    function facets() external view override returns (Facet[] memory) {
        return _facets();
    }

    function _facets() internal view returns (Facet[] memory result) {
        IDiamondCut.FacetCut[] memory cuts = _cuts();
        uint256 totalSelectors = 5;
        for (uint256 i; i < cuts.length; i++) {
            for (uint256 j; j < cuts[i].functionSelectors.length; j++) {
                if (!_isLoupeSelector(cuts[i].functionSelectors[j])) totalSelectors++;
            }
        }
        result = new Facet[](totalSelectors);
        uint256[] memory counts = new uint256[](totalSelectors);
        uint256 count;
        for (uint256 i; i < cuts.length; i++) {
            for (uint256 k; k < cuts[i].functionSelectors.length; k++) {
                bytes4 selector = cuts[i].functionSelectors[k];
                if (_isLoupeSelector(selector)) continue;
                address target = cuts[i].facetAddress;
                uint256 index = count;
                for (uint256 j; j < count; j++) {
                    if (result[j].facetAddress == target) {
                        index = j;
                        break;
                    }
                }
                if (index == count) {
                    result[count].facetAddress = target;
                    result[count].functionSelectors = new bytes4[](totalSelectors);
                    count++;
                }
                result[index].functionSelectors[counts[index]++] = selector;
            }
        }
        result[count].facetAddress = address(this);
        result[count].functionSelectors = new bytes4[](5);
        result[count].functionSelectors[0] = IDiamondLoupe.facets.selector;
        result[count].functionSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        result[count].functionSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        result[count].functionSelectors[3] = IDiamondLoupe.facetAddress.selector;
        result[count].functionSelectors[4] = bytes4(keccak256("supportsInterface(bytes4)"));
        counts[count] = 5;
        count++;
        for (uint256 i; i < count; i++) {
            bytes4[] memory selectors = result[i].functionSelectors;
            uint256 length = counts[i];
            assembly { mstore(selectors, length) }
        }
        assembly { mstore(result, count) }
    }

    function facetAddress(bytes4 selector) external view override returns (address) {
        if (_isLoupeSelector(selector)) return address(this);
        IRegistryFactory factory = IRegistryFactory(routingFactory);
        return _isStrategy() ? factory.strategyFacet(selector) : factory.communityFacet(selector);
    }

    function facetFunctionSelectors(address facet) external view override returns (bytes4[] memory selectors) {
        Facet[] memory current = _facets();
        for (uint256 i; i < current.length; i++) {
            if (current[i].facetAddress == facet) return current[i].functionSelectors;
        }
        return new bytes4[](0);
    }

    function facetAddresses() external view override returns (address[] memory addresses) {
        Facet[] memory current = _facets();
        addresses = new address[](current.length);
        for (uint256 i; i < current.length; i++) addresses[i] = current[i].facetAddress;
    }

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        if (interfaceId == type(IDiamondCut).interfaceId) return false;
        if (
            interfaceId == type(IERC165).interfaceId || interfaceId == type(IDiamondLoupe).interfaceId
                || interfaceId == type(IERC173).interfaceId
        ) return true;
        if (_isStrategy() && interfaceId == type(IArbitrable).interfaceId) return true;
        return LibDiamond.diamondStorage().supportedInterfaces[interfaceId];
    }

    function _enforceNotPaused(bytes4 selector, address facet) internal view {
        if (facet == LibPauseStorage.layout().pauseFacet || _pauseExempt(selector)) return;
        address controller = LibPauseStorage.layout().pauseController;
        if (controller == address(0) || controller.code.length == 0) return;
        if (IPauseController(controller).isPaused(address(this))) _revertPaused(controller);
        if (IPauseController(controller).isPaused(address(this), selector)) _revertSelectorPaused(selector, controller);
    }

    function _pauseExempt(bytes4 selector) internal pure returns (bool) {
        if (
            selector == bytes4(keccak256("setPauseController(address)"))
                || selector == bytes4(keccak256("setPauseFacet(address)"))
                || selector == bytes4(keccak256("pause(uint256)"))
                || selector == bytes4(keccak256("pause(bytes4,uint256)"))
                || selector == bytes4(keccak256("unpause()"))
                || selector == bytes4(keccak256("unpause(bytes4)"))
                || selector == bytes4(keccak256("pauseFacet()"))
                || selector == bytes4(keccak256("pauseController()"))
                || selector == bytes4(keccak256("isPaused()"))
                || selector == bytes4(keccak256("isPaused(bytes4)"))
                || selector == bytes4(keccak256("pausedUntil()"))
                || selector == bytes4(keccak256("pausedSelectorUntil(bytes4)"))
        ) return true;
        if (_isStrategy()) {
            return selector == bytes4(keccak256("rule(uint256,uint256)"))
                || selector == bytes4(keccak256("deactivatePoints()"))
                || selector == bytes4(keccak256("deactivatePoints(address)"));
        }
        return selector == bytes4(keccak256("unregisterMember()"))
            || selector == bytes4(keccak256("deactivateMemberInStrategy(address,address)"))
            || selector == bytes4(keccak256("getMemberPowerInStrategy(address,address)"));
    }

    function _isLoupeSelector(bytes4 selector) internal pure returns (bool) {
        return selector == IDiamondLoupe.facets.selector
            || selector == IDiamondLoupe.facetFunctionSelectors.selector
            || selector == IDiamondLoupe.facetAddresses.selector
            || selector == IDiamondLoupe.facetAddress.selector
            || selector == bytes4(keccak256("supportsInterface(bytes4)"));
    }

    function _revertPaused(address controller) internal pure {
        if (_isStrategy()) revert StrategyPaused(controller);
        revert CommunityPaused(controller);
    }

    function _revertSelectorPaused(bytes4 selector, address controller) internal pure {
        if (_isStrategy()) revert StrategySelectorPaused(selector, controller);
        revert CommunitySelectorPaused(selector, controller);
    }
}

contract CVStrategyRouter is SharedImplementationRouter {
    constructor(address factory) SharedImplementationRouter(factory) {}
    function _isStrategy() internal pure override returns (bool) { return true; }
}

contract RegistryCommunityRouter is SharedImplementationRouter {
    constructor(address factory) SharedImplementationRouter(factory) {}
    function _isStrategy() internal pure override returns (bool) { return false; }
}
