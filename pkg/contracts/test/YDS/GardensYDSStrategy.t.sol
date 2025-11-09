// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {GardensYDSStrategy} from "../../src/yds/GardensYDSStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock DAI", "mDAI") {
        _mint(msg.sender, 1000000e18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Improved Mock ERC-4626 vault with proper accounting
contract MockYieldVault is ERC20 {
    IERC20 public asset;
    uint256 private _totalAssets;  // Track total assets separately for accurate accounting
    
    constructor(IERC20 _asset) ERC20("Mock Vault", "mVault") {
        asset = _asset;
        _totalAssets = 0;
    }
    
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        asset.transferFrom(msg.sender, address(this), assets);
        
        // Calculate shares based on current supply and tracked assets
        uint256 supply = totalSupply();
        shares = (supply == 0) ? assets : (assets * supply) / _totalAssets;
        
        _totalAssets += assets;  // Update tracked assets
        _mint(receiver, shares);
    }
    
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        uint256 supply = totalSupply();
        shares = (supply == 0) ? assets : (assets * supply) / _totalAssets;
        
        _burn(owner, shares);
        _totalAssets -= assets;  // Update tracked assets
        asset.transfer(receiver, assets);
    }
    
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        uint256 supply = totalSupply();
        assets = (supply == 0) ? shares : (shares * _totalAssets) / supply;
        
        _burn(owner, shares);
        _totalAssets -= assets;  // Update tracked assets
        asset.transfer(receiver, assets);
    }
    
    function totalAssets() public view returns (uint256) {
        return _totalAssets;  // Return tracked assets, not balance
    }
    
    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        return (supply == 0) ? assets : (assets * supply) / _totalAssets;
    }
    
    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        return (supply == 0) ? shares : (shares * _totalAssets) / supply;
    }
    
    function balanceOf(address account) public view override returns (uint256) {
        return super.balanceOf(account);
    }
    
    // Simulate yield by increasing tracked assets
    function simulateYield(uint256 amount) external {
        MockERC20(address(asset)).mint(address(this), amount);
        _totalAssets += amount;  // KEY FIX: Update tracked assets
    }
    
    // Simulate loss by decreasing tracked assets
    function simulateLoss(uint256 amount) external {
        require(_totalAssets >= amount, "Insufficient assets for loss");
        _totalAssets -= amount;  // Reduce tracked assets
    }
}

/**
 * @title GardensYDSStrategyTest
 * @notice Unit tests for GardensYDSStrategy following Octant YDS pattern
 */
