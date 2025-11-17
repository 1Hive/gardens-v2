// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.18;

import {BaseYDSStrategy} from "./BaseYDSStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title GardensYDSStrategy
 * @notice Gardens-specific Yield Donating Strategy for conviction voting pools
 * @dev Follows Octant YDS pattern: profits minted as donation shares, losses burn donation buffer
 * 
 * Architecture:
 * - Inherits BaseYDSStrategy (Gardens implementation of Octant pattern)
 * - Deploys funds to external yield sources (Aave, Yearn, or CVVault)
 * - Reports generate donation shares to configured recipient (e.g., Superfluid GDA)
 * - User PPS stays flat (principal-tracking), all yield diverted to donations
 * 
 * Integration with Gardens:
 * - CVYDSFacet can redeem donation shares for distribution
 * - Donation recipient can be set to Superfluid GDA for streaming
 * - Compatible with existing CVVault as underlying yield source
 */
contract GardensYDSStrategy is BaseYDSStrategy {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NoYieldSource();
    error InsufficientIdleFunds();

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice External vault for yield generation (e.g., CVVault, Yearn, Aave)
    IERC4626 public yieldVault;

    /// @notice Whether to use external vault or keep funds idle
    bool public useExternalVault;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @param _asset Underlying asset (e.g., DAI, USDC)
     * @param _name Strategy token name
     * @param _symbol Strategy token symbol
     * @param _yieldVault Optional external vault for yield (can be address(0))
     * @param _donationRecipient Initial donation recipient
     */
    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _yieldVault,
        address _donationRecipient
    ) BaseYDSStrategy(_asset, _name, _symbol) {
        yieldVault = IERC4626(_yieldVault);
        useExternalVault = _yieldVault != address(0);
        
        // Set initial donation recipient
        donationRecipient = _donationRecipient;
        
        // Set initial lastTotalAssets
        lastTotalAssets = 0;
    }

    /*//////////////////////////////////////////////////////////////
                        STRATEGY-SPECIFIC HOOKS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deploy idle funds into external yield source
     * @dev Called automatically after deposits
     * @param amount Amount of assets to deploy
     */
    function _deployFunds(uint256 amount) internal override {
        if (!useExternalVault || address(yieldVault) == address(0)) {
            // Keep funds idle in strategy
            return;
        }

        // Deposit into external vault
        IERC20(asset()).safeIncreaseAllowance(address(yieldVault), amount);
        yieldVault.deposit(amount, address(this));
    }

    /**
     * @notice Free funds from external yield source
     * @dev Called before withdrawals
     * @param amount Amount of assets to free
     */
    function _freeFunds(uint256 amount) internal override {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        
        if (idle >= amount) {
            // Sufficient idle funds, no need to withdraw from vault
            return;
        }

        uint256 needed = amount - idle;

        if (useExternalVault && address(yieldVault) != address(0)) {
            // Withdraw from vault
            yieldVault.withdraw(needed, address(this), address(this));
        } else {
            // No external vault and insufficient idle funds
            revert InsufficientIdleFunds();
        }
    }

    /**
     * @notice Harvest rewards and report total assets
     * @dev Called during report() by keeper
     * @return totalAssets_ Current total assets under management
     */
    function _harvestAndReport() internal view override returns (uint256 totalAssets_) {
        if (useExternalVault && address(yieldVault) != address(0)) {
            // Get current value of vault shares (includes accrued yield)
            uint256 vaultShares = yieldVault.balanceOf(address(this));
            uint256 vaultAssets = vaultShares > 0 ? yieldVault.convertToAssets(vaultShares) : 0;
            
            // Add idle balance
            uint256 idle = IERC20(asset()).balanceOf(address(this));
            
            totalAssets_ = vaultAssets + idle;
        } else {
            // Just idle balance
            totalAssets_ = IERC20(asset()).balanceOf(address(this));
        }

        return totalAssets_;
    }

    /**
     * @notice Get current total assets (view version)
     */
    function _totalAssets() internal view override returns (uint256) {
        if (useExternalVault && address(yieldVault) != address(0)) {
            uint256 vaultShares = yieldVault.balanceOf(address(this));
            uint256 vaultAssets = vaultShares > 0 ? yieldVault.convertToAssets(vaultShares) : 0;
            uint256 idle = IERC20(asset()).balanceOf(address(this));
            return vaultAssets + idle;
        } else {
            return IERC20(asset()).balanceOf(address(this));
        }
    }

    /**
     * @notice Emergency withdrawal - pull all funds to idle
     * @dev Called during emergency shutdown
     */
    function _emergencyWithdraw(uint256 /* amount */) internal override {
        if (useExternalVault && address(yieldVault) != address(0)) {
            uint256 vaultShares = yieldVault.balanceOf(address(this));
            if (vaultShares > 0) {
                yieldVault.redeem(vaultShares, address(this), address(this));
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set external yield vault
     * @param _yieldVault Address of ERC-4626 vault
     * @param _use Whether to use the vault
     */
    function setYieldVault(address _yieldVault, bool _use) external onlyManagement {
        yieldVault = IERC4626(_yieldVault);
        useExternalVault = _use;
    }
}


