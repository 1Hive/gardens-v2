// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
// Taking 2 steps transfers from: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable2Step.sol

contract ProxyOwner is OwnableUpgradeable, UUPSUpgradeable {
    address public pendingOwner;
    address public upgradeAccess;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event UpgradeAccessGranted(address indexed owner, address indexed upgradeWallet);
    event UpgradeAccessRenounced(address indexed upgradeWallet);
    event UpgradeAccessReclaimed(address indexed owner, address indexed previousUpgradeWallet);

    error OwnableUnauthorizedAccount(address account);

    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        _transferOwnership(initialOwner);
    }

    function proxyOwner() public view returns (address) {
        return OwnableUpgradeable.owner();
    }

    function mainOwner() public view returns (address) {
        return proxyOwner();
    }

    function owner() public view virtual override returns (address) {
        if (upgradeAccess != address(0)) {
            return upgradeAccess;
        }
        return proxyOwner();
    }

    /**
     * @dev Starts the ownership transfer of the contract to a new account. Replaces the pending transfer if there is one.
     * Can only be called by the current owner.
     *
     * Setting `newOwner` to the zero address is allowed; this can be used to cancel an initiated ownership transfer.
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`) and deletes any pending owner.
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual override {
        delete pendingOwner;
        delete upgradeAccess;
        super._transferOwnership(newOwner);
    }

    /**
     * @dev The new owner accepts the ownership transfer.
     */
    function acceptOwnership() public virtual {
        address sender = _msgSender();
        if (pendingOwner != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        _transferOwnership(sender);
    }

    function grantUpgradeAccess(address upgradeWallet) external onlyOwner {
        upgradeAccess = upgradeWallet;
        emit UpgradeAccessGranted(_msgSender(), upgradeWallet);
    }

    function renounceUpgradeAccess() external {
        address sender = _msgSender();
        if (upgradeAccess != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        delete upgradeAccess;
        emit UpgradeAccessRenounced(sender);
    }

    function reclaimUpgradeAccess() external onlyOwner {
        address previousUpgradeWallet = upgradeAccess;
        delete upgradeAccess;
        emit UpgradeAccessReclaimed(_msgSender(), previousUpgradeWallet);
    }

    function _checkOwner() internal view virtual override {
        if (proxyOwner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}
}
