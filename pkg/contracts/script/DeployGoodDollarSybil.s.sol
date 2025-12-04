// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/Script.sol";
import {GoodDollarSybil} from "../src/GoodDollarSybil.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";

contract DeployGoodDollarSybil is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address listManager = 0xA718ACA8Eb8f01EcfE929BF16c19e562B57b053b; // Multichain EOA
        address goodDollar = networkJson.readAddress(getKeyNetwork(".ENVS.GOOD_DOLLAR_SYBIL"));

        address newImplementation = address(new GoodDollarSybil());

        if (goodDollar != address(0)) {
            GoodDollarSybil(goodDollar).upgradeTo(newImplementation);
        } else {
            goodDollar = address(
                new ERC1967Proxy(
                    newImplementation,
                    abi.encodeWithSelector(
                        GoodDollarSybil.initialize.selector, address(listManager), address(proxyOwner)
                    )
                )
            );
        }
        console.log("GoodDollar address: ", goodDollar);
    }
}
