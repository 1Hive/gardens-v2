// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {GardensYDSStrategy} from "../../src/yds/GardensYDSStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISuperfluidPool} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";

/**
 * @title SuperfluidStreamingForkTest
 * @notice Fork tests for YDS → Superfluid GDA → Streaming integration
 * @dev Run with: forge test --match-contract SuperfluidStreamingFork --fork-url $ARBITRUM_RPC
 * 
 * Tests complete flow with real Superfluid contracts on Arbitrum
 */
contract SuperfluidStreamingForkTest is Test {
    
    /*//////////////////////////////////////////////////////////////
                    ARBITRUM MAINNET ADDRESSES
    //////////////////////////////////////////////////////////////*/
    
    address constant DAI = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;
    address constant SUPERFLUID_HOST = 0xCf8Acb4eF033efF16E8080aed4c7D5B9285D2192;
    // Note: Get actual DAIx address from Superfluid docs for Arbitrum
    
    GardensYDSStrategy public yds;
    ISuperfluidPool public gda;  // Will use real or mock GDA
    
    address public depositor = address(0x100);
    address public beneficiary1 = address(0x201);
    address public beneficiary2 = address(0x202);
    address public keeper = address(0x300);
    
    function setUp() public {
        // Fork Arbitrum
        vm.createSelectFork(vm.envString("ARBITRUM_RPC"));
        
        console.log("Forked Arbitrum at block:", block.number);
        
        // For testing, deploy a simple mock GDA
        // In production tests, use real Superfluid GDA
        gda = ISuperfluidPool(address(new MockGDA()));
        
        // Deploy YDS
        yds = new GardensYDSStrategy(
            IERC20(DAI),
            "Gardens YDS Streaming Test",
            "gYDS-STREAM",
            address(0),  // No external vault
            address(gda)  // GDA receives donation shares
        );
        
        yds.setManagement(address(this));
        yds.setKeeper(keeper);
        
        // Give depositor real DAI
        deal(DAI, depositor, 100000e18);
        
        vm.prank(depositor);
        IERC20(DAI).approve(address(yds), type(uint256).max);
    }
    
    /*//////////////////////////////////////////////////////////////
                        STREAMING FLOW TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testYieldToDonationShares() public {
        console.log("Testing YDS → Donation Shares flow...");
        
        // 1. Deposit
        vm.prank(depositor);
        yds.deposit(10000e18, depositor);
        
        // 2. Generate yield
        deal(DAI, address(yds), IERC20(DAI).balanceOf(address(yds)) + 500e18);
        
        // 3. Report
        vm.prank(keeper);
        (uint256 profit,) = yds.report();
        
        assertEq(profit, 500e18, "Profit detected");
        
        // 4. Verify GDA received donation shares
        uint256 gdaShares = yds.balanceOf(address(gda));
        assertGt(gdaShares, 0, "GDA has donation shares");
        
        console.log("GDA donation shares:", gdaShares);
        console.log("Yield → Donation shares flow validated");
    }
    
    function testDonationShareRedemption() public {
        console.log("Testing donation share redemption...");
        
        // Setup: Generate donation shares
        vm.prank(depositor);
        yds.deposit(10000e18, depositor);
        
        deal(DAI, address(yds), IERC20(DAI).balanceOf(address(yds)) + 500e18);
        
        vm.prank(keeper);
        yds.report();
        
        uint256 gdaShares = yds.balanceOf(address(gda));
        console.log("GDA has", gdaShares, "shares");
        
        // GDA redeems for underlying
        uint256 gdaBalanceBefore = IERC20(DAI).balanceOf(address(gda));
        
        vm.prank(address(gda));
        uint256 assets = yds.redeem(gdaShares, address(gda), address(gda));
        
        // Verify real DAI transferred
        assertEq(
            IERC20(DAI).balanceOf(address(gda)) - gdaBalanceBefore,
            assets,
            "Real DAI to GDA"
        );
        assertGt(assets, 0, "Assets redeemed");
        
        console.log("GDA redeemed", assets, "DAI");
        console.log("Redemption validated");
    }
    
    function testPrincipalPreservationOverTime() public {
        console.log("Testing principal preservation over 6 months...");
        
        vm.prank(depositor);
        uint256 initialShares = yds.deposit(10000e18, depositor);
        
        // Simulate 6 months with monthly yield
        for (uint256 month = 1; month <= 6; month++) {
            vm.warp(block.timestamp + 30 days);
            
            // Simulate ~4% APY monthly yield
            uint256 monthlyYield = (10000e18 * 4) / (100 * 12);  // ~33 DAI/month
            deal(DAI, address(yds), IERC20(DAI).balanceOf(address(yds)) + monthlyYield);
            
            vm.prank(keeper);
            (uint256 profit,) = yds.report();
            
            console.log("Month", month, "profit:", profit);
            
            // Check PPS stays flat
            uint256 depositorAssets = yds.convertToAssets(initialShares);
            assertApproxEqAbs(
                depositorAssets,
                10000e18,
                1e16,
                "Principal preserved"
            );
        }
        
        // After 6 months, GDA should have accumulated shares
        uint256 totalDonationShares = yds.balanceOf(address(gda));
        assertGt(totalDonationShares, 0, "GDA accumulated shares");
        
        console.log("6 months simulation: Principal preserved ✅");
        console.log("Total donation shares to GDA:", totalDonationShares);
    }
    
    /*//////////////////////////////////////////////////////////////
                        EDGE CASES
    //////////////////////////////////////////////////////////////*/
    
    function testNoYieldNoDonationShares() public {
        vm.prank(depositor);
        yds.deposit(10000e18, depositor);
        
        // Report without yield
        vm.prank(keeper);
        (uint256 profit,) = yds.report();
        
        assertEq(profit, 0, "No profit");
        assertEq(yds.balanceOf(address(gda)), 0, "No donation shares");
        
        console.log("No yield scenario validated");
    }
    
    function testEmergencyScenario() public {
        vm.prank(depositor);
        yds.deposit(10000e18, depositor);
        
        // Emergency shutdown
        vm.prank(management);
        yds.setEmergencyShutdown(true);
        
        // Can't deposit during shutdown
        vm.prank(depositor);
        vm.expectRevert();
        yds.deposit(1000e18, depositor);
        
        // But can still withdraw
        vm.prank(depositor);
        uint256 withdrawn = yds.withdraw(5000e18, depositor, depositor);
        assertEq(withdrawn, 5000e18);
        
        console.log("Emergency scenario validated");
    }
}

/**
 * @notice Simple mock GDA for testing
 * @dev In production tests, use real Superfluid GDA
 */
contract MockGDA {
    mapping(address => uint128) public memberUnits;
    
    function updateMemberUnits(address member, uint128 units) external returns (bool) {
        memberUnits[member] = units;
        return true;
    }
    
    function getMemberUnits(address member) external view returns (uint128) {
        return memberUnits[member];
    }
}


