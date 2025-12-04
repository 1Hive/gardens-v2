// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {GV2ERC20} from "../script/GV2ERC20.sol";

contract GV2ERC20Test is Test {
    GV2ERC20 internal token;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        token = new GV2ERC20("Mock Token", "MTK", 18);
    }

    function test_Metadata() public {
        assertEq(token.name(), "Mock Token");
        assertEq(token.symbol(), "MTK");
        assertEq(token.decimals(), 18);
    }

    function test_MintIncreasesBalanceAndSupply() public {
        uint256 amount = 1e18;
        token.mint(alice, amount);

        assertEq(token.totalSupply(), amount);
        assertEq(token.balanceOf(alice), amount);
    }

    function test_BurnDecreasesBalanceAndSupply() public {
        uint256 amount = 5e18;
        token.mint(alice, amount);

        vm.prank(alice);
        token.burn(alice, 2e18);

        assertEq(token.totalSupply(), 3e18);
        assertEq(token.balanceOf(alice), 3e18);
    }

    function test_TransferUsesBrutalizedAddress() public {
        token.mint(alice, 1e18);

        vm.prank(alice);
        bool ok = token.transfer(bob, 5e17);

        assertTrue(ok);
        assertEq(token.balanceOf(alice), 5e17);
        assertEq(token.balanceOf(bob), 5e17);
    }

    function test_TransferFromRespectsAllowance() public {
        token.mint(alice, 1e18);

        vm.prank(alice);
        token.approve(address(this), 4e17);

        bool ok = token.transferFrom(alice, bob, 4e17);

        assertTrue(ok);
        assertEq(token.allowance(alice, address(this)), 0);
        assertEq(token.balanceOf(alice), 6e17);
        assertEq(token.balanceOf(bob), 4e17);
    }

    function test_IncreaseDecreaseAllowance() public {
        vm.prank(alice);
        token.increaseAllowance(bob, 1e18);
        assertEq(token.allowance(alice, bob), 1e18);

        vm.prank(alice);
        token.decreaseAllowance(bob, 4e17);
        assertEq(token.allowance(alice, bob), 6e17);
    }

    function test_DirectTransfer() public {
        token.mint(alice, 1e18);
        token.directTransfer(alice, bob, 3e17);

        assertEq(token.balanceOf(alice), 7e17);
        assertEq(token.balanceOf(bob), 3e17);
    }

    function test_DirectSpendAllowance() public {
        token.mint(alice, 1e18);
        vm.prank(alice);
        token.approve(bob, 8e17);

        token.directSpendAllowance(alice, bob, 5e17);
        assertEq(token.allowance(alice, bob), 3e17);
    }
}
