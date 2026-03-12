// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";

interface IGlobalPauseControllerUnpause {
    function unpause(address target) external;
}

contract UnpauseAllByController is BaseMultiChain {
    using stdJson for string;

    function run(string memory network) public override {
        BaseMultiChain.run(network);
    }

    function runCurrentNetwork(string memory networkJson) public override {
        address controller = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
        require(controller != address(0), "PAUSE_CONTROLLER not set");

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        _unpauseTarget(controller, registryFactoryProxy);

        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            _unpauseTarget(controller, registryCommunityProxies[i]);
        }

        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            _unpauseTarget(controller, cvStrategyProxies[i]);
        }
    }

    function _unpauseTarget(address controller, address target) internal {
        if (target == address(0)) return;
        IGlobalPauseControllerUnpause(controller).unpause(target);
    }
}

