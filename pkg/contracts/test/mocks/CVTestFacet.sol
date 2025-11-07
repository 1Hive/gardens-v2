// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../../src/CVStrategy/CVStrategyBaseFacet.sol";

/**
 * @title CVTestFacet
 * @notice Mock new facet for testing diamond Add action
 * @dev Inherits CVStrategyBaseFacet to maintain correct storage layout
 */
contract CVTestFacet is CVStrategyBaseFacet {
    event TestFunctionCalled(address caller);

    /**
     * @notice Simple test function to verify facet is callable
     * @return Fixed value to verify function execution
     */
    function testFunction() external returns (uint256) {
        emit TestFunctionCalled(msg.sender);
        return 42;
    }

    /**
     * @notice Access storage to verify facet can read existing state
     * @return Total staked amount from strategy storage
     */
    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }
}
