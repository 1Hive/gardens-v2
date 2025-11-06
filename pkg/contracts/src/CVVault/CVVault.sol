// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";
import {ERC20Upgradeable} from "openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import {ERC4626Upgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {IERC20MetadataUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";

import {ICVVault} from "../interfaces/ICVVault.sol";
import {IVotingPowerRegistry} from "../interfaces/IVotingPowerRegistry.sol";
import {ISafe} from "../interfaces/ISafe.sol";

/**
 * @title CVVault
 * @notice Minimal ERC-4626 vault used for Yield Distribution pools. Tracks depositor shares as conviction voting power.
 */
contract CVVault is
    Initializable,
    ERC20Upgradeable,
    ERC4626Upgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    ICVVault
{
    using SafeERC20 for IERC20;

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/

    error StrategyNotConfigured();
    error StrategyMismatch();
    error MemberRequired();

    /*|--------------------------------------------|*/
    /*|              ROLES                         |*/
    /*|--------------------------------------------|*/

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /*|--------------------------------------------|*/
    /*|              STORAGE                       |*/
    /*|--------------------------------------------|*/

    address private _strategy;
    bool private _strategyEnabled;
    ISafe private _councilSafe;

    uint256 private _totalPrincipal;
    uint256 private _basisAmount;

    mapping(address => bool) private _isMember;
    mapping(address => uint256) private _memberPrincipal;
    mapping(address => mapping(address => bool)) private _memberActivated;

    /*|--------------------------------------------|*/
    /*|              INITIALIZER                   |*/
    /*|--------------------------------------------|*/

    function initialize(
        IERC20 asset_,
        string calldata name_,
        string calldata symbol_,
        address manager_,
        ISafe councilSafe_,
        uint256 basisAmount_,
        address strategy_,
        bool strategyEnabled_
    ) external initializer {
        if (address(asset_) == address(0)) {
            revert();
        }
        __ERC20_init(name_, symbol_);
        __ERC4626_init(IERC20MetadataUpgradeable(address(asset_)));
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, manager_);
        _grantRole(MANAGER_ROLE, manager_);

        _councilSafe = councilSafe_;
        _strategy = strategy_;
        _strategyEnabled = strategyEnabled_;
        _basisAmount = basisAmount_ == 0 ? 1e18 : basisAmount_;
    }

    /*|--------------------------------------------|*/
    /*|              VIEW FUNCTIONS                |*/
    /*|--------------------------------------------|*/

    function strategy() external view override returns (address) {
        return _strategy;
    }

    function totalPrincipal() external view override returns (uint256) {
        return _totalPrincipal;
    }

    function totalAssets() public view override(ERC4626Upgradeable) returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    /*|--------------------------------------------|*/
    /*|              ERC-4626 HOOKS                |*/
    /*|--------------------------------------------|*/

    function deposit(uint256 assets, address receiver)
        public
        override(ERC4626Upgradeable)
        nonReentrant
        returns (uint256 shares)
    {
        shares = super.deposit(assets, receiver);
        _afterDeposit(receiver, assets);
    }

    function mint(uint256 shares, address receiver)
        public
        override(ERC4626Upgradeable)
        nonReentrant
        returns (uint256 assets)
    {
        assets = super.mint(shares, receiver);
        _afterDeposit(receiver, assets);
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override(ERC4626Upgradeable)
        nonReentrant
        returns (uint256 shares)
    {
        shares = super.withdraw(assets, receiver, owner);
        _afterWithdraw(owner, assets);
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override(ERC4626Upgradeable)
        nonReentrant
        returns (uint256 assets)
    {
        assets = super.redeem(shares, receiver, owner);
        _afterWithdraw(owner, assets);
    }

    function _afterDeposit(address receiver, uint256 assets) internal {
        if (assets > 0) {
            _totalPrincipal += assets;
            _memberPrincipal[receiver] += assets;
            _isMember[receiver] = true;
        }
    }

    function _afterWithdraw(address owner, uint256 assets) internal {
        if (assets > 0) {
            uint256 principal = _memberPrincipal[owner];
            _memberPrincipal[owner] = principal > assets ? principal - assets : 0;
            _totalPrincipal = _totalPrincipal > assets ? _totalPrincipal - assets : 0;
        }
        if (balanceOf(owner) == 0) {
            _isMember[owner] = false;
            if (_memberActivated[owner][_strategy]) {
                _memberActivated[owner][_strategy] = false;
            }
        }
    }

    /*|--------------------------------------------|*/
    /*|              HARVEST LOGIC                 |*/
    /*|--------------------------------------------|*/

    function harvest(address receiver) external override nonReentrant returns (uint256 harvestedAmount) {
        if (_strategy == address(0) || !_strategyEnabled) {
            revert StrategyNotConfigured();
        }
        if (receiver != _strategy) {
            revert StrategyMismatch();
        }

        uint256 currentAssets = totalAssets();
        if (currentAssets <= _totalPrincipal) {
            return 0;
        }

        harvestedAmount = currentAssets - _totalPrincipal;
        IERC20(asset()).safeTransfer(receiver, harvestedAmount);

        emit Harvested(msg.sender, receiver, harvestedAmount);
    }

    /*|--------------------------------------------|*/
    /*|         IVotingPowerRegistry LOGIC         |*/
    /*|--------------------------------------------|*/

    function isMember(address account) external view override returns (bool) {
        return _isMember[account] || balanceOf(account) > 0;
    }

    function onlyStrategyEnabled(address strategy_) external view override {
        if (strategy_ != _strategy || !_strategyEnabled) {
            revert StrategyNotConfigured();
        }
    }

    function hasRole(bytes32 role, address account)
        public
        view
        override(AccessControlUpgradeable, IVotingPowerRegistry)
        returns (bool)
    {
        return super.hasRole(role, account);
    }

    function grantRole(bytes32 role, address account)
        public
        override(AccessControlUpgradeable, IVotingPowerRegistry)
        onlyRole(getRoleAdmin(role))
    {
        super.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account)
        public
        override(AccessControlUpgradeable, IVotingPowerRegistry)
        onlyRole(getRoleAdmin(role))
    {
        super.revokeRole(role, account);
    }

    function councilSafe() external view override returns (ISafe) {
        return _councilSafe;
    }

    function activateMemberInStrategy(address member, address strategy_) external override {
        if (_strategy == address(0) || !_strategyEnabled) {
            revert StrategyNotConfigured();
        }
        if (msg.sender != _strategy || strategy_ != _strategy) {
            revert StrategyMismatch();
        }
        if (!(_isMember[member] || balanceOf(member) > 0)) {
            revert MemberRequired();
        }
        _memberActivated[member][strategy_] = true;
    }

    function deactivateMemberInStrategy(address member, address strategy_) external override {
        if (msg.sender != _strategy || strategy_ != _strategy) {
            revert StrategyMismatch();
        }
        _memberActivated[member][strategy_] = false;
    }

    function memberActivatedInStrategies(address member, address strategy_) external view override returns (bool) {
        return _memberActivated[member][strategy_];
    }

    function getMemberPowerInStrategy(address member, address strategy_) external view override returns (uint256) {
        if (strategy_ != _strategy || !_strategyEnabled) {
            return 0;
        }
        return balanceOf(member);
    }

    function getMemberStakedAmount(address member) external view override returns (uint256) {
        return _memberPrincipal[member];
    }

    function getBasisStakedAmount() external view override returns (uint256) {
        return _basisAmount;
    }

    function governanceToken() external view override returns (IERC20) {
        return IERC20(asset());
    }

    function configureAllowlist(bytes32 role, bytes32 adminRole) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRoleAdmin(role, adminRole);
    }

    function decimals()
        public
        view
        override(ERC20Upgradeable, ERC4626Upgradeable)
        returns (uint8)
    {
        return ERC4626Upgradeable.decimals();
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
