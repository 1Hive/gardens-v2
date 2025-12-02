// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";

contract ProxyOwnerTest is Test {
    address deployerWallet = makeAddr("deployerWallet");
    address anotherWallet = makeAddr("anotherWallet");
    address protocolFeeReceiver = makeAddr("multisigReceiver");

    function setUp() public {
        // Skip until full build-info is available for OZ upgrade validation during coverage
        vm.skip(true);
    }

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
            address(new RegistryFactory()),
            abi.encodeWithSelector(
                RegistryFactory.initialize.selector,
                address(proxyOwner), // owner
                address(protocolFeeReceiver), // gardensFeeReceiver
                address(new RegistryCommunity()), // registryCommunityTemplate
                address(new CVStrategy()), // strategyTemplate
                address(new CollateralVault()) // collateralVaultTemplate
            )
        );

        Upgrades.upgradeProxy(
            address(proxyRegistryFactory),
            "RegistryFactory.sol",
            abi.encodeWithSelector(RegistryFactory.initialize.selector, deployerWallet, protocolFeeReceiver, address(new RegistryCommunity()), address(new CVStrategy()), address(new CollateralVault()))
        );
    }

    function test_upgradeWithEOAOwner() public {
        vm.startPrank(deployerWallet);

        ERC1967Proxy proxyRegistryFactory = new ERC1967Proxy(
            address(new RegistryFactory()),
            abi.encodeWithSelector(
                RegistryFactory.initialize.selector,
                address(deployerWallet), // owner
                address(protocolFeeReceiver), // gardensFeeReceiver
                address(new RegistryCommunity()), // registryCommunityTemplate
                address(new CVStrategy()), // strategyTemplate
                address(new CollateralVault()) // collateralVaultTemplate
            )
        );

        Upgrades.upgradeProxy(
            address(proxyRegistryFactory),
            "RegistryFactory.sol",
            abi.encodeWithSelector(RegistryFactory.initialize.selector, deployerWallet, protocolFeeReceiver, address(new RegistryCommunity()), address(new CVStrategy()), address(new CollateralVault()))
        );
    }

    function test_Revert_transferProxyAdminOwnershipNotExpectedOwner() public {
        vm.startPrank(deployerWallet);

        ProxyOwner proxyOwner = ProxyOwner(
            address(
                new ERC1967Proxy(
                    address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, deployerWallet)
                )
            )
        );

        ERC1967Proxy proxyRegistryFactory = new ERC1967Proxy(
            address(new RegistryFactory()),
            abi.encodeWithSelector(
                RegistryFactory.initialize.selector,
                address(proxyOwner), // owner
                address(protocolFeeReceiver), // gardensFeeReceiver
                address(new RegistryCommunity()), // registryCommunityTemplate
                address(new CVStrategy()), // strategyTemplate
                address(new CollateralVault()) // collateralVaultTemplate
            )
        );

        vm.expectRevert();

        Upgrades.upgradeProxy(
            address(proxyRegistryFactory),
            "RegistryFactory.sol",
            abi.encodeWithSelector(RegistryFactory.initialize.selector, deployerWallet, protocolFeeReceiver, address(new RegistryCommunity()), address(new CVStrategy()), address(new CollateralVault()))
        );
    }

    function test_Revert_upgradeWithEOANotExpectedOwner() public {
        vm.startPrank(deployerWallet);

        ERC1967Proxy proxyRegistryFactory = new ERC1967Proxy(
            address(new RegistryFactory()),
            abi.encodeWithSelector(
                RegistryFactory.initialize.selector,
                address(anotherWallet), // owner
                address(protocolFeeReceiver), // gardensFeeReceiver
                address(new RegistryCommunity()), // registryCommunityTemplate
                address(new CVStrategy()), // strategyTemplate
                address(new CollateralVault()) // collateralVaultTemplate
            )
        );

        vm.expectRevert();

        Upgrades.upgradeProxy(
            address(proxyRegistryFactory),
            "RegistryFactory.sol",
            abi.encodeWithSelector(RegistryFactory.initialize.selector, anotherWallet, protocolFeeReceiver, address(new RegistryCommunity()), address(new CVStrategy()), address(new CollateralVault()))
        );
    }
}
