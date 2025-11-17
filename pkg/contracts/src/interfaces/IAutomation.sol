// SPDX-License-Identifier: MIT
pragma solidity >=0.8.18;

/**
 * @title AutomationCompatibleInterface
 * @notice Interface for Chainlink Automation compatibility
 * @dev Minimal interface for keeper automation
 */
interface AutomationCompatibleInterface {
    /**
     * @notice Check if upkeep is needed
     * @param checkData Data passed to check function
     * @return upkeepNeeded True if upkeep should be performed
     * @return performData Data to pass to performUpkeep
     */
    function checkUpkeep(bytes calldata checkData)
        external
        view
        returns (bool upkeepNeeded, bytes memory performData);

    /**
     * @notice Perform the upkeep
     * @param performData Data from checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external;
}




