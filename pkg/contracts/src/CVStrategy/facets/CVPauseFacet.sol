// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {PauseFacetBase} from "../../pausing/PauseFacetBase.sol";

/**
 * @title CVPauseFacet
 * @notice Pause management for CVStrategy using a centralized pause controller
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVPauseFacet is CVStrategyBaseFacet, PauseFacetBase {
    function _pauseOwner() internal view override returns (address) {
        return effectiveOwner();
    }
}
