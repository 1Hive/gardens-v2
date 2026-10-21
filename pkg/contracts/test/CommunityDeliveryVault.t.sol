// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;
import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {CommunityDeliveryVault} from "../src/MarkeeRevenue/CommunityDeliveryVault.sol";

contract DeliveryToken is ERC20 {
    bool public fail;
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setFail(bool value) external {
        fail = value;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        require(!fail, "blocked");
        return super.transfer(to, amount);
    }
}

contract DeliveryCommunity {
    address public councilSafe;

    constructor(address safe) {
        councilSafe = safe;
    }

    function setSafe(address safe) external {
        councilSafe = safe;
    }
}

contract CommunityDeliveryVaultTest is Test {
    DeliveryToken token;
    DeliveryCommunity community;
    CommunityDeliveryVault vault;

    function setUp() public {
        token = new DeliveryToken();
        community = new DeliveryCommunity(address(0xA));
        vault = new CommunityDeliveryVault(address(community), address(token));
    }

    function testPermissionlessDeliveryResolvesRotatedSafe() public {
        token.mint(address(vault), 1 ether);
        community.setSafe(address(0xB));
        vm.prank(address(0xBAD));
        vault.deliver();
        assertEq(token.balanceOf(address(0xA)), 0);
        assertEq(token.balanceOf(address(0xB)), 1 ether);
        assertEq(vault.totalDelivered(), 1 ether);
        assertEq(vault.deliver(), 0);
    }

    function testInvalidSafeRetainsFundsAndCanRetry() public {
        token.mint(address(vault), 1 ether);
        community.setSafe(address(0));
        vm.expectRevert(CommunityDeliveryVault.InvalidConfiguration.selector);
        vault.deliver();
        assertEq(token.balanceOf(address(vault)), 1 ether);
        assertEq(vault.totalDelivered(), 0);
        community.setSafe(address(0xB));
        vault.deliver();
        assertEq(vault.totalDelivered(), 1 ether);
    }

    function testTransferFailureDoesNotAdvanceAccounting() public {
        token.mint(address(vault), 1 ether);
        token.setFail(true);
        vm.expectRevert("blocked");
        vault.deliver();
        assertEq(token.balanceOf(address(vault)), 1 ether);
        assertEq(vault.totalDelivered(), 0);
        token.setFail(false);
        vault.deliver();
        assertEq(vault.totalDelivered(), 1 ether);
    }

    function testCannotDeliverToSelf() public {
        token.mint(address(vault), 1 ether);
        community.setSafe(address(vault));
        vm.expectRevert(CommunityDeliveryVault.InvalidConfiguration.selector);
        vault.deliver();
    }

    function testFuzzCumulativeDelivery(uint96 first, uint96 second) public {
        token.mint(address(vault), first);
        vault.deliver();
        token.mint(address(vault), second);
        vault.deliver();
        assertEq(vault.totalDelivered(), uint256(first) + second);
    }

    function testCommunitiesHaveSeparateBalancesAndRecipients() public {
        DeliveryCommunity other = new DeliveryCommunity(address(0xB));
        CommunityDeliveryVault otherVault = new CommunityDeliveryVault(address(other), address(token));
        token.mint(address(vault), 1 ether);
        token.mint(address(otherVault), 2 ether);
        vault.deliver();
        assertEq(token.balanceOf(address(otherVault)), 2 ether);
        otherVault.deliver();
        assertEq(token.balanceOf(address(0xB)), 2 ether);
    }
}
