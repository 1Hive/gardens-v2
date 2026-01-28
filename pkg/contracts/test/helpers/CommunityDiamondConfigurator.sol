// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

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

abstract contract CommunityDiamondConfiguratorBase {
    function _buildFacetCuts(
        CommunityAdminFacet _adminFacet,
        CommunityMemberFacet _memberFacet,
        CommunityPoolFacet _poolFacet,
        CommunityPowerFacet _powerFacet,
        CommunityStrategyFacet _strategyFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](5);

        bytes4[] memory adminSelectors = new bytes4[](9);
        adminSelectors[0] = CommunityAdminFacet.setStrategyTemplate.selector;
        adminSelectors[1] = CommunityAdminFacet.setCollateralVaultTemplate.selector;
        adminSelectors[2] = CommunityAdminFacet.setArchived.selector;
        adminSelectors[3] = CommunityAdminFacet.setBasisStakedAmount.selector;
        adminSelectors[4] = CommunityAdminFacet.setCommunityFee.selector;
        adminSelectors[5] = CommunityAdminFacet.setCouncilSafe.selector;
        adminSelectors[6] = CommunityAdminFacet.acceptCouncilSafe.selector;
        adminSelectors[7] = CommunityAdminFacet.setCommunityParams.selector;
        adminSelectors[8] = CommunityAdminFacet.isCouncilMember.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(_adminFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: adminSelectors
        });

        bytes4[] memory memberSelectors = new bytes4[](6);
        memberSelectors[0] = CommunityMemberFacet.stakeAndRegisterMember.selector;
        memberSelectors[1] = CommunityMemberFacet.unregisterMember.selector;
        memberSelectors[2] = CommunityMemberFacet.kickMember.selector;
        memberSelectors[3] = CommunityMemberFacet.isMember.selector;
        memberSelectors[4] = CommunityMemberFacet.getBasisStakedAmount.selector;
        memberSelectors[5] = CommunityMemberFacet.getStakeAmountWithFees.selector;
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(_memberFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: memberSelectors
        });

        bytes4[] memory poolSelectors = new bytes4[](2);
        poolSelectors[0] = bytes4(
            keccak256(
                "createPool(address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,uint256,address[],address),(uint256,string))"
            )
        );
        poolSelectors[1] = bytes4(
            keccak256(
                "createPool(address,address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,uint256,address[],address),(uint256,string))"
            )
        );
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(_poolFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: poolSelectors
        });

        bytes4[] memory powerSelectors = new bytes4[](6);
        powerSelectors[0] = CommunityPowerFacet.activateMemberInStrategy.selector;
        powerSelectors[1] = CommunityPowerFacet.deactivateMemberInStrategy.selector;
        powerSelectors[2] = CommunityPowerFacet.increasePower.selector;
        powerSelectors[3] = CommunityPowerFacet.decreasePower.selector;
        powerSelectors[4] = CommunityPowerFacet.getMemberPowerInStrategy.selector;
        powerSelectors[5] = CommunityPowerFacet.getMemberStakedAmount.selector;
        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(_powerFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: powerSelectors
        });

        bytes4[] memory strategySelectors = new bytes4[](5);
        strategySelectors[0] = CommunityStrategyFacet.addStrategyByPoolId.selector;
        strategySelectors[1] = CommunityStrategyFacet.addStrategy.selector;
        strategySelectors[2] = CommunityStrategyFacet.removeStrategyByPoolId.selector;
        strategySelectors[3] = CommunityStrategyFacet.removeStrategy.selector;
        strategySelectors[4] = CommunityStrategyFacet.rejectPool.selector;
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(_strategyFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: strategySelectors
        });
    }

    function _buildLoupeFacetCut(DiamondLoupeFacet _loupeFacet)
        internal
        pure
        virtual
        returns (IDiamond.FacetCut memory)
    {
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        return IDiamond.FacetCut({
            facetAddress: address(_loupeFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: loupeSelectors
        });
    }
}

/**
 * @title CommunityDiamondConfigurator
 * @notice Helper contract to deploy and configure RegistryCommunity diamond facets
 * @dev Used in tests to properly set up the diamond pattern after community deployment
 */
contract CommunityDiamondConfigurator is CommunityDiamondConfiguratorBase {
    CommunityAdminFacet public adminFacet;
    CommunityMemberFacet public memberFacet;
    CommunityPoolFacet public poolFacet;
    CommunityPowerFacet public powerFacet;
    CommunityStrategyFacet public strategyFacet;
    DiamondLoupeFacet public loupeFacet;
    RegistryCommunityDiamondInit public diamondInit;

    constructor() {
        // Deploy all facets
        adminFacet = new CommunityAdminFacet();
        memberFacet = new CommunityMemberFacet();
        poolFacet = new CommunityPoolFacet();
        powerFacet = new CommunityPowerFacet();
        strategyFacet = new CommunityStrategyFacet();
        loupeFacet = new DiamondLoupeFacet();
        diamondInit = new RegistryCommunityDiamondInit();
    }

    /**
     * @notice Get facet cuts for configuring a RegistryCommunity instance (includes DiamondLoupeFacet)
     * @return cuts Array of FacetCut structs to pass to diamondCut()
     */
    function getFacetCuts() public view returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts =
            _buildFacetCuts(adminFacet, memberFacet, poolFacet, powerFacet, strategyFacet);

        // Add loupe facet as 6th facet
        cuts = new IDiamond.FacetCut[](6);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 5; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    /**
     * @notice Get facet cuts with custom facets (includes DiamondLoupeFacet)
     */
    function getFacetCuts(
        CommunityAdminFacet _adminFacet,
        CommunityMemberFacet _memberFacet,
        CommunityPoolFacet _poolFacet,
        CommunityPowerFacet _powerFacet,
        CommunityStrategyFacet _strategyFacet,
        DiamondLoupeFacet _loupeFacet
    ) public pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = _buildFacetCuts(
            _adminFacet, _memberFacet, _poolFacet, _powerFacet, _strategyFacet
        );

        cuts = new IDiamond.FacetCut[](6);
        cuts[0] = _buildLoupeFacetCut(_loupeFacet);
        for (uint256 i = 0; i < 5; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    /**
     * @notice Configure all facets for a RegistryCommunity instance
     * @dev Caller must be the owner of the community
     * @param community The RegistryCommunity instance to configure
     */
    function configureFacets(address community) external {
        IDiamond.FacetCut[] memory cuts = getFacetCuts();
        IDiamondCut(community).diamondCut(
            cuts, address(diamondInit), abi.encodeCall(RegistryCommunityDiamondInit.init, ())
        );
    }
}
