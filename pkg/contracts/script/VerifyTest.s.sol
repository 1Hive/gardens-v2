// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "../src/CVStrategy/CVStrategyV0_0.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpers, CVStrategyV0_0} from "../test/CVStrategyHelpers.sol";
import {GV2ERC20} from "./GV2ERC20.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";

import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
// import {SafeProxyFactory} from "safe-smart-account/contracts/proxies/SafeProxyFactory.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";

import {BaseMultiChain} from "./BaseMultiChain.s.sol";

contract VerifyTest is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public virtual override {
        allo_proxy = networkJson.readAddress(getKeyNetwork(".ENVS.ALLO_PROXY"));

        if (allo_proxy == address(0)) {
            revert("ALLO_PROXY not set");
        }

        allo = Allo(allo_proxy);

        assertTrue(address(allo) != address(0));

        // --- Deploy all contracts that need verification ---

        new ERC1967Proxy(
            address(new SafeArbitrator()), abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0 ether)
        );

        new ERC1967Proxy(
            address(new RegistryFactoryV0_0()),
            abi.encodeWithSelector(
                RegistryFactoryV0_0.initialize.selector,
                address(SENDER),
                address(SENDER),
                new RegistryCommunityV0_0(),
                new CVStrategyV0_0(),
                new CollateralVault()
            )
        );

        vm.stopBroadcast();
    }
}
