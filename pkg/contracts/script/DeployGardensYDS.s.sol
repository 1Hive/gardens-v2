// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {GardensYDSStrategy} from "../src/yds/GardensYDSStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";

/**
 * @title DeployGardensYDS
 * @notice Deployment script for GardensYDSStrategy
 * @dev Deploys Octant-compliant YDS strategy for Gardens conviction voting pools
 */
contract DeployGardensYDS is Script {
    
    // Environment variables (set in .env or via command line)
    // ASSET_ADDRESS - underlying asset (e.g., DAI, USDC)
    // YIELD_VAULT_ADDRESS - optional external yield vault (CVVault, Yearn, Aave)
    // DONATION_RECIPIENT - where donation shares go (e.g., CVStrategy or Superfluid GDA)
    // COUNCIL_SAFE - community multisig for management
    // KEEPER_ADDRESS - automated keeper for report() calls
    
    struct DeploymentParams {
        address asset;
        string name;
        string symbol;
        address yieldVault;
        address donationRecipient;
        address councilSafe;
        address keeper;
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Load deployment parameters
        DeploymentParams memory params = DeploymentParams({
            asset: vm.envAddress("ASSET_ADDRESS"),
            name: vm.envOr("STRATEGY_NAME", string("Gardens YDS - DAI")),
            symbol: vm.envOr("STRATEGY_SYMBOL", string("gYDS-DAI")),
            yieldVault: vm.envOr("YIELD_VAULT_ADDRESS", address(0)),
            donationRecipient: vm.envAddress("DONATION_RECIPIENT"),
            councilSafe: vm.envAddress("COUNCIL_SAFE"),
            keeper: vm.envOr("KEEPER_ADDRESS", vm.addr(deployerPrivateKey))
        });
        
        console.log("Deploying GardensYDSStrategy with parameters:");
        console.log("  Asset:", params.asset);
        console.log("  Name:", params.name);
        console.log("  Symbol:", params.symbol);
        console.log("  Yield Vault:", params.yieldVault);
        console.log("  Donation Recipient:", params.donationRecipient);
        console.log("  Council Safe:", params.councilSafe);
        console.log("  Keeper:", params.keeper);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy YDS strategy
        GardensYDSStrategy yds = new GardensYDSStrategy(
            IERC20(params.asset),
            params.name,
            params.symbol,
            params.yieldVault,
            params.donationRecipient
        );
        
        console.log("GardensYDSStrategy deployed at:", address(yds));
        
        // Set management to council safe
        if (params.councilSafe != address(0)) {
            yds.setManagement(params.councilSafe);
            console.log("Management set to:", params.councilSafe);
        }
        
        // Set keeper
        if (params.keeper != address(0)) {
            yds.setKeeper(params.keeper);
            console.log("Keeper set to:", params.keeper);
        }
        
        vm.stopBroadcast();
        
        // Verification info
        console.log("\n=== Deployment Summary ===");
        console.log("GardensYDSStrategy:", address(yds));
        console.log("Donation Recipient:", yds.donationRecipient());
        console.log("Management:", yds.management());
        console.log("Keeper:", yds.keeper());
        console.log("\n=== Next Steps ===");
        console.log("1. Register YDS strategy in CVStrategy:");
        console.log("   cvStrategy.setYDSStrategy(", address(yds), ")");
        console.log("2. Deposit funds into strategy for yield generation");
        console.log("3. Configure keeper automation for report() calls");
    }
    
    /**
     * @notice Deploy with custom parameters (for testing)
     */
    function deployWithParams(
        address asset,
        string memory name,
        string memory symbol,
        address yieldVault,
        address donationRecipient,
        address management_
    ) public returns (address) {
        GardensYDSStrategy yds = new GardensYDSStrategy(
            IERC20(asset),
            name,
            symbol,
            yieldVault,
            donationRecipient
        );
        
        if (management_ != address(0)) {
            yds.setManagement(management_);
        }
        
        return address(yds);
    }
}




