// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";

contract ProxyOwnerTest is Test {
    address deployerWallet = makeAddr("deployerWallet");
    address anotherWallet = makeAddr("anotherWallet");
    address protocolFeeReceiver = makeAddr("multisigReceiver");

    function _deployProxyOwner() internal returns (ProxyOwner) {
        return ProxyOwner(
            address(
                new ERC1967Proxy(
                    address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, deployerWallet)
                )
            )
        );
    }

    function _deployRegistryFactory(address ownerAddr) internal returns (RegistryFactory) {
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new RegistryFactory()),
            abi.encodeWithSelector(
                RegistryFactory.initialize.selector,
                ownerAddr, // owner
                address(protocolFeeReceiver), // gardensFeeReceiver
                address(new RegistryCommunity()), // registryCommunityTemplate
                address(new CVStrategy()), // strategyTemplate
                address(new CollateralVault()) // collateralVaultTemplate
            )
        );
        return RegistryFactory(payable(address(proxy)));
    }

    function test_upgradeWithProxyOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        RegistryFactory factory = _deployRegistryFactory(address(proxyOwner));
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        factory.upgradeTo(address(newImpl));
    }

    function test_upgradeWithEOAOwner() public {
        RegistryFactory factory = _deployRegistryFactory(deployerWallet);
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        factory.upgradeTo(address(newImpl));
    }

    function test_Revert_upgradeWithProxyOwnerNotAuthorized() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        RegistryFactory factory = _deployRegistryFactory(address(proxyOwner));
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(anotherWallet);
        vm.expectRevert(
            abi.encodeWithSelector(ProxyOwnableUpgrader.CallerNotOwner.selector, anotherWallet, deployerWallet)
        );
        factory.upgradeTo(address(newImpl));
    }

    function test_Revert_upgradeWithEOANotExpectedOwner() public {
        RegistryFactory factory = _deployRegistryFactory(anotherWallet);
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        vm.expectRevert(
            abi.encodeWithSelector(ProxyOwnableUpgrader.CallerNotOwner.selector, deployerWallet, anotherWallet)
        );
        factory.upgradeTo(address(newImpl));
    }
}
