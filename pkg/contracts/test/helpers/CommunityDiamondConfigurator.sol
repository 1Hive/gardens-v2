// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunity} from "../../src/RegistryCommunity/RegistryCommunity.sol";
import {CommunityMemberFacet} from "../../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPowerFacet} from "../../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {CommunityAdminFacet} from "../../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityPoolFacet} from "../../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {IDiamondCut} from "../../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../../src/diamonds/interfaces/IDiamond.sol";

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
            facetAddress: address(_adminFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: adminSelectors
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
            facetAddress: address(_poolFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: poolSelectors
        });

        bytes4[] memory powerSelectors = new bytes4[](6);
        powerSelectors[0] = CommunityPowerFacet.activateMemberInStrategy.selector;
        powerSelectors[1] = CommunityPowerFacet.deactivateMemberInStrategy.selector;
        powerSelectors[2] = CommunityPowerFacet.increasePower.selector;
        powerSelectors[3] = CommunityPowerFacet.decreasePower.selector;
        powerSelectors[4] = CommunityPowerFacet.getMemberPowerInStrategy.selector;
        powerSelectors[5] = CommunityPowerFacet.getMemberStakedAmount.selector;
        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(_powerFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: powerSelectors
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
}

/**
 * @title CommunityDiamondConfigurator
 * @notice Helper contract to deploy and configure RegistryCommunity diamond facets
 * @dev Used in tests to properly set up the diamond pattern after community deployment
 */
contract CommunityDiamondConfigurator is CommunityDiamondConfiguratorBase {
    CommunityMemberFacet public memberFacet;
    CommunityPowerFacet public powerFacet;
    CommunityStrategyFacet public strategyFacet;
    CommunityAdminFacet public adminFacet;
    CommunityPoolFacet public poolFacet;

    constructor() {
        // Deploy all facets
        memberFacet = new CommunityMemberFacet();
        powerFacet = new CommunityPowerFacet();
        strategyFacet = new CommunityStrategyFacet();
        adminFacet = new CommunityAdminFacet();
        poolFacet = new CommunityPoolFacet();
    }

    function getFacetCuts() public view returns (IDiamond.FacetCut[] memory cuts) {
        return _buildFacetCuts(adminFacet, memberFacet, poolFacet, powerFacet, strategyFacet);
    }

    function getFacetCuts(
        CommunityAdminFacet _adminFacet,
        CommunityMemberFacet _memberFacet,
        CommunityPoolFacet _poolFacet,
        CommunityPowerFacet _powerFacet,
        CommunityStrategyFacet _strategyFacet
    ) public pure returns (IDiamond.FacetCut[] memory cuts) {
        return _buildFacetCuts(_adminFacet, _memberFacet, _poolFacet, _powerFacet, _strategyFacet);
    }
}
