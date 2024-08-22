// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactoryV0_0.sol";
import {RegistryFactoryV0_1} from "../src/RegistryFactoryV0_1.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunityV0_0.sol";
import {CVStrategyV0_0} from "../src/CVStrategyV0_0.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";
import {Options} from "openzeppelin-foundry-upgrades/Options.sol";

contract ProxyOwnerTest is Test {
    address deployerWallet = makeAddr("deployerWallet");
    address anotherWallet = makeAddr("anotherWallet");
    address protocolFeeReceiver = makeAddr("multisigReceiver");

    function test_upgradeWithProxyAdmin() public {
        vm.startPrank(deployerWallet);

        ProxyOwner proxyOwner = ProxyOwner(
            address(
                new ERC1967Proxy(
                    address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, deployerWallet)
                )
            )
        );

        ERC1967Proxy proxyRegistryFactory = new ERC1967Proxy(
            address(new RegistryFactoryV0_0()),
            abi.encodeWithSelector(
                RegistryFactoryV0_0.initialize.selector,
                address(proxyOwner), // owner
                address(protocolFeeReceiver), // gardensFeeReceiver
                address(new RegistryCommunityV0_0()), // registryCommunityTemplate
                address(new CVStrategyV0_0()), // strategyTemplate
                address(new CollateralVault()) // collateralVaultTemplate
            )
        );

        Upgrades.upgradeProxy(
            address(proxyRegistryFactory),
            "RegistryFactoryV0_1.sol",
            abi.encodeWithSelector(RegistryFactoryV0_1.initializeV2.selector, deployerWallet)
        );
    }

    function test_upgradeWithEOAOwner() public {
        vm.startPrank(deployerWallet);

        ERC1967Proxy proxyRegistryFactory = new ERC1967Proxy(
            address(new RegistryFactoryV0_0()),
            abi.encodeWithSelector(
                RegistryFactoryV0_0.initialize.selector,
                address(deployerWallet), // owner
                address(protocolFeeReceiver), // gardensFeeReceiver
                address(new RegistryCommunityV0_0()), // registryCommunityTemplate
                address(new CVStrategyV0_0()), // strategyTemplate
                address(new CollateralVault()) // collateralVaultTemplate
            )
        );

        Upgrades.upgradeProxy(
            address(proxyRegistryFactory),
            "RegistryFactoryV0_1.sol",
            abi.encodeWithSelector(RegistryFactoryV0_1.initializeV2.selector, deployerWallet)
        );
    }

    // function test_Revert_transferProxyAdminOwnershipNotExpectedOwner() public {
    //     vm.startPrank(deployerWallet);

    //     ProxyOwner proxyOwner = ProxyOwner(
    //         address(
    //             new ERC1967Proxy(
    //                 address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, deployerWallet)
    //             )
    //         )
    //     );

    //     ERC1967Proxy proxyRegistryFactory = new ERC1967Proxy(
    //         address(new RegistryFactoryV0_0()),
    //         abi.encodeWithSelector(
    //             RegistryFactoryV0_0.initialize.selector,
    //             address(proxyOwner), // owner
    //             address(protocolFeeReceiver), // gardensFeeReceiver
    //             address(new RegistryCommunityV0_0()), // registryCommunityTemplate
    //             address(new CVStrategyV0_0()), // strategyTemplate
    //             address(new CollateralVault()) // collateralVaultTemplate
    //         )
    //     );

    //     vm.expectRevert();

    //     Upgrades.upgradeProxy(
    //         address(proxyRegistryFactory),
    //         "RegistryFactoryV0_1.sol",
    //         abi.encodeWithSelector(RegistryFactoryV0_1.initializeV2.selector, deployerWallet)
    //     );
    // }

    // function test_Revert_upgradeWithEOANotExpectedOwner() public {
    //     vm.startPrank(deployerWallet);

    //     ERC1967Proxy proxyRegistryFactory = new ERC1967Proxy(
    //         address(new RegistryFactoryV0_0()),
    //         abi.encodeWithSelector(
    //             RegistryFactoryV0_0.initialize.selector,
    //             address(anotherWallet), // owner
    //             address(protocolFeeReceiver), // gardensFeeReceiver
    //             address(new RegistryCommunityV0_0()), // registryCommunityTemplate
    //             address(new CVStrategyV0_0()), // strategyTemplate
    //             address(new CollateralVault()) // collateralVaultTemplate
    //         )
    //     );

    //     vm.expectRevert();

    //     Upgrades.upgradeProxy(
    //         address(proxyRegistryFactory),
    //         "RegistryFactoryV0_1.sol",
    //         abi.encodeWithSelector(RegistryFactoryV0_1.initializeV2.selector, deployerWallet)
    //     );
    // }
}
