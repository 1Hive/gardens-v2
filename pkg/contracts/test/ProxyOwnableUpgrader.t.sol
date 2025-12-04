// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract GoodOwner {
    address public ownerAddr;

    constructor(address _owner) {
        ownerAddr = _owner;
    }

    function owner() external view returns (address) {
        return ownerAddr;
    }
}

contract RevertingOwner {
    function owner() external pure returns (address) {
        revert("bad owner");
    }
}

contract ProxyOwnableUpgraderTest is Test {
    ProxyOwnableUpgrader internal proxy;
    address internal owner = address(0xA11CE);
    address internal stranger = address(0xB0B);
    address internal nestedOwner = address(0xCAFE);

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

    function test_owner_returnsNestedOwnerWhenOwnerIsContract() public {
        GoodOwner goodOwner = new GoodOwner(nestedOwner);

        vm.prank(owner);
        proxy.transferOwnership(address(goodOwner));

        assertEq(proxy.owner(), nestedOwner);
    }

    function test_owner_fallsBackWhenNestedOwnerReverts() public {
        RevertingOwner revertingOwner = new RevertingOwner();

        vm.prank(owner);
        proxy.transferOwnership(address(revertingOwner));

        assertEq(proxy.owner(), address(revertingOwner));
    }
}