contract GardensYDSStrategyTest is Test {
    GardensYDSStrategy public yds;
    MockERC20 public dai;
    MockYieldVault public vault;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public donationRecipient = address(0x3);
    address public management = address(0x4);
    address public keeper = address(0x5);
    
    function setUp() public {
        // Deploy mock token
        dai = new MockERC20();
        
        // Deploy mock yield vault
        vault = new MockYieldVault(IERC20(address(dai)));
        
        // Deploy GardensYDSStrategy
        yds = new GardensYDSStrategy(
            IERC20(address(dai)),
            "Gardens YDS - DAI",
            "gYDS-DAI",
            address(vault),
            donationRecipient
        );
        
        // Set management and keeper
        yds.setManagement(management);
        vm.prank(management);
        yds.setKeeper(keeper);
        
        // Setup test users with tokens
        dai.transfer(alice, 10000e18);
        dai.transfer(bob, 10000e18);
        
        // Approve strategy
        vm.prank(alice);
        dai.approve(address(yds), type(uint256).max);
        
        vm.prank(bob);
        dai.approve(address(yds), type(uint256).max);
    }
    
    /*//////////////////////////////////////////////////////////////
                            DEPOSIT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testDepositMintsShares() public {
        uint256 depositAmount = 1000e18;
        
        vm.prank(alice);
        uint256 shares = yds.deposit(depositAmount, alice);
        
        // User receives shares 1:1 initially
        assertEq(shares, depositAmount, "Shares should equal deposit");
        assertEq(yds.balanceOf(alice), depositAmount, "Balance should match shares");
        assertEq(yds.totalSupply(), depositAmount, "Total supply should match");
    }
    
    function testMultipleDeposits() public {
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        vm.prank(bob);
        yds.deposit(2000e18, bob);
        
        assertEq(yds.balanceOf(alice), 1000e18);
        assertEq(yds.balanceOf(bob), 2000e18);
        assertEq(yds.totalSupply(), 3000e18);
    }
    
    function testDepositDeploysFunds() public {
        uint256 depositAmount = 1000e18;
        
        vm.prank(alice);
        yds.deposit(depositAmount, alice);
        
        // Funds should be deployed to yield vault
        assertGt(vault.balanceOf(address(yds)), 0, "YDS should have vault shares");
    }
    
    /*//////////////////////////////////////////////////////////////
                            WITHDRAW TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testWithdraw() public {
        // Setup: Alice deposits
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        uint256 aliceBalanceBefore = dai.balanceOf(alice);
        
        // Alice withdraws half
        vm.prank(alice);
        uint256 withdrawn = yds.withdraw(500e18, alice, alice);
        
        assertEq(withdrawn, 500e18, "Should withdraw 500");
        assertEq(yds.balanceOf(alice), 500e18, "Remaining shares should be 500");
        assertEq(dai.balanceOf(alice) - aliceBalanceBefore, 500e18, "Should receive 500 DAI");
    }
    
    function testRedeemShares() public {
        vm.prank(alice);
        uint256 shares = yds.deposit(1000e18, alice);
        
        vm.prank(alice);
        uint256 assets = yds.redeem(shares / 2, alice, alice);
        
        assertEq(assets, 500e18, "Should redeem 500 assets");
        assertEq(yds.balanceOf(alice), 500e18, "Should have 500 shares left");
    }
    
    /*//////////////////////////////////////////////////////////////
                            REPORTING TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testReportMintsDonationSharesOnProfit() public {
        // Setup: Alice deposits 1000
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        // Simulate yield accrual (10% profit)
        vault.simulateYield(100e18);
        
        // Check donation shares before report
        uint256 donationSharesBefore = yds.balanceOf(donationRecipient);
        assertEq(donationSharesBefore, 0, "No donation shares initially");
        
        // Keeper calls report
        vm.prank(keeper);
        (uint256 profit, uint256 loss) = yds.report();
        
        // Verify profit recorded
        assertEq(profit, 100e18, "Profit should be 100");
        assertEq(loss, 0, "No loss");
        
        // Verify donation shares minted
        uint256 donationSharesAfter = yds.balanceOf(donationRecipient);
        assertGt(donationSharesAfter, 0, "Donation shares should be minted");
        
        // User PPS should remain flat (principal tracking)
        uint256 aliceAssets = yds.convertToAssets(yds.balanceOf(alice));
        assertApproxEqAbs(aliceAssets, 1000e18, 1e15, "Alice assets should be ~1000 (principal)");
        
        // Total assets should include profit
        assertApproxEqAbs(yds.totalAssets(), 1100e18, 1e15, "Total assets should be ~1100");
    }
    
    function testReportBurnsDonationSharesOnLoss() public {
        // Setup: Alice deposits and we generate profit first
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        // Generate profit
        vault.simulateYield(100e18);
        vm.prank(keeper);
        yds.report();
        
        uint256 donationSharesBefore = yds.balanceOf(donationRecipient);
        assertGt(donationSharesBefore, 0, "Should have donation buffer");
        
        // Simulate loss (50 DAI) using new method
        vault.simulateLoss(50e18);
        
        // Report loss
        vm.prank(keeper);
        (uint256 profit, uint256 loss) = yds.report();
        
        assertEq(profit, 0, "No profit");
        assertGt(loss, 0, "Should have loss");
        
        // Donation shares should be burned
        uint256 donationSharesAfter = yds.balanceOf(donationRecipient);
        assertLt(donationSharesAfter, donationSharesBefore, "Donation shares burned");
        
        // Alice's PPS should still be protected (donation buffer absorbed loss)
        uint256 aliceAssets = yds.convertToAssets(yds.balanceOf(alice));
        assertApproxEqAbs(aliceAssets, 1000e18, 1e15, "Alice protected by donation buffer");
    }
    
    function testLargelossSocializesAfterBufferExhausted() public {
        // Setup with small profit buffer
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        vault.simulateYield(50e18); // Only 50 profit
        vm.prank(keeper);
        yds.report();
        
        // Simulate large loss (100 - larger than buffer)
        vault.simulateLoss(100e18);
        
        vm.prank(keeper);
        (uint256 profit, uint256 loss) = yds.report();
        
        // Donation shares should be fully burned
        assertEq(yds.balanceOf(donationRecipient), 0, "Donation buffer exhausted");
        
        // Alice's PPS should drop (loss socialized)
        uint256 aliceAssets = yds.convertToAssets(yds.balanceOf(alice));
        assertLt(aliceAssets, 1000e18, "Alice affected by excess loss");
    }
    
    /*//////////////////////////////////////////////////////////////
                        DONATION RECIPIENT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testProposeDonationRecipient() public {
        address newRecipient = address(0x999);
        
        vm.prank(management);
        yds.proposeDonationRecipient(newRecipient);
        
        assertEq(yds.pendingDonationRecipient(), newRecipient);
        assertEq(yds.donationRecipient(), donationRecipient, "Current recipient unchanged");
    }
    
    function testAcceptDonationRecipient() public {
        address newRecipient = address(0x999);
        
        vm.prank(management);
        yds.proposeDonationRecipient(newRecipient);
        
        vm.prank(newRecipient);
        yds.acceptDonationRecipient();
        
        assertEq(yds.donationRecipient(), newRecipient, "Recipient updated");
        assertEq(yds.pendingDonationRecipient(), address(0), "Pending cleared");
    }
    
    function testOnlyProposedRecipientCanAccept() public {
        address newRecipient = address(0x999);
        
        vm.prank(management);
        yds.proposeDonationRecipient(newRecipient);
        
        // Alice tries to accept (should fail)
        vm.prank(alice);
        vm.expectRevert();
        yds.acceptDonationRecipient();
    }
    
    /*//////////////////////////////////////////////////////////////
                        ROLE MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testSetManagement() public {
        address newManagement = address(0x888);
        
        vm.prank(management);
        yds.setManagement(newManagement);
        
        assertEq(yds.management(), newManagement);
    }
    
    function testOnlyManagementCanSetKeeper() public {
        address newKeeper = address(0x777);
        
        // Alice tries (should fail)
        vm.prank(alice);
        vm.expectRevert();
        yds.setKeeper(newKeeper);
        
        // Management succeeds
        vm.prank(management);
        yds.setKeeper(newKeeper);
        
        assertEq(yds.keeper(), newKeeper);
    }
    
    function testOnlyKeeperCanReport() public {
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        // Alice tries to report (should fail)
        vm.prank(alice);
        vm.expectRevert();
        yds.report();
        
        // Keeper succeeds
        vm.prank(keeper);
        yds.report();
    }
    
    /*//////////////////////////////////////////////////////////////
                        EMERGENCY SHUTDOWN TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testEmergencyShutdown() public {
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        // Management activates shutdown
        vm.prank(management);
        yds.setEmergencyShutdown(true);
        
        assertTrue(yds.emergencyShutdown());
        
        // New deposits should fail
        vm.prank(bob);
        vm.expectRevert();
        yds.deposit(1000e18, bob);
    }
    
    function testEmergencyWithdraw() public {
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        // Funds deployed to vault
        uint256 vaultSharesBefore = vault.balanceOf(address(yds));
        assertGt(vaultSharesBefore, 0);
        
        // Management emergency withdraws
        vm.prank(management);
        yds.emergencyWithdraw();
        
        // Funds should be back to idle
        assertEq(vault.balanceOf(address(yds)), 0, "Vault shares should be 0");
        assertGt(dai.balanceOf(address(yds)), 0, "Should have idle DAI");
    }
    
    /*//////////////////////////////////////////////////////////////
                        YIELD VAULT INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testDeployFundsToVault() public {
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        // Check funds deployed
        uint256 vaultShares = vault.balanceOf(address(yds));
        assertGt(vaultShares, 0, "Should have vault shares");
        
        uint256 vaultAssets = vault.convertToAssets(vaultShares);
        assertApproxEqAbs(vaultAssets, 1000e18, 1e15, "Should have ~1000 in vault");
    }
    
    function testFreeFundsOnWithdraw() public {
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        uint256 vaultSharesBefore = vault.balanceOf(address(yds));
        
        vm.prank(alice);
        yds.withdraw(500e18, alice, alice);
        
        // Vault shares should decrease
        uint256 vaultSharesAfter = vault.balanceOf(address(yds));
        assertLt(vaultSharesAfter, vaultSharesBefore, "Vault shares should decrease");
    }
    
    /*//////////////////////////////////////////////////////////////
                        COMPLEX SCENARIO TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testMultipleReportsWithYieldAccrual() public {
        // Alice deposits 1000
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        // Report 1: Generate 100 yield
        vault.simulateYield(100e18);
        vm.prank(keeper);
        (uint256 profit1,) = yds.report();
        assertEq(profit1, 100e18);
        
        uint256 donationShares1 = yds.balanceOf(donationRecipient);
        
        // Report 2: Generate another 150 yield
        vault.simulateYield(150e18);
        vm.prank(keeper);
        (uint256 profit2,) = yds.report();
        assertEq(profit2, 150e18);
        
        // More donation shares minted
        uint256 donationShares2 = yds.balanceOf(donationRecipient);
        assertGt(donationShares2, donationShares1, "More shares minted");
        
        // Alice's PPS still flat
        assertApproxEqAbs(
            yds.convertToAssets(yds.balanceOf(alice)),
            1000e18,
            1e15,
            "Alice principal preserved"
        );
    }
    
    function testDonationRecipientCanRedeemShares() public {
        // Setup: generate profit and donation shares
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        vault.simulateYield(200e18);
        vm.prank(keeper);
        yds.report();
        
        uint256 donationShares = yds.balanceOf(donationRecipient);
        assertGt(donationShares, 0);
        
        // Donation recipient redeems shares
        uint256 recipientBalanceBefore = dai.balanceOf(donationRecipient);
        
        vm.prank(donationRecipient);
        uint256 assets = yds.redeem(donationShares, donationRecipient, donationRecipient);
        
        assertGt(assets, 0, "Should receive assets");
        assertEq(
            dai.balanceOf(donationRecipient) - recipientBalanceBefore,
            assets,
            "Should receive DAI"
        );
        assertEq(yds.balanceOf(donationRecipient), 0, "Shares burned");
    }
    
    function testPPSCalculations() public {
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        // Initial PPS should be 1:1
        assertEq(yds.convertToAssets(1e18), 1e18, "Initial PPS = 1");
        
        // Generate profit
        vault.simulateYield(100e18);
        vm.prank(keeper);
        yds.report();
        
        // User PPS should still be ~1:1 (profit went to donations)
        assertApproxEqAbs(yds.convertToAssets(1e18), 1e18, 1e15, "PPS stays flat");
        
        // But donation recipient can redeem for more
        uint256 donationShares = yds.balanceOf(donationRecipient);
        if (donationShares > 0) {
            uint256 donationAssets = yds.convertToAssets(donationShares);
            assertGt(donationAssets, 0, "Donation shares have value");
        }
    }
    
    /*//////////////////////////////////////////////////////////////
                        EDGE CASES
    //////////////////////////////////////////////////////////////*/
    
    function testCannotReportDuringShutdown() public {
        vm.prank(alice);
        yds.deposit(1000e18, alice);
        
        vm.prank(management);
        yds.setEmergencyShutdown(true);
        
        vm.prank(keeper);
        vm.expectRevert();
        yds.report();
    }
    
    function testZeroDepositHandled() public {
        vm.prank(alice);
        vm.expectRevert();
        yds.deposit(0, alice);
    }
    
    function testSetYieldVault() public {
        address newVault = address(0x123);
        
        vm.prank(management);
        yds.setYieldVault(newVault, true);
        
        assertEq(address(yds.yieldVault()), newVault);
        assertTrue(yds.useExternalVault());
    }
}




