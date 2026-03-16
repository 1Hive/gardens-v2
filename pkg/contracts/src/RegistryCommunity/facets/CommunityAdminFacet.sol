// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet} from "../CommunityBaseFacet.sol";
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

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error OnlyEmptyCommunity(uint256 totalMembers);
    error UserNotInCouncil(address _user);
    error ValueCannotBeZero();
    error NewFeeGreaterThanMax();
    error SenderNotNewOwner();

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
    function setStrategyTemplate(address template) external {
        require(msg.sender == owner(), "Ownable: caller is not the owner");
        strategyTemplate = template;
    }

    // Sig: 0xb0d3713a
    function setCollateralVaultTemplate(address template) external {
        require(msg.sender == owner(), "Ownable: caller is not the owner");
        collateralVaultTemplate = template; }

    // Sig: 0x0b03bb9a
    function setArchived(bool _isArchived) external { if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe(); emit CommunityArchived(_isArchived); }

    // Sig: 0x31f61bca
    function setBasisStakedAmount(uint256 _newAmount) public {
        if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe(); onlyEmptyCommunity();
        registerStakeAmount = _newAmount; emit BasisStakedAmountUpdated(_newAmount);
    }

    // Sig: 0x0d12bbdb
    function setCommunityFee(uint256 _newCommunityFee) public {
        if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe();
        if (_newCommunityFee > MAX_FEE) {
            revert NewFeeGreaterThanMax();
        }
        communityFee = _newCommunityFee; emit CommunityFeeUpdated(_newCommunityFee);
    }

    // Sig: 0x397e2543
    function setCouncilSafe(address payable _safe) public {
        if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe();
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
        _grantRole(COUNCIL_MEMBER, pendingCouncilSafe); _revokeRole(COUNCIL_MEMBER, address(councilSafe));
        councilSafe = ISafe(pendingCouncilSafe); delete pendingCouncilSafe; emit CouncilSafeUpdated(address(councilSafe)); }

    // Sig: 0xf2d774e7
    function setCommunityParams(CommunityParams memory _params) external {
        if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe();
        if (
            _params.registerStakeAmount != registerStakeAmount || _params.isKickEnabled != isKickEnabled
                || keccak256(bytes(_params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))
        ) {
            if (msg.sig == bytes4(0)) revert(); onlyEmptyCommunity();
            if (_params.registerStakeAmount != registerStakeAmount) {
                setBasisStakedAmount(_params.registerStakeAmount);
            }
            if (_params.isKickEnabled != isKickEnabled) {
                isKickEnabled = _params.isKickEnabled;
                emit KickEnabledUpdated(_params.isKickEnabled);
            }
            if (keccak256(bytes(_params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))) {
                covenantIpfsHash = _params.covenantIpfsHash;
                emit CovenantIpfsHashUpdated(_params.covenantIpfsHash);
            }
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
        if (_params.councilSafe != address(0)) {
            setCouncilSafe(payable(_params.councilSafe));
        }
    }
}
