// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "./ProxyOwnableUpgrader.sol";

// Interfaces
import {IStrategy, IAllo} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Libraries
// import {BaseStrategy, IAllo} from "allo-v2-contracts/strategies/BaseStrategy.sol";
import {Transfer} from "allo-v2-contracts/core/libraries/Transfer.sol";
import {Errors} from "allo-v2-contracts/core/libraries/Errors.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/// @title BaseStrategy Contract
/// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
/// @notice This contract is the base contract for all strategies
/// @dev This contract is implemented by all strategies.

abstract contract BaseStrategyUpgradeable is ProxyOwnableUpgrader, IStrategy, Transfer, Errors {
    /// ==========================
    /// === Storage Variables ====
    /// ==========================

    IAllo internal allo;
    bytes32 internal strategyId;
    bool internal poolActive;
    uint256 internal poolId;
    uint256 internal poolAmount;

    /// ====================================
    /// ========== Constructor =============
    /// ====================================

    /// @notice Constructor to set the Allo contract and "strategyId'.
    /// @notice `init` here its the initialize for upgradable contracts, different from `initialize()` that its used for Allo
    /// @param _allo Address of the Allo contract.
    /// @param _name Name of the strategy
    /// @param _owner Address of the owner of the strategy

    function init(address _allo, string memory _name, address _owner) public onlyInitializing {
        super.initialize(_owner);
        allo = IAllo(_allo);
        strategyId = keccak256(abi.encode(_name));
    }

    // function initialize(address _allo, string memory _name) external onlyAllo {
    //     allo = IAllo(_allo);
    //     strategyId = keccak256(abi.encode(_name));
    // }

    /// ====================================
    /// =========== Modifiers ==============
    /// ====================================

    /// @notice Modifier to check if the 'msg.sender' is the Allo contract.
    /// @dev Reverts if the 'msg.sender' is not the Allo contract.
    modifier onlyAllo() {
        if (msg.sig == bytes4(0)) revert(); _checkOnlyAllo();
        _;
    }

    /// @notice Modifier to check if the '_sender' is a pool manager.
    /// @dev Reverts if the '_sender' is not a pool manager.
    /// @param _sender The address to check if they are a pool manager
    modifier onlyPoolManager(address _sender) {
        if (msg.sig == bytes4(0)) revert(); _checkOnlyPoolManager(_sender);
        _;
    }

    /// @notice Modifier to check if the pool is active.
    /// @dev Reverts if the pool is not active.
    modifier onlyActivePool() {
        if (msg.sig == bytes4(0)) revert(); _checkOnlyActivePool();
        _;
    }

    /// @notice Modifier to check if the pool is inactive.
    /// @dev Reverts if the pool is active.
    modifier onlyInactivePool() {
        if (msg.sig == bytes4(0)) revert(); _checkInactivePool();
        _;
    }

    /// @notice Modifier to check if the pool is initialized.
    /// @dev Reverts if the pool is not initialized.
    modifier onlyInitialized() {
        if (msg.sig == bytes4(0)) revert(); _checkOnlyInitialized();
        _;
    }

    /// ================================
    /// =========== Views ==============
    /// ================================

    /// @notice Getter for the 'Allo' contract.
    /// @return The Allo contract
    function getAllo() external view override returns (IAllo) {
        return allo;
    }

    /// @notice Getter for the 'poolId'.
    /// @return The ID of the pool
    function getPoolId() external view override returns (uint256) {
        return poolId;
    }

    // /// @notice Getter for the 'strategyId'.
    // /// @return The ID of the strategy
    // function getStrategyId() external view override returns (bytes32) {
    //     return strategyId;
    // }

    /// @notice Getter for whether or not the pool is active.
    /// @return 'true' if the pool is active, otherwise 'false'
    function isPoolActive() external view override returns (bool) {
        return _isPoolActive();
    }

    /// ====================================
    /// =========== Functions ==============
    /// ====================================

    /// @notice Initializes the 'Basetrategy'.
    /// @dev Will revert if the poolId is invalid or already initialized
    /// @param _poolId ID of the pool
    function __BaseStrategy_init(uint256 _poolId) internal onlyAllo {
        //@todo rename init to InitAllo
        // check if pool ID is not initialized already, if it is, revert
        if (poolId != 0) revert ALREADY_INITIALIZED();

        // check if pool ID is valid and not zero (0), if it is, revert
        if (_poolId == 0) revert INVALID();
        poolId = _poolId;
    }

    // /// @notice Increases the pool amount.
    // /// @dev Increases the 'poolAmount' by '_amount'. Only 'Allo' contract can call this.
    // /// @param _amount The amount to increase the pool by
    // function increasePoolAmount(uint256 _amount) external override onlyAllo {
    //     _beforeIncreasePoolAmount(_amount);
    //     poolAmount += _amount;
    //     _afterIncreasePoolAmount(_amount);
    // }

    /// @notice Registers a recipient.
    /// @dev Registers a recipient and returns the ID of the recipient. The encoded '_data' will be determined by the
    ///      strategy implementation. Only 'Allo' contract can call this when it is initialized.
    /// @param _data The data to use to register the recipient
    /// @param _sender The address of the sender
    /// @return recipientId The recipientId
    // function registerRecipient(bytes memory _data, address _sender)
    //     external
    //     payable
    //     onlyAllo
    //     onlyInitialized
    //     returns (address recipientId)
    // {
    //     _beforeRegisterRecipient(_data, _sender);
    //     recipientId = _registerRecipient(_data, _sender);
    //     _afterRegisterRecipient(_data, _sender);
    // }

    /// @notice Allocates to a recipient.
    /// @dev The encoded '_data' will be determined by the strategy implementation. Only 'Allo' contract can
    ///      call this when it is initialized.
    /// @param _data The data to use to allocate to the recipient
    /// @param _sender The address of the sender
    // function allocate(bytes memory _data, address _sender) external payable onlyAllo onlyInitialized {
    //     _beforeAllocate(_data, _sender);
    //     _allocate(_data, _sender);
    //     _afterAllocate(_data, _sender);
    // }

    /// @notice Distributes funds (tokens) to recipients.
    /// @dev The encoded '_data' will be determined by the strategy implementation. Only 'Allo' contract can
    ///      call this when it is initialized.
    /// @param _recipientIds The IDs of the recipients
    /// @param _data The data to use to distribute to the recipients
    /// @param _sender The address of the sender
    // function distribute(address[] memory _recipientIds, bytes memory _data, address _sender)
    //     external
    //     onlyAllo
    //     onlyInitialized
    // {
    //     _beforeDistribute(_recipientIds, _data, _sender);
    //     _distribute(_recipientIds, _data, _sender);
    //     _afterDistribute(_recipientIds, _data, _sender);
    // }

    /// @notice Gets the payout summary for recipients.
    /// @dev The encoded '_data' will be determined by the strategy implementation.
    /// @param _recipientIds The IDs of the recipients
    /// @param _data The data to use to get the payout summary for the recipients
    // function getPayouts(address[] memory _recipientIds, bytes[] memory _data)
    //     external
    //     view
    //     override
    //     returns (PayoutSummary[] memory payouts)
    // {
    //     uint256 recipientLength = _recipientIds.length;
    //     // check if the length of the recipient IDs and data arrays are equal, if they are not, revert
    //     if (recipientLength != _data.length) revert ARRAY_MISMATCH();

    //     payouts = new PayoutSummary[](recipientLength);
    //     for (uint256 i; i < recipientLength;) {
    //         payouts[i] = _getPayout(_recipientIds[i], _data[i]);
    //         unchecked {
    //             i++;
    //         }
    //     }
    // }

    // /// @notice Checks if the '_allocator' is a valid allocator.
    // /// @dev How the allocator is determined is up to the strategy implementation.
    // /// @param _allocator The address to check if it is a valid allocator for the strategy.
    // /// @return 'true' if the address is a valid allocator, 'false' otherwise
    // function isValidAllocator(address _allocator) external view  override returns (bool) {
    //     return _isValidAllocator(_allocator);
    // }

    /// ====================================
    /// ============ Internal ==============
    /// ====================================

    /// @notice Checks if the 'msg.sender' is the Allo contract.
    /// @dev Reverts if the 'msg.sender' is not the Allo contract.
    function _checkOnlyAllo() internal view {
        if (msg.sender != address(allo)) revert UNAUTHORIZED();
    }

    /// @notice Checks if the '_sender' is a pool manager.
    /// @dev Reverts if the '_sender' is not a pool manager.
    /// @param _sender The address to check if they are a pool manager
    function _checkOnlyPoolManager(address _sender) internal view {
        if (!allo.isPoolManager(poolId, _sender)) revert UNAUTHORIZED();
    }

    /// @notice Checks if the pool is active.
    /// @dev Reverts if the pool is not active.
    function _checkOnlyActivePool() internal view {
        if (!poolActive) revert POOL_INACTIVE();
    }

    /// @notice Checks if the pool is inactive.
    /// @dev Reverts if the pool is active.
    function _checkInactivePool() internal view {
        if (poolActive) revert POOL_ACTIVE();
    }

    /// @notice Checks if the pool is initialized.
    /// @dev Reverts if the pool is not initialized.
    function _checkOnlyInitialized() internal view {
        if (poolId == 0) revert NOT_INITIALIZED();
    }

    /// @notice Set the pool to active or inactive status.
    /// @dev This will emit a 'PoolActive()' event. Used by the strategy implementation.
    /// @param _active The status to set, 'true' means active, 'false' means inactive
    function _setPoolActive(bool _active) internal {
        poolActive = _active;
        emit PoolActive(_active);
    }

    /// @notice Checks if the pool is active.
    /// @dev Used by the strategy implementation.
    /// @return 'true' if the pool is active, otherwise 'false'
    function _isPoolActive() internal view returns (bool) {
        return poolActive;
    }

    /// @notice Checks if the allocator is valid
    /// @param _allocator The allocator address
    /// @return 'true' if the allocator is valid, otherwise 'false'
    // function _isValidAllocator(address _allocator) internal view returns (bool);

    /// @notice This will register a recipient, set their status (and any other strategy specific values), and
    ///         return the ID of the recipient.
    /// @dev Able to change status all the way up to Accepted, or to Pending and if there are more steps, additional
    ///      functions should be added to allow the owner to check this. The owner could also check attestations directly
    ///      and then Accept for instance.
    /// @param _data The data to use to register the recipient
    /// @param _sender The address of the sender
    /// @return The ID of the recipient
    // function _registerRecipient(bytes memory _data, address _sender) internal virtual returns (address);

    /// @notice This will allocate to a recipient.
    /// @dev The encoded '_data' will be determined by the strategy implementation.
    /// @param _data The data to use to allocate to the recipient
    /// @param _sender The address of the sender
    // function _allocate(bytes memory _data, address _sender) internal virtual;

    /// @notice This will distribute funds (tokens) to recipients.
    /// @dev most strategies will track a TOTAL amount per recipient, and a PAID amount, and pay the difference
    /// this contract will need to track the amount paid already, so that it doesn't double pay.
    /// @param _recipientIds The ids of the recipients to distribute to
    /// @param _data Data required will depend on the strategy implementation
    /// @param _sender The address of the sender
    // function _distribute(address[] memory _recipientIds, bytes memory _data, address _sender) internal virtual;

    /// @notice This will get the payout summary for a recipient.
    /// @dev The encoded '_data' will be determined by the strategy implementation.
    /// @param _recipientId The ID of the recipient
    /// @param _data The data to use to get the payout summary for the recipient
    /// @return The payout summary for the recipient
    // function _getPayout(address _recipientId, bytes memory _data)
    //     internal
    //     view
    //     virtual
    //     returns (PayoutSummary memory);

    // /// @notice This will get the status of a recipient.
    // /// @param _recipientId The ID of the recipient
    // /// @return The status of the recipient
    // // simply returns the status of a recipient
    // // probably tracked in a mapping, but will depend on the implementation
    // // for example, the OpenSelfRegistration only maps users to bool, and then assumes Accepted for those
    // // since there is no need for Pending or Rejected
    // function getRecipientStatus(address _recipientId) external pure  returns (Status) {
    //     // surpressStateMutabilityWarning;
    //     // return _recipientId == address(0) ? Status.Rejected : Status.Accepted;
    // }

    /// ===================================
    /// ============== Hooks ==============
    /// ===================================

    /// @notice Hook called before increasing the pool amount.
    /// @param _amount The amount to increase the pool by
    // function _beforeIncreasePoolAmount(uint256 _amount) internal  {}

    /// @notice Hook called after increasing the pool amount.
    /// @param _amount The amount to increase the pool by
    // function _afterIncreasePoolAmount(uint256 _amount) internal  {}

    /// @notice Hook called before registering a recipient.
    /// @param _data The data to use to register the recipient
    /// @param _sender The address of the sender
    // function _beforeRegisterRecipient(bytes memory _data, address _sender) internal {}

    /// @notice Hook called after registering a recipient.
    /// @param _data The data to use to register the recipient
    /// @param _sender The address of the sender
    // function _afterRegisterRecipient(bytes memory _data, address _sender) internal {}

    /// @notice Hook called before allocating to a recipient.
    /// @param _data The data to use to allocate to the recipient
    /// @param _sender The address of the sender
    // function _beforeAllocate(bytes memory _data, address _sender) internal virtual {}

    /// @notice Hook called after allocating to a recipient.
    /// @param _data The data to use to allocate to the recipient
    /// @param _sender The address of the sender
    // function _afterAllocate(bytes memory _data, address _sender) internal {}

    /// @notice Hook called before distributing funds (tokens) to recipients.
    /// @param _recipientIds The IDs of the recipients
    /// @param _data The data to use to distribute to the recipients
    /// @param _sender The address of the sender
    // function _beforeDistribute(address[] memory _recipientIds, bytes memory _data, address _sender) internal virtual {}

    /// @notice Hook called after distributing funds (tokens) to recipients.
    /// @param _recipientIds The IDs of the recipients
    /// @param _data The data to use to distribute to the recipients
    /// @param _sender The address of the sender
    // function _afterDistribute(address[] memory _recipientIds, bytes memory _data, address _sender) internal {}
}
