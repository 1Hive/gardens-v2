// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/Script.sol";
import {GoodDollarSybil} from "../src/GoodDollarSybil.sol";
import {CVStrategyV0_0} from "../src/CVStrategy/CVStrategyV0_0.sol";

contract DeployGoodDollarSybil is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address listManager = 0xA718ACA8Eb8f01EcfE929BF16c19e562B57b053b; // Multichain EOA
        // address sender = networkJson.readAddress(getKeyNetwork(".ENVS.SENDER"));

        address newGoodDollar = address(
            new ERC1967Proxy(
                address(new GoodDollarSybil()),
                abi.encodeWithSelector(GoodDollarSybil.initialize.selector, address(listManager), address(proxyOwner))
            )
        );

        console.log("New GoodDollar: ", newGoodDollar);
    }
}
