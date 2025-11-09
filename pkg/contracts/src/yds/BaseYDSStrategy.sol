// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IYDSStrategy} from "../interfaces/IYDSStrategy.sol";

/**
 * @title BaseYDSStrategy
 * @notice Base contract for Yield Donating Strategies following Octant pattern
 * @dev Inherits ERC-4626 and adds donation share mechanics
 * 
 * Key Features (from Octant YDS):
 * - Profits → mint donation shares to donation recipient
 * - Losses → burn donation shares first (buffer), then socialize
 * - User PPS stays flat during profit cycles (principal-tracking)
 * - Concrete strategies override: _deployFunds, _freeFunds, _harvestAndReport
 */
abstract contract BaseYDSStrategy is ERC4626, IYDSStrategy {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    address public management;
    address public keeper;
    address public donationRecipient;
    address public pendingDonationRecipient;
    uint256 public lastTotalAssets;
    bool public emergencyShutdown;

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyManagement() {
        if (msg.sender != management) revert OnlyManagement();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert OnlyKeeper();
        _;
    }

    modifier onlyKeeperOrManagement() {
        if (msg.sender != keeper && msg.sender != management) revert OnlyKeeperOrManagement();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol
    ) ERC4626(_asset) ERC20(_name, _symbol) {
        management = msg.sender;
        keeper = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                            YDS CORE LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Report profit/loss and handle donation shares
     * @dev Called by keeper to:
     *      1. Harvest rewards from external source
     *      2. Calculate profit/loss
     *      3. Mint/burn donation shares accordingly
     * @return profit Amount of profit since last report
     * @return loss Amount of loss since last report
     */
    function report() external onlyKeeperOrManagement returns (uint256 profit, uint256 loss) {
        if (emergencyShutdown) revert AlreadyShutdown();

        // Call strategy-specific harvest implementation
        uint256 currentTotalAssets = _harvestAndReport();

        // Calculate profit or loss
        uint256 lastAssets = lastTotalAssets;
        
        if (currentTotalAssets > lastAssets) {
            // PROFIT: Mint donation shares
            profit = currentTotalAssets - lastAssets;
            
            if (profit > 0 && donationRecipient != address(0)) {
                // Convert profit to shares and mint to donation recipient
                uint256 sharesToMint = _convertToSharesForDonation(profit, currentTotalAssets);
                if (sharesToMint > 0) {
                    _mint(donationRecipient, sharesToMint);
                    emit DonationSharesMinted(donationRecipient, sharesToMint, profit);
                }
            }
        } else if (currentTotalAssets < lastAssets) {
            // LOSS: Burn donation shares first
            loss = lastAssets - currentTotalAssets;
            
            if (loss > 0 && donationRecipient != address(0)) {
                uint256 donationShares = balanceOf(donationRecipient);
                
                if (donationShares > 0) {
                    // Calculate shares to burn (up to available donation shares)
                    uint256 sharesToBurn = _convertToSharesForDonation(loss, lastAssets);
                    sharesToBurn = Math.min(sharesToBurn, donationShares);
                    
                    if (sharesToBurn > 0) {
                        _burn(donationRecipient, sharesToBurn);
                        emit DonationSharesBurned(donationRecipient, sharesToBurn, loss);
                        
                        // Recalculate actual loss after burning shares
                        uint256 lossBuffered = _convertToAssetsForDonation(sharesToBurn, lastAssets);
                        if (loss > lossBuffered) {
                            loss = loss - lossBuffered;
                            // Remaining loss will be socialized across all users
                        } else {
                            loss = 0; // Fully buffered by donation shares
                        }
                    }
                }
                // If loss remains after burning donation shares, it socializes (reduces PPS)
            }
        }

        lastTotalAssets = currentTotalAssets;
        emit Reported(profit, loss, currentTotalAssets);
    }

    /**
     * @notice Calculate shares for donation (profit minting or loss burning)
     * @dev Uses current supply and assets to calculate share amount
     */
    function _convertToSharesForDonation(uint256 assets, uint256 totalAssets_) internal view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? assets : (assets * supply) / totalAssets_;
    }

    /**
     * @notice Calculate assets from shares for donation
     */
    function _convertToAssetsForDonation(uint256 shares, uint256 totalAssets_) internal view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? shares : (shares * totalAssets_) / supply;
    }

    /*//////////////////////////////////////////////////////////////
                            ERC-4626 OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Override totalAssets to return current assets
     * @dev Calls strategy-specific implementation
     */
    function totalAssets() public view virtual override(ERC4626, IERC4626) returns (uint256) {
        return _totalAssets();
    }

    /**
     * @notice Deposit hook - deploys funds after minting shares
     */
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal
        virtual
        override
    {
        if (emergencyShutdown) revert AlreadyShutdown();
        
        super._deposit(caller, receiver, assets, shares);
        
        // Deploy funds to yield source
        if (assets > 0) {
            _deployFunds(assets);
        }
    }

    /**
     * @notice Withdraw hook - frees funds before burning shares
     */
    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        internal
        virtual
        override
    {
        // Free funds from yield source
        if (assets > 0) {
            _freeFunds(assets);
        }
        
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    /*//////////////////////////////////////////////////////////////
                        DONATION RECIPIENT MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function proposeDonationRecipient(address newRecipient) external onlyManagement {
        if (newRecipient == address(0)) revert ZeroAddress();
        pendingDonationRecipient = newRecipient;
    }

    function acceptDonationRecipient() external {
        require(msg.sender == pendingDonationRecipient, "Only pending recipient");
        
        address oldRecipient = donationRecipient;
        donationRecipient = pendingDonationRecipient;
        pendingDonationRecipient = address(0);
        
        emit DonationRecipientUpdated(oldRecipient, donationRecipient);
    }

    /*//////////////////////////////////////////////////////////////
                        ROLE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function setManagement(address newManagement) external onlyManagement {
        if (newManagement == address(0)) revert ZeroAddress();
        management = newManagement;
        emit ManagementUpdated(newManagement);
    }

    function setKeeper(address newKeeper) external onlyManagement {
        if (newKeeper == address(0)) revert ZeroAddress();
        keeper = newKeeper;
        emit KeeperUpdated(newKeeper);
    }

    function setEmergencyShutdown(bool active) external onlyManagement {
        emergencyShutdown = active;
        emit EmergencyShutdown(active);
    }

    /*//////////////////////////////////////////////////////////////
                    STRATEGY-SPECIFIC HOOKS (ABSTRACT)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deploy idle funds to external yield source
     * @dev Called after deposits - implement in concrete strategy
     * @param amount Amount of assets to deploy
     */
    function _deployFunds(uint256 amount) internal virtual;

    /**
     * @notice Free funds from external yield source
     * @dev Called before withdrawals - implement in concrete strategy
     * @param amount Amount of assets to free
     */
    function _freeFunds(uint256 amount) internal virtual;

    /**
     * @notice Harvest rewards and report total assets
     * @dev Called during report() - implement in concrete strategy
     * @return totalAssets Current total assets under management
     */
    function _harvestAndReport() internal virtual returns (uint256 totalAssets);

    /**
     * @notice Get current total assets
     * @dev Implement view version for totalAssets()
     */
    function _totalAssets() internal view virtual returns (uint256);

    /**
     * @notice Emergency withdrawal of all funds
     * @dev Pull funds back to idle without reporting
     */
    function _emergencyWithdraw(uint256 amount) internal virtual;

    /**
     * @notice Emergency function to withdraw all funds
     */
    function emergencyWithdraw() external onlyManagement {
        uint256 deployed = _totalAssets() - IERC20(asset()).balanceOf(address(this));
        if (deployed > 0) {
            _emergencyWithdraw(deployed);
        }
    }
}

