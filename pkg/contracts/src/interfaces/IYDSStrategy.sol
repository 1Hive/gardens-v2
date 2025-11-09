// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title IYDSStrategy
 * @notice Interface for Yield Donating Strategies following Octant pattern
 * @dev Extends ERC-4626 with donation mechanics
 */
interface IYDSStrategy is IERC4626 {
    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event DonationRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event DonationSharesMinted(address indexed recipient, uint256 shares, uint256 profit);
    event DonationSharesBurned(address indexed recipient, uint256 shares, uint256 loss);
    event Reported(uint256 profit, uint256 loss, uint256 totalAssets);
    event ManagementUpdated(address indexed newManagement);
    event KeeperUpdated(address indexed newKeeper);
    event EmergencyShutdown(bool active);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyManagement();
    error OnlyKeeper();
    error OnlyKeeperOrManagement();
    error ZeroAddress();
    error AlreadyShutdown();

    /*//////////////////////////////////////////////////////////////
                            YDS FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Report profit/loss and handle donation share minting/burning
    /// @return profit Amount of profit since last report
    /// @return loss Amount of loss since last report
    function report() external returns (uint256 profit, uint256 loss);

    /// @notice Get the current donation recipient address
    function donationRecipient() external view returns (address);

    /// @notice Set new donation recipient (two-step process)
    function proposeDonationRecipient(address newRecipient) external;

    /// @notice Accept donation recipient role
    function acceptDonationRecipient() external;

    /// @notice Get management address
    function management() external view returns (address);

    /// @notice Get keeper address
    function keeper() external view returns (address);

    /// @notice Set new management
    function setManagement(address newManagement) external;

    /// @notice Set new keeper
    function setKeeper(address newKeeper) external;

    /// @notice Emergency shutdown toggle
    function setEmergencyShutdown(bool active) external;

    /// @notice Check if strategy is shutdown
    function emergencyShutdown() external view returns (bool);

    /// @notice Get last total assets value
    function lastTotalAssets() external view returns (uint256);
}




