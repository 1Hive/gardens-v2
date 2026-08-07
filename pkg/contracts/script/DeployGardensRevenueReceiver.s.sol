// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {GardensRevenueReceiver} from "../src/MarkeeRevenue/GardensRevenueReceiver.sol";

/// @notice Deploys the singleton `GardensRevenueReceiver` for one remote
/// Gardens chain, behind an `ERC1967Proxy` owned by that chain's
/// `PROXY_OWNER`. `PROXY_OWNER` must separately call `setSquidExecutor(...)`
/// once Squid's real executor address for this chain is confirmed — until
/// then `onReceive` reverts for everyone, which is the safe default.
contract DeployGardensRevenueReceiver is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "proxy owner is zero");

        address receiverImplementation = address(new GardensRevenueReceiver());
        address receiverProxy = address(
            new ERC1967Proxy(
                receiverImplementation, abi.encodeWithSelector(GardensRevenueReceiver.initialize.selector, proxyOwner)
            )
        );

        console2.log("Proxy owner", proxyOwner);
        console2.log("GardensRevenueReceiver impl", receiverImplementation);
        console2.log("GardensRevenueReceiver proxy", receiverProxy);
        console2.log("NOTE: PROXY_OWNER must call receiver.setSquidExecutor(executor) before use");
    }
}
