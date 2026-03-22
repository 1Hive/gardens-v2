// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";

interface IProxyOwnerUUPS {
    function upgradeTo(address newImplementation) external;
}

contract UpgradeProxyOwner is BaseMultiChain {
    using stdJson for string;

    bytes32 internal constant EIP1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    address internal requestedImplementation;
    bool internal deployImplementationOnly;

    function run(string memory network, address implementation, bool implementationOnly) public {
        requestedImplementation = implementation;
        deployImplementationOnly = implementationOnly;
        BaseMultiChain.run(network);
    }

    function run(string memory network, address implementation) public {
        run(network, implementation, false);
    }

    function run(string memory network) public override {
        run(network, address(0), false);
    }

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = address(0);
        address currentImplementation = address(0);

        if (!deployImplementationOnly) {
            proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
            require(proxyOwner != address(0), "PROXY_OWNER is zero");
            require(proxyOwner.code.length > 0, "PROXY_OWNER has no code");
            currentImplementation = _implementationOf(proxyOwner);
        }

        address nextImplementation = _resolveImplementation(currentImplementation);

        console2.log("Network", CURRENT_NETWORK);
        console2.log("Target implementation", nextImplementation);
        console2.log("Deploy implementation only", deployImplementationOnly);

        if (deployImplementationOnly) {
            console2.log("Implementation deployed and snapshotted");
        } else if (_codehash(currentImplementation) != _codehash(nextImplementation)) {
            console2.log("Proxy owner", proxyOwner);
            console2.log("Current implementation", currentImplementation);
            IProxyOwnerUUPS(payable(proxyOwner)).upgradeTo(nextImplementation);
            console2.log("Upgrade executed");
        } else {
            console2.log("Proxy owner", proxyOwner);
            console2.log("Current implementation", currentImplementation);
            console2.log("Upgrade skipped: implementation unchanged");
        }

        _writeNetworkAddress(".IMPLEMENTATIONS.PROXY_OWNER", nextImplementation);
    }

    function _resolveImplementation(address currentImplementation) internal returns (address) {
        if (requestedImplementation != address(0)) {
            return requestedImplementation;
        }

        address candidate = address(new ProxyOwner());
        if (currentImplementation != address(0) && _codehash(candidate) == _codehash(currentImplementation)) {
            return currentImplementation;
        }
        return candidate;
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        bytes32 raw = vm.load(proxy, EIP1967_IMPLEMENTATION_SLOT);
        implementation = address(uint160(uint256(raw)));
    }

    function _codehash(address target) internal view returns (bytes32) {
        return target.codehash;
    }

}
