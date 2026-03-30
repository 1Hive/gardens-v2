// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/Script.sol";
import {GlobalPauseController} from "../src/pausing/GlobalPauseController.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

interface IPauseFacet {
    function pauseController() external view returns (address);
    function setPauseController(address controller) external;
}

interface IRegistryFactoryPauseController {
    function globalPauseController() external view returns (address);
    function setGlobalPauseController(address controller) external;
}

interface IUUPSUpgradeableProxy {
    function upgradeTo(address newImplementation) external;
}

interface IOwnableView {
    function owner() external view returns (address);
}

interface IProxyOwnableView is IOwnableView {
    function proxyOwner() external view returns (address);
}

contract DeployGlobalPauseController is BaseMultiChain {
    using stdJson for string;
    bytes4 private constant _PAUSE_CONTROLLER_SELECTOR = IPauseFacet.pauseController.selector;

    error PauseControllerUpgradeNotAuthorized(address controller, address deployer, address owner);
    error PauseControllerConfiguredProxyOwnerMismatch(
        address controller, address expectedProxyOwner, address actualProxyOwner
    );
    error PauseControllerConfiguredOwnerMismatch(address controller, address expectedOwner, address actualOwner);

    function runCurrentNetwork(string memory networkJson) public override {
        bool deployOnly = vm.envOr("DEPLOY_ONLY", false);
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address owner = networkJson.readAddress(getKeyNetwork(".ENVS.SENDER"));
        address controller = _readAddressOrZero(".ENVS.PAUSE_CONTROLLER");
        bool pauseControllerAlreadySet = controller != address(0);
        address controllerImplementation = address(new GlobalPauseController());

        if (controller == address(0)) {
            controller = address(
                new ERC1967Proxy(
                    controllerImplementation,
                    abi.encodeWithSelector(GlobalPauseController.initialize.selector, proxyOwner)
                )
            );

            _writeNetworkAddress(".ENVS.PAUSE_CONTROLLER", controller);
        } else {
            if (!deployOnly) {
                IProxyOwnableView pauseController = IProxyOwnableView(controller);
                address controllerProxyOwner = pauseController.proxyOwner();
                if (controllerProxyOwner != proxyOwner) {
                    revert PauseControllerConfiguredProxyOwnerMismatch(controller, proxyOwner, controllerProxyOwner);
                }
                address controllerOwner = pauseController.owner();
                if (controllerOwner != owner) {
                    revert PauseControllerConfiguredOwnerMismatch(controller, owner, controllerOwner);
                }
                if (SENDER != owner) {
                    revert PauseControllerUpgradeNotAuthorized(controller, SENDER, owner);
                }
                IUUPSUpgradeableProxy(payable(controller)).upgradeTo(controllerImplementation);
            }
        }
        _writeNetworkAddress(".IMPLEMENTATIONS.PAUSE_CONTROLLER", controllerImplementation);

        if (deployOnly) {
            console2.log("DEPLOY_ONLY enabled");
            console2.log("Pause controller", controller);
            console2.log("Pause controller implementation", controllerImplementation);
            console2.log("Onchain pause-controller wiring skipped");
            return;
        }

        if (!pauseControllerAlreadySet) {
            address[] memory registryCommunityProxies =
                networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
            for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
                _setPauseController(registryCommunityProxies[i], controller);
            }

            address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
            for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
                _setPauseController(cvStrategyProxies[i], controller);
            }
        } else {
            console2.log("Pause controller already set in config; skipping community and strategy rewiring");
        }

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        _setFactoryPauseController(registryFactoryProxy, controller);
    }

    function _setPauseController(address target, address controller) internal {
        if (!_supportsPauseController(target)) {
            console2.log("Skipping target without pause facet", target);
            return;
        }

        IPauseFacet pauseFacet = IPauseFacet(target);
        address current = pauseFacet.pauseController();
        if (current != controller) {
            pauseFacet.setPauseController(controller);
        } else {}
    }

    function _supportsPauseController(address target) internal view returns (bool) {
        (bool ok,) = target.staticcall(abi.encodeWithSelector(_PAUSE_CONTROLLER_SELECTOR));
        return ok;
    }

    function _setFactoryPauseController(address factory, address controller) internal {
        IRegistryFactoryPauseController registryFactory = IRegistryFactoryPauseController(factory);
        address current = registryFactory.globalPauseController();
        if (current != controller) {
            registryFactory.setGlobalPauseController(controller);
        } else {}
    }
}
