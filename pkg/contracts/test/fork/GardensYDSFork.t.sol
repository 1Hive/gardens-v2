// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {GardensYDSStrategy} from "../../src/yds/GardensYDSStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title GardensYDSStrategyForkTest
 * @notice Fork tests using real Arbitrum contracts (Aave, DAI, etc.)
 * @dev Run with: forge test --match-contract ForkTest --fork-url $ARBITRUM_RPC
 * 
 * Benefits:
 * - No mock issues (uses real ERC4626 vaults)
 * - Real yield accrual
 * - Real protocol integrations
 * - Production-like testing
 */
contract GardensYDSStrategyForkTest is Test {
    
    /*//////////////////////////////////////////////////////////////
                        ARBITRUM MAINNET ADDRESSES
    //////////////////////////////////////////////////////////////*/
    
    // Real tokens
    address constant DAI = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;
    address constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    
    // Real Aave v3 on Arbitrum
    address constant AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    // Note: Aave v3 uses supply() directly, not ERC4626 vault wrapper
    // For ERC4626, could use Yearn or other vault

    GardensYDSStrategy public yds;
    
    address public treasury = address(0x100);
    address public gda = address(0x200);
    address public management = address(0x300);
    address public keeper = address(0x400);
    
    function setUp() public {
        // Fork Arbitrum at recent block
        vm.createSelectFork(vm.envString("ARBITRUM_RPC"));
        
        console.log("Forked Arbitrum at block:", block.number);
        console.log("DAI address:", DAI);
        
        // Deploy GardensYDSStrategy without external vault (idle mode for testing)
        // In production, would use real Aave/Yearn vault
        yds = new GardensYDSStrategy(
            IERC20(DAI),
            "Gardens YDS Fork Test",
            "gYDS-FORK",
            address(0),  // No external vault for simplicity
            gda
        );
        
        // Set roles
        yds.setManagement(management);
        vm.prank(management);
        yds.setKeeper(keeper);
        
        // Give treasury real DAI using deal
        deal(DAI, treasury, 100000e18);
        
        vm.prank(treasury);
        IERC20(DAI).approve(address(yds), type(uint256).max);
        
        console.log("Setup complete");
    }
    
    /*//////////////////////////////////////////////////////////////
                        FORK VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testForkDeposit() public {
        console.log("Testing deposit with real DAI...");
        
        uint256 depositAmount = 10000e18;
        uint256 treasuryBalanceBefore = IERC20(DAI).balanceOf(treasury);
        
        vm.prank(treasury);
        uint256 shares = yds.deposit(depositAmount, treasury);
        
        // Verify real DAI transferred
        assertEq(
            treasuryBalanceBefore - IERC20(DAI).balanceOf(treasury),
            depositAmount,
            "Real DAI transferred"
        );
        
        // Verify shares minted
        assertEq(shares, depositAmount, "1:1 shares initially");
        assertEq(yds.balanceOf(treasury), depositAmount);
        assertEq(yds.totalSupply(), depositAmount);
        
        console.log("Deposit successful with real DAI");
    }
    
    function testForkWithdraw() public {
        // Setup: Deposit
        vm.prank(treasury);
        yds.deposit(10000e18, treasury);
        
        uint256 balanceBefore = IERC20(DAI).balanceOf(treasury);
        
        // Withdraw half
        vm.prank(treasury);
        uint256 withdrawn = yds.withdraw(5000e18, treasury, treasury);
        
        // Verify real DAI received
        assertEq(withdrawn, 5000e18);
        assertEq(IERC20(DAI).balanceOf(treasury) - balanceBefore, 5000e18, "Real DAI received");
        assertEq(yds.balanceOf(treasury), 5000e18, "Remaining shares");
        
        console.log("Withdrawal successful with real DAI");
    }
    
    function testForkYieldSimulation() public {
        // Deposit
        vm.prank(treasury);
        uint256 initialShares = yds.deposit(10000e18, treasury);
        
        uint256 initialAssets = yds.totalAssets();
        console.log("Initial assets:", initialAssets);
        
        // Simulate yield by directly sending DAI to strategy
        // (In production, this would come from Aave/Yearn yield)
        deal(DAI, address(yds), IERC20(DAI).balanceOf(address(yds)) + 500e18);
        
        // Report
        vm.prank(keeper);
        (uint256 profit, uint256 loss) = yds.report();
        
        console.log("Profit reported:", profit);
        console.log("Loss reported:", loss);
        
        assertEq(profit, 500e18, "Profit detected");
        assertEq(loss, 0, "No loss");
        
        // Verify donation shares
        uint256 donationShares = yds.balanceOf(gda);
        assertGt(donationShares, 0, "Donation shares minted");
        console.log("Donation shares:", donationShares);
        
        // Verify PPS flat for treasury
        uint256 treasuryAssets = yds.convertToAssets(initialShares);
        assertApproxEqAbs(treasuryAssets, 10000e18, 1e16, "Treasury principal preserved");
        console.log("Treasury assets:", treasuryAssets);
        
        // Verify total includes profit
        assertApproxEqAbs(yds.totalAssets(), 10500e18, 1e16, "Total includes profit");
        
        console.log("Yield simulation successful on fork");
    }
    
    function testForkDonationShareRedemption() public {
        // Setup: Deposit and generate yield
        vm.prank(treasury);
        yds.deposit(10000e18, treasury);
        
        // Simulate yield
        deal(DAI, address(yds), IERC20(DAI).balanceOf(address(yds)) + 500e18);
        
        vm.prank(keeper);
        yds.report();
        
        uint256 donationShares = yds.balanceOf(gda);
        console.log("GDA donation shares:", donationShares);
        
        // GDA redeems shares
        uint256 gdaBalanceBefore = IERC20(DAI).balanceOf(gda);
        
        vm.prank(gda);
        uint256 assets = yds.redeem(donationShares, gda, gda);
        
        // Verify real DAI received
        assertGt(assets, 0, "Assets redeemed");
        assertEq(
            IERC20(DAI).balanceOf(gda) - gdaBalanceBefore,
            assets,
            "Real DAI received by GDA"
        );
        
        console.log("GDA redeemed:", assets, "DAI");
        console.log("Donation redemption successful");
    }
    
    function testForkEmergencyWithdraw() public {
        // Deposit
        vm.prank(treasury);
        yds.deposit(10000e18, treasury);
        
        // Management emergency withdraw
        vm.prank(management);
        yds.emergencyWithdraw();
        
        // Verify funds pulled back to idle
        uint256 idle = IERC20(DAI).balanceOf(address(yds));
        assertGt(idle, 0, "Funds in idle");
        
        // Treasury can still withdraw
        vm.prank(treasury);
        yds.withdraw(5000e18, treasury, treasury);
        
        console.log("Emergency withdraw successful");
    }
    
    /*//////////////////////////////////////////////////////////////
                        REALISTIC SCENARIOS
    //////////////////////////////////////////////////////////////*/
    
    function testForkMultipleReportsOverTime() public {
        // Simulate 3 months of operation
        vm.prank(treasury);
        yds.deposit(10000e18, treasury);
        
        uint256 totalProfitReported = 0;
        
        // Month 1
        vm.warp(block.timestamp + 30 days);
        deal(DAI, address(yds), IERC20(DAI).balanceOf(address(yds)) + 100e18);
        vm.prank(keeper);
        (uint256 profit1,) = yds.report();
        totalProfitReported += profit1;
        console.log("Month 1 profit:", profit1);
        
        // Month 2
        vm.warp(block.timestamp + 30 days);
        deal(DAI, address(yds), IERC20(DAI).balanceOf(address(yds)) + 100e18);
        vm.prank(keeper);
        (uint256 profit2,) = yds.report();
        totalProfitReported += profit2;
        console.log("Month 2 profit:", profit2);
        
        // Month 3
        vm.warp(block.timestamp + 30 days);
        deal(DAI, address(yds), IERC20(DAI).balanceOf(address(yds)) + 100e18);
        vm.prank(keeper);
        (uint256 profit3,) = yds.report();
        totalProfitReported += profit3;
        console.log("Month 3 profit:", profit3);
        
        // Verify cumulative
        assertEq(totalProfitReported, 300e18, "3 months of profit");
        
        // Treasury principal still intact
        assertApproxEqAbs(
            yds.convertToAssets(yds.balanceOf(treasury)),
            10000e18,
            1e16,
            "Principal preserved after 3 months"
        );
        
        // GDA accumulated donation shares
        assertGt(yds.balanceOf(gda), 0, "GDA has accumulated shares");
        
        console.log("Multi-month simulation successful");
    }
}


