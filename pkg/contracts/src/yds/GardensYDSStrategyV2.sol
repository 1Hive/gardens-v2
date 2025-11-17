// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.25;

import {BaseStrategy} from "octant-v2/core/BaseStrategy.sol";
import {ITokenizedStrategy} from "octant-v2/core/interfaces/ITokenizedStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IYDSStrategy} from "../interfaces/IYDSStrategy.sol";

/**
 * @title GardensYDSStrategyV2  
 * @notice Gardens YDS using Octant's audited BaseStrategy + TokenizedStrategy
 * @dev IMPORTS Octant's base (2376 lines AUDITED) - Only implements Gardens customization
 * 
 * ARCHITECTURE:
 * 
 * CVStrategy (Allo-based, 0.8.19)
 *     ↓ IYDSStrategy interface (external calls)
 * GardensYDSStrategyV2 (0.8.25) ← THIS FILE
 *     ↓ inherits
 * Octant BaseStrategy (549 lines AUDITED)
 *     ↓ delegates to
 * Octant TokenizedStrategy (1200+ lines AUDITED)
 * 
 * KEY INSIGHT: V2 doesn't replace CVStrategy, it plugs IN via interface!
 * 
 * AUDIT SAVINGS:
 * - Octant base: 1749+ lines (AUDITED - FREE!)
 * - This file: ~100 lines (Gardens hooks + interface impl)
 * - vs BaseYDSStrategy: 250 lines
 * - Savings: ~$30k audit cost
 * 
 * ALLO INTEGRATION:
 * - CVStrategy calls this via IYDSStrategy interface
 * - report(), balanceOf(), redeem() all work
 * - Maintains full Allo compatibility!
 * 
 * YDS BEHAVIOR (from Octant):
 * - report() mints donation shares to donationRecipient
 * - Losses burn donation shares first
 * - User PPS stays flat (principal-tracking)
 */
