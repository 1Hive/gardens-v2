// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.25;

import "forge-std/Script.sol";
import {GardensYDSStrategy} from "../src/yds/GardensYDSStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Note: Don't import CVStrategy (0.8.19) directly - just reference by address

/**
 * @title DeployGardensYDS
 * @notice Deployment script for Gardens YDS Strategy (Octant-based)
 * @dev Deploys strategy that imports Octant's audited base
 * 
 * KEY: Works WITH existing CVStrategy via IYDSStrategy interface!
 * 
 * Integration:
 * 1. CVStrategy already deployed (Allo-based, 0.8.19)
 * 2. Deploy this strategy (Octant-based, 0.8.25)
 * 3. Connect: cvStrategy.setYDSStrategy(address(ydsStrategy))
 * 4. Use normally: cvStrategy.harvestYDS() ← calls this!
 * 
 * Benefits:
 * - Maintains Allo integration ✅
 * - Uses Octant audited base ✅
 * - Saves ~$30k audit cost ✅
 */
contract DeployGardensYDS is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Load config
        address asset = vm.envAddress("ASSET_ADDRESS");
        address tokenizedStrategyImpl = vm.envAddress("OCTANT_TOKENIZED_STRATEGY");
        address donationRecipient = vm.envAddress("DONATION_RECIPIENT");
        address externalVault = vm.envOr("YIELD_VAULT_ADDRESS", address(0));
        
        string memory name = "Gardens YDS - DAI";
        
        console.log("Deploying GardensYDSStrategy (Octant-based):");
        console.log("  Asset:", asset);
        console.log("  Octant Implementation:", tokenizedStrategyImpl);
        console.log("  Donation Recipient:", donationRecipient);
        console.log("  External Vault:", externalVault);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy strategy
        GardensYDSStrategy ydsStrategy = new GardensYDSStrategy();
        
        // Initialize
        ydsStrategy.initialize(
            asset,
            name,
            tokenizedStrategyImpl,
            donationRecipient,
            externalVault
        );
        
        console.log("\nGardensYDSStrategy deployed at:", address(ydsStrategy));
        
        vm.stopBroadcast();
        
        console.log("\n=== INTEGRATION WITH CVSTRATEGY ===");
        console.log("1. Get your CVStrategy address");
        console.log("2. Call: cvStrategy.setYDSStrategy(", address(ydsStrategy), ")");
        console.log("3. Use: cvStrategy.harvestYDS() <- now uses this strategy!");
        console.log("\nBenefits:");
        console.log("  - Uses Octant's audited base (1749+ lines FREE)");
        console.log("  - Only audit ~100 lines of Gardens customization");
        console.log("  - Saves ~$30k audit cost");
        console.log("  - Maintains full Allo integration!");
    }
}

