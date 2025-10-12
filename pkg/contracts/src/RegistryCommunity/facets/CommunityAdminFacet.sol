// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityStorage} from "../CommunityStorage.sol";
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
 * @dev This facet is called via delegatecall from RegistryCommunityV0_0
 *      CRITICAL: Storage layout is inherited from CommunityStorage base contract
 */
contract CommunityAdminFacet is CommunityStorage {
    /*|--------------------------------------------|*/
    /*|              CONSTANTS                     |*/
    /*|--------------------------------------------|*/
    uint256 public constant PRECISION_SCALE = 10 ** 4;
    uint256 public constant MAX_FEE = 10 * PRECISION_SCALE;
    bytes32 public constant COUNCIL_MEMBER = keccak256("COUNCIL_MEMBER");

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
    function hasRole(bytes32 role, address account) internal view returns (bool) {
        return _roles[role][account];
    }

    function grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) internal {
        _roles[role][account] = false;
    }

    function owner() internal view returns (address) {
        return _owner;
    }

    function onlyOwner() internal view {
        require(msg.sender == owner(), "Ownable: caller is not the owner");
    }

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

    function isCouncilMember(address _member) public view returns (bool) {
        return hasRole(COUNCIL_MEMBER, _member);
    }

    function setStrategyTemplate(address template) external {
        onlyOwner();
        strategyTemplate = template;
    }

    function setCollateralVaultTemplate(address template) external {
        onlyOwner();
        collateralVaultTemplate = template;
    }

    function setArchived(bool _isArchived) external {
        onlyCouncilSafe();
        emit CommunityArchived(_isArchived);
    }

    function setBasisStakedAmount(uint256 _newAmount) public {
        onlyCouncilSafe();
        onlyEmptyCommunity();
        registerStakeAmount = _newAmount;
        emit BasisStakedAmountUpdated(_newAmount);
    }

    function setCommunityFee(uint256 _newCommunityFee) public {
        onlyCouncilSafe();
        if (_newCommunityFee > MAX_FEE) {
            revert NewFeeGreaterThanMax();
        }
        communityFee = _newCommunityFee;
        emit CommunityFeeUpdated(_newCommunityFee);
    }

    function setCouncilSafe(address payable _safe) public {
        onlyCouncilSafe();
        pendingCouncilSafe = _safe;
        emit CouncilSafeChangeStarted(address(councilSafe), pendingCouncilSafe);
    }

    function acceptCouncilSafe() public {
        if (msg.sender != pendingCouncilSafe) {
            revert SenderNotNewOwner();
        }
        grantRole(COUNCIL_MEMBER, pendingCouncilSafe);
        revokeRole(COUNCIL_MEMBER, address(councilSafe));
        councilSafe = ISafe(pendingCouncilSafe);
        delete pendingCouncilSafe;
        emit CouncilSafeUpdated(address(councilSafe));
    }

    function setCommunityParams(CommunityParams memory _params) external {
        onlyCouncilSafe();
        if (
            _params.registerStakeAmount != registerStakeAmount || _params.isKickEnabled != isKickEnabled
                || keccak256(bytes(_params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))
        ) {
            onlyEmptyCommunity();
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
