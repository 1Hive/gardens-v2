// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";

interface IGlobalPauseController {
    function pause(address target, uint256 duration) external;
}

contract PauseAllByController is BaseMultiChain {
    using stdJson for string;

    uint256 internal pauseDuration;

    function run(string memory network, uint256 duration) public {
        require(duration > 0, "duration must be > 0");
        pauseDuration = duration;
        BaseMultiChain.run(network);
    }

    function runCurrentNetwork(string memory networkJson) public override {
        address controller = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
        require(controller != address(0), "PAUSE_CONTROLLER not set");

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        _pauseTarget(controller, registryFactoryProxy);

        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            _pauseTarget(controller, registryCommunityProxies[i]);
        }

        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            _pauseTarget(controller, cvStrategyProxies[i]);
        }
    }

    function _pauseTarget(address controller, address target) internal {
        if (target == address(0)) return;
        IGlobalPauseController(controller).pause(target, pauseDuration);
    }
}

