// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @dev Legacy per-proxy upgrade scripts must never replace a shared-router release.
library LegacyRoutingGuard {
    function requireUnroutedFactory(address factory) internal view {
        (bool strategyOk, bytes memory strategyData) =
            factory.staticcall(abi.encodeWithSignature("strategyImplementation()"));
        (bool communityOk, bytes memory communityData) =
            factory.staticcall(abi.encodeWithSignature("communityImplementation()"));
        require(
            !(strategyOk && strategyData.length == 32 && abi.decode(strategyData, (address)) != address(0))
                && !(communityOk && communityData.length == 32 && abi.decode(communityData, (address)) != address(0)),
            "shared routing active: use prepare-shared-release.mjs"
        );
    }

    function requireLocalProxy(address proxy) internal view {
        (bool ok, bytes memory data) = proxy.staticcall(abi.encodeWithSignature("routingFactory()"));
        require(
            !(ok && data.length == 32 && abi.decode(data, (address)) != address(0)),
            "proxy uses shared routing: use prepare-shared-release.mjs"
        );
    }
}
