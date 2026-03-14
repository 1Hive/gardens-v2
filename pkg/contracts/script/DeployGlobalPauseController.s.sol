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

contract DeployGlobalPauseController is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address controller = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
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
            IUUPSUpgradeableProxy(payable(controller)).upgradeTo(controllerImplementation);
        }
        _writeNetworkAddress(".IMPLEMENTATIONS.PAUSE_CONTROLLER", controllerImplementation);

        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            _setPauseController(registryCommunityProxies[i], controller);
        }

        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            _setPauseController(cvStrategyProxies[i], controller);
        }

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        _setFactoryPauseController(registryFactoryProxy, controller);
    }

    function _setPauseController(address target, address controller) internal {
        IPauseFacet pauseFacet = IPauseFacet(target);
        address current = pauseFacet.pauseController();
        if (current != controller) {
            pauseFacet.setPauseController(controller);
        } else {
        }
    }

    function _setFactoryPauseController(address factory, address controller) internal {
        IRegistryFactoryPauseController registryFactory = IRegistryFactoryPauseController(factory);
        address current = registryFactory.globalPauseController();
        if (current != controller) {
            registryFactory.setGlobalPauseController(controller);
        } else {
        }
    }

    function _writeNetworkAddress(string memory key, address value) internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory tmpPath = string.concat(root, "/pkg/contracts/config/.networks.tmp.json");
        string memory command = string.concat(
            "jq '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            ") = \"",
            _addressToString(value),
            "\"' ",
            path,
            " > ",
            tmpPath,
            " && mv ",
            tmpPath,
            " ",
            path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        vm.ffi(inputs);
    }

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
