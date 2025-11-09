// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {GardensYDSStrategy} from "../src/yds/GardensYDSStrategy.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title ConfigureYDSForStreaming
 * @notice Configuration script to connect YDS strategy to Superfluid GDA
 * @dev Sets up the complete flow: YDS → GDA → Proposals
 * 
 * Steps:
 * 1. Deploy or get existing Superfluid GDA
 * 2. Set GDA as donation recipient in YDS strategy
 * 3. Initialize GDA in CVStrategy
 * 4. Enable streaming in CVStrategy
 * 
 * Flow After Configuration:
 * YDS Strategy generates yield
 *   → report() mints donation shares to GDA
 *   → GDA holds shares
 *   → rebalanceYieldStreams() redeems shares
 *   → GDA streams underlying to proposal beneficiaries
 */
contract ConfigureYDSForStreaming is Script {
    using SuperTokenV1Library for ISuperToken;

    struct Config {
        address ydsStrategy;
        address cvStrategy;
        address superToken;
        address gda;
        address councilSafe;
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        Config memory config = Config({
            ydsStrategy: vm.envAddress("YDS_STRATEGY_ADDRESS"),
            cvStrategy: vm.envAddress("CV_STRATEGY_ADDRESS"),
            superToken: vm.envAddress("SUPER_TOKEN_ADDRESS"),
            gda: vm.envOr("GDA_ADDRESS", address(0)),
            councilSafe: vm.envAddress("COUNCIL_SAFE")
        });
        
        console.log("=== Configuring YDS for Superfluid Streaming ===\n");
        console.log("YDS Strategy:", config.ydsStrategy);
        console.log("CVStrategy:", config.cvStrategy);
        console.log("Super Token:", config.superToken);
        console.log("Council Safe:", config.councilSafe);
        
        vm.startBroadcast(deployerPrivateKey);
        
        GardensYDSStrategy yds = GardensYDSStrategy(config.ydsStrategy);
        CVStrategy cv = CVStrategy(payable(config.cvStrategy));
        ISuperToken superToken = ISuperToken(config.superToken);
        
        // Step 1: Verify GDA provided
        if (config.gda == address(0)) {
            console.log("\nERROR: No GDA provided!");
            console.log("Deploy GDA via Superfluid UI (app.superfluid.finance) or factory");
            console.log("Then set GDA_ADDRESS in .env");
            revert("GDA_ADDRESS required");
        } else {
            console.log("\nUsing GDA:", config.gda);
        }
        
        // Step 2: Propose GDA as donation recipient
        // (Two-step process for security)
        console.log("\nStep 2: Proposing GDA as donation recipient...");
        yds.proposeDonationRecipient(config.gda);
        console.log("Proposed. GDA must accept via acceptDonationRecipient()");
        
        // Note: In production, the GDA (or its controller) must call:
        // yds.acceptDonationRecipient()
        // For testing with EOA-controlled setup:
        if (config.gda.code.length == 0) {
            console.log("WARNING: GDA appears to be EOA, manual acceptance needed");
        }
        
        // Step 3: Initialize GDA in CVStrategy
        console.log("\nStep 3: Initializing GDA in CVStrategy...");
        cv.initializeGDA(config.gda);
        console.log("GDA initialized in CVStrategy");
        
        // Step 4: Enable streaming
        console.log("\nStep 4: Enabling streaming...");
        cv.setStreamingEnabled(true);
        console.log("Streaming enabled");
        
        vm.stopBroadcast();
        
        // Verification
        console.log("\n=== Configuration Complete ===");
        console.log("YDS Donation Recipient (pending):", yds.pendingDonationRecipient());
        // Note: getGDA and streamingEnabled accessors via diamond
        
        console.log("\n=== Next Steps ===");
        console.log("1. GDA must accept donation recipient role:");
        console.log("   yds.acceptDonationRecipient() [from GDA or controller]");
        console.log("2. Users deposit into YDS strategy");
        console.log("3. Keeper calls yds.report() to generate donation shares");
        console.log("4. Keeper calls cv.rebalanceYieldStreams() to start streaming");
        console.log("\n=== Keeper Setup ===");
        console.log("Deploy CVStreamingKeeper and register with Chainlink Automation");
        console.log("Recommended intervals:");
        console.log("  - report: 86400 seconds (24 hours)");
        console.log("  - rebalance: 3600 seconds (1 hour)");
    }

    /**
     * @notice Helper to accept donation recipient (call from GDA controller)
     */
    function acceptDonationRecipient(address ydsStrategy) external {
        GardensYDSStrategy(ydsStrategy).acceptDonationRecipient();
        console.log("Donation recipient accepted");
    }
}


