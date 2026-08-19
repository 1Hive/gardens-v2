// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet} from "../CommunityBaseFacet.sol";
import {CommunityPendingParamsStorage, PendingCommunityParams} from "../CommunityPendingParamsStorage.sol";
import {ISafe} from "../../interfaces/ISafe.sol";

/// @notice Parameters for community configuration
struct CommunityParams {
    address councilSafe;
    address feeReceiver;
    uint256 communityFee;
    string communityName;
    uint256 registerStakeAmount;
    bool isKickEnabled;
    string covenantIpfsHash;
}

/**
 * @title CommunityAdminFacet
 * @notice Facet containing admin configuration functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunity
 *      CRITICAL: Inherits storage layout from CommunityBaseFacet
 */
contract CommunityAdminFacet is CommunityBaseFacet {
    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event CouncilSafeUpdated(address _safe);
    event CouncilSafeChangeStarted(address _safeOwner, address _newSafeOwner);
    event CommunityFeeUpdated(uint256 _newFee);
    event BasisStakedAmountUpdated(uint256 _newAmount);
    event CommunityNameUpdated(string _communityName);
    event CovenantIpfsHashUpdated(string _covenantIpfsHash);
    event KickEnabledUpdated(bool _isKickEnabled);
    event FeeReceiverChanged(address _feeReceiver);
    event CommunityArchived(bool _archived);
    event PendingCommunityParamsUpdated(
        uint8 indexed fields, uint256 registerStakeAmount, bool isKickEnabled, string covenantIpfsHash
    );
    event PendingCommunityParamsCleared(uint8 indexed clearedFields, uint8 indexed remainingFields);
    event PendingCommunityParamsApproved(uint8 indexed fields, address indexed approver);

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error OnlyEmptyCommunity(uint256 totalMembers);
    error UserNotInCouncil(address _user);
    error ValueCannotBeZero();
    error NewFeeGreaterThanMax();
    error SenderNotNewOwner();
    error NoPendingCommunityParams();
    error InvalidPendingCommunityParamsFields(uint8 fields, uint8 pendingFields);

    uint8 internal constant PENDING_REGISTER_STAKE_AMOUNT = 1 << 0;
    uint8 internal constant PENDING_KICK_ENABLED = 1 << 1;
    uint8 internal constant PENDING_COVENANT_IPFS_HASH = 1 << 2;
    uint8 internal constant ALL_PENDING_FIELDS =
        PENDING_REGISTER_STAKE_AMOUNT | PENDING_KICK_ENABLED | PENDING_COVENANT_IPFS_HASH;

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function onlyCouncilSafe() internal view {
        if (!hasRole(COUNCIL_MEMBER, msg.sender)) {
            revert UserNotInCouncil(msg.sender);
        }
    }

    function onlyEmptyCommunity() internal view {
        if (totalMembers > 0) {
            revert OnlyEmptyCommunity(totalMembers);
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    // Sig: 0xebd7dc52
    function isCouncilMember(address _member) public view returns (bool) {
        return hasRole(COUNCIL_MEMBER, _member);
    }

    // Sig: 0x1b71f0e4
    /// @dev Deprecated. Existing storage field is kept for compatibility but pool creation now uses
    ///      RegistryFactory.strategyTemplate().
    function setStrategyTemplate(address template) external {
        require(msg.sender == owner(), "Ownable: caller is not the owner");
        strategyTemplate = template;
    }

    // Sig: 0xb0d3713a
    function setCollateralVaultTemplate(address template) external {
        require(msg.sender == owner(), "Ownable: caller is not the owner");
        collateralVaultTemplate = template;
    }

    // Sig: 0x0b03bb9a
    function setArchived(bool _isArchived) external {
        if (msg.sig == bytes4(0)) revert();
        onlyCouncilSafe();
        emit CommunityArchived(_isArchived);
    }

    // Sig: 0x31f61bca
    function setBasisStakedAmount(uint256 _newAmount) public {
        if (msg.sig == bytes4(0)) revert();
        onlyCouncilSafe();
        onlyEmptyCommunity();
        registerStakeAmount = _newAmount;
        emit BasisStakedAmountUpdated(_newAmount);
        _clearPendingFields(PENDING_REGISTER_STAKE_AMOUNT);
    }

    // Sig: 0x0d12bbdb
    function setCommunityFee(uint256 _newCommunityFee) public {
        if (msg.sig == bytes4(0)) revert();
        onlyCouncilSafe();
        if (_newCommunityFee > MAX_FEE) {
            revert NewFeeGreaterThanMax();
        }
        communityFee = _newCommunityFee;
        emit CommunityFeeUpdated(_newCommunityFee);
    }

    // Sig: 0x397e2543
    function setCouncilSafe(address payable _safe) public {
        if (msg.sig == bytes4(0)) revert();
        onlyCouncilSafe();
        if (_safe == address(0)) {
            revert ValueCannotBeZero();
        }
        pendingCouncilSafe = _safe;
        emit CouncilSafeChangeStarted(address(councilSafe), pendingCouncilSafe);
    }

    // Sig: 0xb5058c50
    function acceptCouncilSafe() public {
        if (msg.sender != pendingCouncilSafe) {
            revert SenderNotNewOwner();
        }
        if (address(councilSafe) != pendingCouncilSafe) {
            _grantRole(COUNCIL_MEMBER, pendingCouncilSafe);
            _revokeRole(COUNCIL_MEMBER, address(councilSafe));
            councilSafe = ISafe(pendingCouncilSafe);
            emit CouncilSafeUpdated(address(councilSafe));
        }
        delete pendingCouncilSafe;
    }

    // Sig: 0xf2d774e7
    function setCommunityParams(CommunityParams memory _params) external {
        if (msg.sig == bytes4(0)) revert();
        onlyCouncilSafe();
        if (totalMembers == 0) {
            if (_params.registerStakeAmount != registerStakeAmount) {
                setBasisStakedAmount(_params.registerStakeAmount);
            }
            if (_params.isKickEnabled != isKickEnabled) {
                isKickEnabled = _params.isKickEnabled;
                emit KickEnabledUpdated(_params.isKickEnabled);
                _clearPendingFields(PENDING_KICK_ENABLED);
            }
            if (keccak256(bytes(_params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))) {
                covenantIpfsHash = _params.covenantIpfsHash;
                emit CovenantIpfsHashUpdated(_params.covenantIpfsHash);
                _clearPendingFields(PENDING_COVENANT_IPFS_HASH);
            }
        } else {
            _queueGuardedParams(_params);
        }
        if (keccak256(bytes(_params.communityName)) != keccak256(bytes(communityName))) {
            communityName = _params.communityName;
            emit CommunityNameUpdated(_params.communityName);
        }
        if (_params.communityFee != communityFee) {
            setCommunityFee(_params.communityFee);
        }
        if (_params.feeReceiver != feeReceiver) {
            feeReceiver = _params.feeReceiver;
            emit FeeReceiverChanged(_params.feeReceiver);
        }
        if (_params.councilSafe != address(0) && _params.councilSafe != address(councilSafe)) {
            setCouncilSafe(payable(_params.councilSafe));
        }
    }

    /// @notice Returns guarded community parameter changes awaiting owner approval.
    function getPendingCommunityParams() external view returns (PendingCommunityParams memory) {
        return CommunityPendingParamsStorage.layout().pending;
    }

    /// @notice Applies every pending guarded parameter, even while the community has members.
    /// @dev The authorized address is resolved through ProxyOwnableUpgrader.owner().
    function approvePendingCommunityParams() external {
        address resolvedOwner = owner();
        if (msg.sender != resolvedOwner) {
            revert CallerNotOwner(msg.sender, resolvedOwner);
        }

        CommunityPendingParamsStorage.Layout storage l = CommunityPendingParamsStorage.layout();
        PendingCommunityParams memory pending = l.pending;
        if (pending.fields == 0) {
            revert NoPendingCommunityParams();
        }

        delete l.pending;

        if (pending.fields & PENDING_REGISTER_STAKE_AMOUNT != 0) {
            registerStakeAmount = pending.registerStakeAmount;
            emit BasisStakedAmountUpdated(pending.registerStakeAmount);
        }
        if (pending.fields & PENDING_KICK_ENABLED != 0) {
            isKickEnabled = pending.isKickEnabled;
            emit KickEnabledUpdated(pending.isKickEnabled);
        }
        if (pending.fields & PENDING_COVENANT_IPFS_HASH != 0) {
            covenantIpfsHash = pending.covenantIpfsHash;
            emit CovenantIpfsHashUpdated(pending.covenantIpfsHash);
        }

        emit PendingCommunityParamsApproved(pending.fields, msg.sender);
    }

    /// @notice Cancels selected pending guarded changes.
    /// @param fields Bit mask: registration stake = 1, kick enabled = 2, covenant = 4.
    function cancelPendingCommunityParams(uint8 fields) external {
        onlyCouncilSafe();
        PendingCommunityParams storage pending = CommunityPendingParamsStorage.layout().pending;
        if (fields == 0 || fields & ~ALL_PENDING_FIELDS != 0 || fields & pending.fields != fields) {
            revert InvalidPendingCommunityParamsFields(fields, pending.fields);
        }
        _clearPendingFields(fields);
    }

    function _queueGuardedParams(CommunityParams memory params) internal {
        PendingCommunityParams storage pending = CommunityPendingParamsStorage.layout().pending;
        bool changed;

        if (params.registerStakeAmount != registerStakeAmount) {
            if (
                pending.fields & PENDING_REGISTER_STAKE_AMOUNT == 0
                    || pending.registerStakeAmount != params.registerStakeAmount
            ) {
                pending.registerStakeAmount = params.registerStakeAmount;
                pending.fields |= PENDING_REGISTER_STAKE_AMOUNT;
                changed = true;
            }
        }

        if (params.isKickEnabled != isKickEnabled) {
            if (pending.fields & PENDING_KICK_ENABLED == 0 || pending.isKickEnabled != params.isKickEnabled) {
                pending.isKickEnabled = params.isKickEnabled;
                pending.fields |= PENDING_KICK_ENABLED;
                changed = true;
            }
        }

        if (keccak256(bytes(params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))) {
            if (
                pending.fields & PENDING_COVENANT_IPFS_HASH == 0
                    || keccak256(bytes(pending.covenantIpfsHash)) != keccak256(bytes(params.covenantIpfsHash))
            ) {
                pending.covenantIpfsHash = params.covenantIpfsHash;
                pending.fields |= PENDING_COVENANT_IPFS_HASH;
                changed = true;
            }
        }

        if (changed) {
            emit PendingCommunityParamsUpdated(
                pending.fields, pending.registerStakeAmount, pending.isKickEnabled, pending.covenantIpfsHash
            );
        }
    }

    function _clearPendingFields(uint8 fields) internal {
        PendingCommunityParams storage pending = CommunityPendingParamsStorage.layout().pending;
        uint8 clearedFields = fields & pending.fields;
        if (clearedFields == 0) return;

        if (clearedFields & PENDING_REGISTER_STAKE_AMOUNT != 0) {
            delete pending.registerStakeAmount;
        }
        if (clearedFields & PENDING_KICK_ENABLED != 0) {
            delete pending.isKickEnabled;
        }
        if (clearedFields & PENDING_COVENANT_IPFS_HASH != 0) {
            delete pending.covenantIpfsHash;
        }
        pending.fields &= ~clearedFields;
        emit PendingCommunityParamsCleared(clearedFields, pending.fields);
    }
}
