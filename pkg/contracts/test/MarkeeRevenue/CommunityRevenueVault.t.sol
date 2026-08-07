// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import {CommunityRevenueVault} from "../../src/MarkeeRevenue/CommunityRevenueVault.sol";
import {ICommunityRevenueVault} from "../../src/MarkeeRevenue/interfaces/ICommunityRevenueVault.sol";
import {CommunityKeyLib} from "../../src/MarkeeRevenue/libraries/CommunityKeyLib.sol";
import {MockETHx} from "./mocks/MockETHx.sol";
import {MockWETH9} from "./mocks/MockWETH9.sol";

contract RejectingReceiver {
    // No receive/fallback: any plain ETH transfer to this contract reverts.

    }

contract ReentrantRouter {
    CommunityRevenueVault internal vault;
    bool internal shouldReenter;

    constructor(CommunityRevenueVault _vault) {
        vault = _vault;
    }

    function attemptReenter() external {
        shouldReenter = true;
    }

    function release(address payable to) external {
        vault.releaseRevenue(to);
    }

    receive() external payable {
        if (shouldReenter) {
            shouldReenter = false;
            vault.releaseRevenue(payable(address(this)));
        }
    }
}

contract CommunityRevenueVaultTest is Test {
    CommunityRevenueVault internal implementation;
    CommunityRevenueVault internal vault;
    MockETHx internal ethx;
    MockWETH9 internal weth;

    address internal router = address(0x40DE7);
    address internal registryCommunity = address(0xC0113C7);
    uint256 internal constant COMMUNITY_CHAIN_ID = 8453;
    bytes32 internal communityKey;

    function setUp() public {
        ethx = new MockETHx();
        weth = new MockWETH9();
        communityKey = CommunityKeyLib.communityKey(COMMUNITY_CHAIN_ID, registryCommunity);

        implementation = new CommunityRevenueVault();
        address clone = Clones.cloneDeterministic(address(implementation), communityKey);
        vault = CommunityRevenueVault(payable(clone));

        vm.prank(router);
        vault.initialize(communityKey, COMMUNITY_CHAIN_ID, registryCommunity, address(ethx), address(weth));
    }

    function test_deterministicAddress_matchesPrediction() public {
        address predicted = Clones.predictDeterministicAddress(address(implementation), communityKey, address(this));
        assertEq(address(vault), predicted);
    }

    function test_initialize_setsState() public {
        assertEq(vault.router(), router);
        assertEq(vault.communityKey(), communityKey);
        assertEq(vault.communityChainId(), COMMUNITY_CHAIN_ID);
        assertEq(vault.registryCommunity(), registryCommunity);
        assertEq(address(vault.ethx()), address(ethx));
        assertEq(address(vault.weth()), address(weth));
    }

    function test_initialize_revertsIfAlreadyInitialized() public {
        vm.prank(router);
        vm.expectRevert(ICommunityRevenueVault.AlreadyInitialized.selector);
        vault.initialize(communityKey, COMMUNITY_CHAIN_ID, registryCommunity, address(ethx), address(weth));
    }

    function test_initialize_revertsOnZeroAddresses() public {
        address freshClone = Clones.clone(address(implementation));
        CommunityRevenueVault fresh = CommunityRevenueVault(payable(freshClone));

        vm.expectRevert(ICommunityRevenueVault.ZeroAddress.selector);
        fresh.initialize(communityKey, COMMUNITY_CHAIN_ID, address(0), address(ethx), address(weth));
    }

    function test_availableRevenue_combinesAllThreeForms() public {
        vm.deal(address(vault), 1 ether);
        _fundEthx(address(vault), 2 ether);
        _fundWeth(address(vault), 3 ether);

        (uint256 nativeETH, uint256 ethxBalance, uint256 wethBalance, uint256 combinedETH) = vault.availableRevenue();

        assertEq(nativeETH, 1 ether);
        assertEq(ethxBalance, 2 ether);
        assertEq(wethBalance, 3 ether);
        assertEq(combinedETH, 6 ether);
    }

    function test_releaseRevenue_normalizesAndSendsFullBalance() public {
        vm.deal(address(vault), 1 ether);
        _fundEthx(address(vault), 2 ether);
        _fundWeth(address(vault), 3 ether);

        address payable to = payable(address(0xBEEF));

        vm.prank(router);
        uint256 released = vault.releaseRevenue(to);

        assertEq(released, 6 ether);
        assertEq(to.balance, 6 ether);
        assertEq(address(vault).balance, 0);
        assertEq(ethx.balanceOf(address(vault)), 0);
        assertEq(weth.balanceOf(address(vault)), 0);
        assertEq(ethx.downgradeToETHCalls(), 1);
    }

    function test_releaseRevenue_revertsForNonRouter() public {
        vm.expectRevert(ICommunityRevenueVault.NotRouter.selector);
        vault.releaseRevenue(payable(address(0xBEEF)));
    }

    function test_releaseRevenue_revertsOnZeroRecipient() public {
        vm.prank(router);
        vm.expectRevert(ICommunityRevenueVault.ZeroAddress.selector);
        vault.releaseRevenue(payable(address(0)));
    }

    function test_releaseRevenue_revertsOnTransferFailure() public {
        vm.deal(address(vault), 1 ether);
        RejectingReceiver bad = new RejectingReceiver();

        vm.prank(router);
        vm.expectRevert(ICommunityRevenueVault.TransferFailed.selector);
        vault.releaseRevenue(payable(address(bad)));
    }

    function test_reentrancyGuard_blocksRecursiveRelease() public {
        address reentrantClone = Clones.clone(address(implementation));
        CommunityRevenueVault reentrantVault = CommunityRevenueVault(payable(reentrantClone));
        ReentrantRouter reentrant = new ReentrantRouter(reentrantVault);

        vm.prank(address(reentrant));
        reentrantVault.initialize(communityKey, COMMUNITY_CHAIN_ID, registryCommunity, address(ethx), address(weth));

        vm.deal(address(reentrantVault), 1 ether);
        reentrant.attemptReenter();

        // The inner reentrant call reverts (blocked by nonReentrant), which
        // bubbles up as a failed native transfer to the outer release call.
        vm.expectRevert(ICommunityRevenueVault.TransferFailed.selector);
        reentrant.release(payable(address(reentrant)));
    }

    function _fundEthx(address to, uint256 amount) internal {
        ethx.mint{value: amount}(to, amount);
    }

    function _fundWeth(address to, uint256 amount) internal {
        weth.mint{value: amount}(to);
    }
}
