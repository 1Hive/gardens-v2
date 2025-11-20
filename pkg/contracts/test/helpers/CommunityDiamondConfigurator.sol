// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunity} from "../../src/RegistryCommunity/RegistryCommunity.sol";
import {CommunityMemberFacet} from "../../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPowerFacet} from "../../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {CommunityAdminFacet} from "../../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityPoolFacet} from "../../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {DiamondLoupeFacet} from "../../src/diamonds/facets/DiamondLoupeFacet.sol";
import {RegistryCommunityDiamondInit} from "../../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {IDiamondCut} from "../../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title CommunityDiamondConfigurator
 * @notice Helper contract to deploy and configure RegistryCommunity diamond facets
 * @dev Used in tests to properly set up the diamond pattern after community deployment
 */
contract CommunityDiamondConfigurator {
    CommunityMemberFacet public memberFacet;
    CommunityPowerFacet public powerFacet;
    CommunityStrategyFacet public strategyFacet;
    CommunityAdminFacet public adminFacet;
    CommunityPoolFacet public poolFacet;
    DiamondLoupeFacet public loupeFacet;
    RegistryCommunityDiamondInit public diamondInit;

    constructor() {
        // Deploy all facets
        memberFacet = new CommunityMemberFacet();
        powerFacet = new CommunityPowerFacet();
        strategyFacet = new CommunityStrategyFacet();
        adminFacet = new CommunityAdminFacet();
        poolFacet = new CommunityPoolFacet();
        loupeFacet = new DiamondLoupeFacet();
        diamondInit = new RegistryCommunityDiamondInit();
    }

    /**
     * @notice Get facet cuts for configuring a RegistryCommunity instance
     * @return cuts Array of FacetCut structs to pass to diamondCut()
     */
    function getFacetCuts() public view returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](6);

        // CommunityMemberFacet functions
        bytes4[] memory memberSelectors = new bytes4[](6);
        memberSelectors[0] = CommunityMemberFacet.stakeAndRegisterMember.selector;
        memberSelectors[1] = CommunityMemberFacet.unregisterMember.selector;
        memberSelectors[2] = CommunityMemberFacet.kickMember.selector;
        memberSelectors[3] = CommunityMemberFacet.isMember.selector;
        memberSelectors[4] = CommunityMemberFacet.getBasisStakedAmount.selector;
        memberSelectors[5] = CommunityMemberFacet.getStakeAmountWithFees.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(memberFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: memberSelectors
        });

        // CommunityPowerFacet functions
        bytes4[] memory powerSelectors = new bytes4[](6);
        powerSelectors[0] = CommunityPowerFacet.activateMemberInStrategy.selector;
        powerSelectors[1] = CommunityPowerFacet.deactivateMemberInStrategy.selector;
        powerSelectors[2] = CommunityPowerFacet.increasePower.selector;
        powerSelectors[3] = CommunityPowerFacet.decreasePower.selector;
        powerSelectors[4] = CommunityPowerFacet.getMemberPowerInStrategy.selector;
        powerSelectors[5] = CommunityPowerFacet.getMemberStakedAmount.selector;
        cuts[1] = IDiamond.FacetCut({
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
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(strategyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: strategySelectors
        });

        // CommunityAdminFacet functions
        bytes4[] memory adminSelectors = new bytes4[](9);
        adminSelectors[0] = CommunityAdminFacet.isCouncilMember.selector;
        adminSelectors[1] = CommunityAdminFacet.setStrategyTemplate.selector;
        adminSelectors[2] = CommunityAdminFacet.setCollateralVaultTemplate.selector;
        adminSelectors[3] = CommunityAdminFacet.setArchived.selector;
        adminSelectors[4] = CommunityAdminFacet.setBasisStakedAmount.selector;
        adminSelectors[5] = CommunityAdminFacet.setCommunityFee.selector;
        adminSelectors[6] = CommunityAdminFacet.setCouncilSafe.selector;
        adminSelectors[7] = CommunityAdminFacet.acceptCouncilSafe.selector;
        adminSelectors[8] = CommunityAdminFacet.setCommunityParams.selector;
        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: adminSelectors
        });

        // CommunityPoolFacet functions (both createPool overloads)
        bytes4[] memory poolSelectors = new bytes4[](2);
        poolSelectors[0] = 0x499ac57f; // createPool(address,CVStrategyInitializeParamsV0_2,Metadata)
        poolSelectors[1] = 0xcd564dae; // createPool(address,address,CVStrategyInitializeParamsV0_2,Metadata)
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(poolFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: poolSelectors
        });

        // DiamondLoupeFacet functions - all 5 selectors including supportsInterface
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        cuts[5] = IDiamond.FacetCut({
            facetAddress: address(loupeFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: loupeSelectors
        });

        return cuts;
    }

    /**
     * @notice Configure all facets for a RegistryCommunity instance
     * @dev Caller must be the owner of the community
     * @param community The RegistryCommunity instance to configure
     */
    function configureFacets(address community) external {
        IDiamond.FacetCut[] memory cuts = getFacetCuts();
        RegistryCommunity(payable(community)).diamondCut(cuts, address(diamondInit), abi.encodeCall(RegistryCommunityDiamondInit.init, ()));
    }
}
