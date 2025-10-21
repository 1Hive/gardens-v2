// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import "forge-std/console2.sol";

/**
 * @title UpgradeRegistryCommunityDiamond
 * @notice Upgrades RegistryCommunity contracts to diamond pattern with facets
 * @dev Deploys facets, upgrades main contract, and configures diamond cuts for all existing communities
 */
contract UpgradeRegistryCommunityDiamond is BaseMultiChain {
    using stdJson for string;

    // Deployed facet addresses
    CommunityAdminFacet public adminFacet;
    CommunityMemberFacet public memberFacet;
    CommunityPoolFacet public poolFacet;
    CommunityPowerFacet public powerFacet;
    CommunityStrategyFacet public strategyFacet;

    function runCurrentNetwork(string memory networkJson) public override {
        console2.log("=== Starting RegistryCommunity Diamond Pattern Upgrade ===");

        // 1. Deploy new implementation and facets
        console2.log("\n[1/4] Deploying new RegistryCommunity implementation and facets...");
        address communityImplementation = address(new RegistryCommunityV0_0());
        console2.log("  RegistryCommunityV0_0 impl:", communityImplementation);

        adminFacet = new CommunityAdminFacet();
        console2.log("  CommunityAdminFacet:", address(adminFacet));

        memberFacet = new CommunityMemberFacet();
        console2.log("  CommunityMemberFacet:", address(memberFacet));

        poolFacet = new CommunityPoolFacet();
        console2.log("  CommunityPoolFacet:", address(poolFacet));

        powerFacet = new CommunityPowerFacet();
        console2.log("  CommunityPowerFacet:", address(powerFacet));

        strategyFacet = new CommunityStrategyFacet();
        console2.log("  CommunityStrategyFacet:", address(strategyFacet));

        // 2. Update RegistryFactory community template
        console2.log("\n[2/4] Updating RegistryFactory community template...");
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactoryV0_0 registryFactory = RegistryFactoryV0_0(payable(address(registryFactoryProxy)));
        registryFactory.setRegistryCommunityTemplate(communityImplementation);
        console2.log("  RegistryFactory community template updated");

        // 3. Upgrade existing RegistryCommunity proxies and configure facets
        console2.log("\n[3/4] Upgrading existing RegistryCommunity proxies with diamond cuts...");
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        IDiamond.FacetCut[] memory cuts = _getFacetCuts();

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunityV0_0 community =
                RegistryCommunityV0_0(payable(address(registryCommunityProxies[i])));

            // Upgrade implementation
            community.upgradeTo(communityImplementation);
            console2.log("  Community", i + 1, "upgraded:", registryCommunityProxies[i]);

            // Configure diamond facets
            community.diamondCut(cuts, address(0), "");
            console2.log("  Community", i + 1, "diamond cut configured");
        }

        console2.log("\n[4/4] RegistryCommunity diamond upgrade complete!");
        console2.log("  Total communities upgraded:", registryCommunityProxies.length);
    }

    /**
     * @notice Get facet cuts for diamond configuration
     * @return cuts Array of FacetCut structs for RegistryCommunity facets
     */
    function _getFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](5);

        // CommunityAdminFacet functions
        bytes4[] memory adminSelectors = new bytes4[](8);
        adminSelectors[0] = CommunityAdminFacet.setStrategyTemplate.selector;
        adminSelectors[1] = CommunityAdminFacet.setCollateralVaultTemplate.selector;
        adminSelectors[2] = CommunityAdminFacet.setArchived.selector;
        adminSelectors[3] = CommunityAdminFacet.setBasisStakedAmount.selector;
        adminSelectors[4] = CommunityAdminFacet.setCommunityFee.selector;
        adminSelectors[5] = CommunityAdminFacet.setCouncilSafe.selector;
        adminSelectors[6] = CommunityAdminFacet.acceptCouncilSafe.selector;
        adminSelectors[7] = CommunityAdminFacet.setCommunityParams.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: adminSelectors
        });

        // CommunityMemberFacet functions
        bytes4[] memory memberSelectors = new bytes4[](3);
        memberSelectors[0] = CommunityMemberFacet.stakeAndRegisterMember.selector;
        memberSelectors[1] = CommunityMemberFacet.unregisterMember.selector;
        memberSelectors[2] = CommunityMemberFacet.kickMember.selector;
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(memberFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: memberSelectors
        });

        // CommunityPoolFacet functions
        bytes4[] memory poolSelectors = new bytes4[](2);
        // createPool has two overloads with different signatures
        poolSelectors[0] = bytes4(
            keccak256("createPool(address,(uint256,bool,bool,bool,(uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),address,address,uint256,address[],address,uint256),(uint256,string))")
        );
        poolSelectors[1] = bytes4(
            keccak256("createPool(address,address,(uint256,bool,bool,bool,(uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),address,address,uint256,address[],address,uint256),(uint256,string))")
        );
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(poolFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: poolSelectors
        });

        // CommunityPowerFacet functions
        bytes4[] memory powerSelectors = new bytes4[](4);
        powerSelectors[0] = CommunityPowerFacet.activateMemberInStrategy.selector;
        powerSelectors[1] = CommunityPowerFacet.deactivateMemberInStrategy.selector;
        powerSelectors[2] = CommunityPowerFacet.increasePower.selector;
        powerSelectors[3] = CommunityPowerFacet.decreasePower.selector;
        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(powerFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: powerSelectors
        });

        // CommunityStrategyFacet functions
        bytes4[] memory strategySelectors = new bytes4[](5);
        strategySelectors[0] = CommunityStrategyFacet.addStrategyByPoolId.selector;
        strategySelectors[1] = CommunityStrategyFacet.addStrategy.selector;
        strategySelectors[2] = CommunityStrategyFacet.removeStrategyByPoolId.selector;
        strategySelectors[3] = CommunityStrategyFacet.removeStrategy.selector;
        strategySelectors[4] = CommunityStrategyFacet.rejectPool.selector;
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(strategyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: strategySelectors
        });

        return cuts;
    }
}