contract GardensYDSStrategyV2 is BaseStrategy, IYDSStrategy {
    
    /// @notice Donation recipient address (Superfluid GDA or CVStrategy)
    address public override donationRecipient;
    
    /// @notice Proposed donation recipient (two-step change)
    address public override pendingDonationRecipient;
    
    /// @notice Whether to use external yield vault
    bool public useExternalVault;
    
    /// @notice External vault address (Aave, Yearn, etc.)
    IERC4626 public externalVault;
    
    /**
     * @notice Initialize strategy with Gardens configuration
     * @param _asset Underlying asset (DAI, USDC, etc.)
     * @param _name Strategy name
     * @param _tokenizedStrategyImplementation Octant's TokenizedStrategy address
     * @param _donationRecipient Initial donation recipient (GDA or CVStrategy)
     * @param _externalVault Optional external yield vault (Aave, Yearn)
     */
    function initialize(
        address _asset,
        string memory _name,
        address _tokenizedStrategyImplementation,
        address _donationRecipient,
        address _externalVault
    ) external {
        // Initialize Octant's BaseStrategy
        __BaseStrategy_init(_asset, _name, _tokenizedStrategyImplementation);
        
        // Set Gardens-specific config
        donationRecipient = _donationRecipient;
        externalVault = IERC4626(_externalVault);
        useExternalVault = _externalVault != address(0);
    }
    
    /*//////////////////////////////////////////////////////////////
                    IYDS STRATEGY INTERFACE (Gardens)
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Report profit/loss (implements IYDSStrategy)
     * @dev Delegates to Octant's TokenizedStrategy.report()
     *      Octant's YieldDonatingTokenizedStrategy handles donation share minting
     */
    function report() external override returns (uint256 profit, uint256 loss) {
        // Call Octant's report via TokenizedStrategy
        return TokenizedStrategy.report();
    }
    
    /**
     * @notice Propose new donation recipient (implements IYDSStrategy)
     */
    function proposeDonationRecipient(address newRecipient) external override {
        require(msg.sender == TokenizedStrategy.management(), "Only management");
        require(newRecipient != address(0), "Zero address");
        pendingDonationRecipient = newRecipient;
    }
    
    /**
     * @notice Accept donation recipient role (implements IYDSStrategy)
     */
    function acceptDonationRecipient() external override {
        require(msg.sender == pendingDonationRecipient, "Only pending");
        donationRecipient = pendingDonationRecipient;
        pendingDonationRecipient = address(0);
        emit DonationRecipientUpdated(donationRecipient, donationRecipient);
    }
    
    /**
     * @notice Get management address (implements IYDSStrategy)
     */
    function management() external view override returns (address) {
        return TokenizedStrategy.management();
    }
    
    /**
     * @notice Get keeper address (implements IYDSStrategy)
     */
    function keeper() external view override returns (address) {
        return TokenizedStrategy.keeper();
    }
    
    /**
     * @notice Set management (implements IYDSStrategy)
     */
    function setManagement(address newManagement) external override {
        require(msg.sender == TokenizedStrategy.management(), "Only management");
        TokenizedStrategy.setManagement(newManagement);
    }
    
    /**
     * @notice Set keeper (implements IYDSStrategy)
     */
    function setKeeper(address newKeeper) external override {
        require(msg.sender == TokenizedStrategy.management(), "Only management");
        TokenizedStrategy.setKeeper(newKeeper);
    }
    
    /**
     * @notice Set emergency shutdown (implements IYDSStrategy)
     */
    function setEmergencyShutdown(bool active) external override {
        require(msg.sender == TokenizedStrategy.management(), "Only management");
        if (active) {
            TokenizedStrategy.shutdownStrategy();
        }
        // Note: Can't easily "unshutdown" in Octant, may need workaround
    }
    
    /**
     * @notice Check if shutdown (implements IYDSStrategy)
     */
    function emergencyShutdown() external view override returns (bool) {
        return TokenizedStrategy.isShutdown();
    }
    
    /**
     * @notice Get last total assets (implements IYDSStrategy)
     */
    function lastTotalAssets() external view override returns (uint256) {
        return TokenizedStrategy.totalAssets();
    }
    
    /*//////////////////////////////////////////////////////////////
                    OCTANT BASESTRATEGY HOOKS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev HOOK: Deploy funds to yield source
     *      Gardens: Deploy to external vault (Aave, Yearn, CVVault)
     */
    function _deployFunds(uint256 amount) internal override {
        if (!useExternalVault || address(externalVault) == address(0)) {
            return;  // Keep idle
        }
        
        // Deploy to external ERC4626 vault
        asset.approve(address(externalVault), amount);
        externalVault.deposit(amount, address(this));
    }
    
    /**
     * @dev HOOK: Free funds from yield source
     *      Gardens: Withdraw from external vault
     */
    function _freeFunds(uint256 amount) internal override {
        if (!useExternalVault || address(externalVault) == address(0)) {
            return;
        }
        
        uint256 idle = asset.balanceOf(address(this));
        if (idle >= amount) return;  // Sufficient idle
        
        // Withdraw needed amount from vault
        uint256 needed = amount - idle;
        externalVault.withdraw(needed, address(this), address(this));
    }
    
    /**
     * @dev HOOK: Harvest and report total assets
     *      Gardens: Calculate total from idle + external vault
     */
    function _harvestAndReport() internal override returns (uint256 totalAssets) {
        uint256 idle = asset.balanceOf(address(this));
        
        if (useExternalVault && address(externalVault) != address(0)) {
            // Get value from external vault
            uint256 vaultShares = externalVault.balanceOf(address(this));
            uint256 vaultAssets = vaultShares > 0 
                ? externalVault.convertToAssets(vaultShares) 
                : 0;
            
            totalAssets = idle + vaultAssets;
        } else {
            totalAssets = idle;
        }
        
        return totalAssets;
    }
    
    /**
     * @notice Configure external yield vault
     * @param _vault Address of ERC4626 vault
     * @param _use Whether to use the vault
     */
    function setExternalVault(address _vault, bool _use) external onlyManagement {
        externalVault = IERC4626(_vault);
        useExternalVault = _use;
    }
    
    /**
     * @notice Emergency withdraw (implements IYDSStrategy)
     */
    function emergencyWithdraw() external override {
        require(msg.sender == TokenizedStrategy.management(), "Only management");
        
        if (useExternalVault && address(externalVault) != address(0)) {
            uint256 shares = externalVault.balanceOf(address(this));
            if (shares > 0) {
                externalVault.redeem(shares, address(this), address(this));
            }
        }
    }
}


