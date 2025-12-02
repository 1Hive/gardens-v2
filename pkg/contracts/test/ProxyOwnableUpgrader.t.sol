// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ProxyOwnableUpgraderTest is Test {
    ProxyOwnableUpgrader internal proxy;
    address internal owner = address(0xA11CE);
    address internal stranger = address(0xB0B);

    function setUp() public {
        ProxyOwnableUpgrader impl1 = new ProxyOwnableUpgrader();
        ERC1967Proxy proxyContract =
            new ERC1967Proxy(address(impl1), abi.encodeWithSelector(ProxyOwnableUpgrader.initialize.selector, owner));
        proxy = ProxyOwnableUpgrader(payable(address(proxyContract)));
    }

    function test_authorizeUpgrade_allowsOwner() public {
        ProxyOwnableUpgrader impl2 = new ProxyOwnableUpgrader();

        vm.prank(owner);
        proxy.upgradeTo(address(impl2));
    }

    function test_upgradeTo_revertsForNonOwner() public {
        ProxyOwnableUpgrader impl2 = new ProxyOwnableUpgrader();

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwnableUpgrader.CallerNotOwner.selector, stranger, owner));
        proxy.upgradeTo(address(impl2));
    }
}
