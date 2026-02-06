// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet} from "../CommunityBaseFacet.sol";
import {PauseFacetBase} from "../../pausing/PauseFacetBase.sol";

/**
 * @title CommunityPauseFacet
 * @notice Pause management for RegistryCommunity using a centralized pause controller
 * @dev This facet is called via delegatecall from RegistryCommunity
 *      CRITICAL: Inherits storage layout from CommunityBaseFacet
 */
contract CommunityPauseFacet is CommunityBaseFacet, PauseFacetBase {
    function _pauseOwner() internal view override returns (address) {
        return owner();
    }
}
