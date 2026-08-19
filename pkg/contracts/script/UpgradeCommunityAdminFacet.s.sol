// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {CommunityDiamondConfiguratorBase} from "../test/helpers/CommunityDiamondConfigurator.sol";

/// @notice Replaces only the CommunityAdmin facet on existing communities and in the factory template.
contract UpgradeCommunityAdminFacet is BaseMultiChain, CommunityDiamondConfiguratorBase {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address adminFacetAddress = _flagEnabled("DEPLOY_COMMUNITY_ADMIN_FACET")
            ? address(new CommunityAdminFacet())
            : networkJson.readAddress(getKeyNetwork(".FACETS.COMMUNITY_ADMIN"));
        require(adminFacetAddress.code.length != 0, "community admin facet has no code");

        IDiamond.FacetCut[] memory adminCuts = new IDiamond.FacetCut[](1);
        adminCuts[0] = _buildCommunityAdminFacetCut(CommunityAdminFacet(adminFacetAddress));

        address[] memory communities = networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < communities.length; i++) {
            IDiamondCut(communities[i]).diamondCut(adminCuts, address(0), "");
        }

        RegistryFactory factory =
            RegistryFactory(payable(networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"))));
        (IDiamond.FacetCut[] memory factoryCuts, address init, bytes memory initCalldata) = factory.getCommunityFacets();

        bool replaced;
        for (uint256 i = 0; i < factoryCuts.length; i++) {
            bytes4[] memory selectors = factoryCuts[i].functionSelectors;
            for (uint256 j = 0; j < selectors.length; j++) {
                if (selectors[j] == CommunityAdminFacet.setCommunityParams.selector) {
                    factoryCuts[i] = adminCuts[0];
                    replaced = true;
                    break;
                }
            }
            if (replaced) break;
        }
        require(replaced, "factory community admin facet not found");
        factory.setCommunityFacets(factoryCuts, init, initCalldata);
    }
}
