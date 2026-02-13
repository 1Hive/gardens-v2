// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVAdminFacet} from "../../src/CVStrategy/facets/CVAdminFacet.sol";

/**
 * @title CVAdminFacetV2
 * @notice Mock upgraded version of CVAdminFacet for testing diamond upgrades
 * @dev Adds a VERSION function to test that Replace action works correctly
 */
contract CVAdminFacetV2 is CVAdminFacet {
    /**
     * @notice Returns the version of this facet
     * @return Version string
     */
    function VERSION() external pure returns (string memory) {
        return "v2";
    }
}
