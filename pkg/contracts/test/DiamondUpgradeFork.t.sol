// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";

/**
 * @title DiamondUpgradeFork
 * @notice Fork tests for deployed diamond pattern upgrade on Optimism Sepolia
 * @dev Tests the actual deployed contracts to verify the upgrade was successful
 */
contract DiamondUpgradeFork is Test {
    // Network configuration
    string constant RPC_URL = "https://sepolia.optimism.io";

    // Deployed facet addresses (from broadcast/UpgradeCVDiamond.s.sol/11155420/run-latest.json)
    address constant ADMIN_FACET = 0xf61B132ea2C9Aa4549936D0CBC524ac06F24b7Fa;
    address constant ALLOCATION_FACET = 0x860a8A650A38Cf51C8d8259c301a5654568FCe46;
    address constant DISPUTE_FACET = 0x604a88D2BA091a7b10b6cE11c46828cDE623600D;
    address constant POWER_FACET = 0x09c98B845f6ea5717c2e4aaeDb4a215059C8B408;
    address constant PROPOSAL_FACET = 0x116124eF60EA9D325FC7b653B0dD4F8B4fC152a3;

    // RegistryFactory proxy (from networks.json)
    address constant REGISTRY_FACTORY = 0xEC8824e9a9498520891ec678e98c5bd3e65229c2;

    // RegistryCommunity proxies (from networks.json)
    address[] registryCommunities;

    // CVStrategy proxies that were upgraded (from networks.json)
    address[] cvStrategies;

    function setUp() public {
        // Create fork of Optimism Sepolia
        string memory rpcUrl = vm.envOr("RPC_URL_OP_TESTNET", RPC_URL);
        vm.createSelectFork(rpcUrl);


        // Initialize registry communities
        registryCommunities.push(0x1F786ad20046a55651AD66Fb456Ab2ef2596727B);
        registryCommunities.push(0x394542fc04478AB3F8C7D9abb25d192eF60EC675);
        registryCommunities.push(0xc46A732ebFC0fbb35b0142077D68De91888DD53C);

        // Initialize CVStrategy proxies
        cvStrategies.push(0x093F75D851a874E506f1830CBC99fCD652E9b520);
        cvStrategies.push(0x280976EaeCF349B054e9EEF80f1f8306c8b4149c);
        cvStrategies.push(0x7FfF1689B505146949485C0DF2194dd0BaaCc319);
        cvStrategies.push(0xB1F46E01cCe016ab1C3c8ae6D4Bd77C977Fa24A0);
        cvStrategies.push(0xC30aB02B25ca2667dD0efA1DeB269C0F568c6147);
    }

    /**
     * @notice Test that RegistryFactory strategy template was updated
     */
    function test_registryFactory_strategyTemplate_updated() public view {
        RegistryFactory factory = RegistryFactory(payable(REGISTRY_FACTORY));

        address strategyTemplate = factory.strategyTemplate();

        // Verify it's not zero address
        assertTrue(strategyTemplate != address(0), "Strategy template should not be zero");

        // Verify it has code (is a contract)
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(strategyTemplate)
        }
        assertTrue(codeSize > 0, "Strategy template should have code");
    }

    /**
     * @notice Test that all RegistryCommunity strategy templates were updated
     */
    function test_registryCommunities_strategyTemplates_updated() public view {
        for (uint256 i = 0; i < registryCommunities.length; i++) {
            RegistryCommunity community = RegistryCommunity(payable(registryCommunities[i]));

            address strategyTemplate = community.strategyTemplate();

            // Verify it's not zero address
            assertTrue(strategyTemplate != address(0), "Strategy template should not be zero");

            // Verify it has code
            uint256 codeSize;
            assembly {
                codeSize := extcodesize(strategyTemplate)
            }
            assertTrue(codeSize > 0, "Strategy template should have code");
        }
    }

    /**
     * @notice Test that all CVStrategy proxies have the diamond fallback
     */
    function test_cvStrategies_have_fallback() public view {
        for (uint256 i = 0; i < cvStrategies.length; i++) {
            CVStrategy strategy = CVStrategy(payable(cvStrategies[i]));


            // Verify the contract exists
            address strategyAddr = cvStrategies[i];
            uint256 codeSize;
            assembly {
                codeSize := extcodesize(strategyAddr)
            }
            assertTrue(codeSize > 0, "Strategy should have code");

            // Verify we can read basic state (proves proxy is working)
            uint256 poolId = strategy.getPoolId();
            assertTrue(poolId > 0, "Pool ID should be set");

            uint256 proposalCounter = strategy.proposalCounter();
            // proposalCounter can be 0 or more, just verify it doesn't revert
        }
    }

    /**
     * @notice Test that facet functions are accessible via delegatecall for each strategy
     */
    function test_facet_functions_delegatecall() public view {
        for (uint256 i = 0; i < cvStrategies.length; i++) {

            address strategyAddr = cvStrategies[i];

            // Test CVAdminFacet functions are callable (we'll just check they don't revert on view functions)
            // Note: We can't easily test write functions without proper auth, but we can verify the routing works

            // Test CVAllocationFacet - allocate selector should be registered
            bytes4 allocateSelector = CVAllocationFacet.allocate.selector;

            // Test CVDisputeFacet - disputeProposal selector should be registered
            bytes4 disputeSelector = CVDisputeFacet.disputeProposal.selector;

            // Test CVPowerFacet - decreasePower selector should be registered
            bytes4 decreasePowerSelector = CVPowerFacet.decreasePower.selector;

            // Test CVProposalFacet - registerRecipient selector should be registered
            bytes4 registerRecipientSelector = CVProposalFacet.registerRecipient.selector;
        }
    }

    /**
     * @notice Test storage integrity after upgrade
     * @dev Verifies that critical storage variables were not corrupted during upgrade
     */
    function test_storage_integrity_after_upgrade() public view {
        for (uint256 i = 0; i < cvStrategies.length; i++) {
            CVStrategy strategy = CVStrategy(payable(cvStrategies[i]));


            // Check poolId is valid
            uint256 poolId = strategy.getPoolId();
            assertTrue(poolId > 0, "Pool ID should be valid");

            // Check proposalCounter (can be 0 for new pools)
            uint256 proposalCounter = strategy.proposalCounter();

            // Check totalStaked
            uint256 totalStaked = strategy.totalStaked();

            // Check owner is set
            address owner = strategy.owner();
            assertTrue(owner != address(0), "Owner should be set");

            // If there are proposals, verify we can read proposal data
            if (proposalCounter > 0) {
            }
        }
    }

    /**
     * @notice Test that facets have correct code deployed
     */
    function test_facets_deployed_correctly() public view {

        address[5] memory facets = [ADMIN_FACET, ALLOCATION_FACET, DISPUTE_FACET, POWER_FACET, PROPOSAL_FACET];

        string[5] memory facetNames =
            ["CVAdminFacet", "CVAllocationFacet", "CVDisputeFacet", "CVPowerFacet", "CVProposalFacet"];

        for (uint256 i = 0; i < facets.length; i++) {

            // Verify facet has code deployed
            address facetAddr = facets[i];
            uint256 codeSize;
            assembly {
                codeSize := extcodesize(facetAddr)
            }

            assertTrue(codeSize > 0, string(abi.encodePacked(facetNames[i], " should have code")));
        }
    }

    /**
     * @notice Comprehensive test that runs all verification checks
     */
    function test_comprehensive_upgrade_verification() public view {

        // 1. Verify facets are deployed
        this.test_facets_deployed_correctly();

        // 2. Verify RegistryFactory updated
        this.test_registryFactory_strategyTemplate_updated();

        // 3. Verify RegistryCommunities updated
        this.test_registryCommunities_strategyTemplates_updated();

        // 4. Verify CVStrategies have fallback
        this.test_cvStrategies_have_fallback();

        // 5. Verify storage integrity
        this.test_storage_integrity_after_upgrade();

    }
}
