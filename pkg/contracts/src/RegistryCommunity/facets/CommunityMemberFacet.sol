// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {AccessControlUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";

import {ProxyOwnableUpgrader} from "../../ProxyOwnableUpgrader.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {ISafe} from "../../interfaces/ISafe.sol";
import {FAllo} from "../../interfaces/FAllo.sol";
import {IRegistryFactory} from "../../IRegistryFactory.sol";
import {CVStrategyV0_0} from "../../CVStrategy/CVStrategyV0_0.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";

struct Member {
    address member;
    uint256 stakedAmount;
    bool isRegistered;
}

/**
 * @title CommunityMemberFacet
 * @notice Facet containing member management functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunityV0_0
 *      CRITICAL: Must inherit from same base contracts as main contract for storage alignment
 */
contract CommunityMemberFacet is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
    using ERC165Checker for address;
    using SafeERC20 for IERC20;
    using Clone for address;

    /*|--------------------------------------------|*/
    /*|              CONSTANTS                     |*/
    /*|--------------------------------------------|*/
    string public constant VERSION = "0.0";
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 public constant PRECISION_SCALE = 10 ** 4;
    uint256 public constant MAX_FEE = 10 * PRECISION_SCALE;
    bytes32 public constant COUNCIL_MEMBER = keccak256("COUNCIL_MEMBER");

    /*|--------------------------------------------|*/
    /*|              STORAGE VARIABLES             |*/
    /*|  Must match RegistryCommunityV0_0 layout  |*/
    /*|--------------------------------------------|*/
    uint256 public registerStakeAmount;
    uint256 public communityFee;
    uint256 public cloneNonce;
    bytes32 public profileId;
    bool public isKickEnabled;
    address public feeReceiver;
    address public registryFactory;
    address public collateralVaultTemplate;
    address public strategyTemplate;
    address payable public pendingCouncilSafe;
    IRegistry public registry;
    IERC20 public gardenToken;
    ISafe public councilSafe;
    FAllo public allo;
    string public communityName;
    string public covenantIpfsHash;
    mapping(address strategy => bool isEnabled) public enabledStrategies;
    mapping(address strategy => mapping(address member => uint256 power)) public memberPowerInStrategy;
    mapping(address member => Member) public addressToMemberInfo;
    mapping(address member => address[] strategiesAddresses) public strategiesByMember;
    mapping(address member => mapping(address strategy => bool isActivated)) public memberActivatedInStrategies;
    address[] internal initialMembers;
    uint256 public totalMembers;

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event MemberRegisteredWithCovenant(address _member, uint256 _amountStaked, string _covenantSig);
    event MemberUnregistered(address _member, uint256 _amountReturned);
    event MemberKicked(address _member, address _transferAddress, uint256 _amountReturned);

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error UserNotInCouncil(address _user);
    error UserNotInRegistry();
    error KickNotEnabled();

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function onlyCouncilSafe() internal view {
        if (!hasRole(COUNCIL_MEMBER, msg.sender)) {
            revert UserNotInCouncil(msg.sender);
        }
    }

    function onlyRegistryMemberSender() internal view {
        if (!isMember(msg.sender)) {
            revert UserNotInRegistry();
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function isMember(address _member) public view returns (bool) {
        return addressToMemberInfo[_member].isRegistered;
    }

    function getBasisStakedAmount() external view returns (uint256) {
        return registerStakeAmount;
    }

    function getStakeAmountWithFees() public view returns (uint256) {
        uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
        uint256 gardensFeeAmount = (
            registerStakeAmount * IRegistryFactory(registryFactory).getProtocolFee(address(this))
        ) / (100 * PRECISION_SCALE);

        return registerStakeAmount + communityFeeAmount + gardensFeeAmount;
    }

    function stakeAndRegisterMember(string memory covenantSig) public {
        IRegistryFactory gardensFactory = IRegistryFactory(registryFactory);
        uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
        uint256 gardensFeeAmount =
            (registerStakeAmount * gardensFactory.getProtocolFee(address(this))) / (100 * PRECISION_SCALE);
        if (!isMember(msg.sender)) {
            addressToMemberInfo[msg.sender].isRegistered = true;

            addressToMemberInfo[msg.sender].stakedAmount = registerStakeAmount;

            gardenToken.safeTransferFrom(
                msg.sender, address(this), registerStakeAmount + communityFeeAmount + gardensFeeAmount
            );

            if (communityFeeAmount > 0) {
                gardenToken.safeTransfer(feeReceiver, communityFeeAmount);
            }
            if (gardensFeeAmount > 0) {
                gardenToken.safeTransfer(gardensFactory.getGardensFeeReceiver(), gardensFeeAmount);
            }
            totalMembers += 1;

            emit MemberRegisteredWithCovenant(msg.sender, registerStakeAmount, covenantSig);
        }
    }

    function unregisterMember() public {
        onlyRegistryMemberSender();
        address _member = msg.sender;
        deactivateAllStrategies(_member);
        Member memory member = addressToMemberInfo[_member];
        delete addressToMemberInfo[_member];
        delete strategiesByMember[_member];
        // In order to resync older contracts that skipped this counter until upgrade (community-params-editable)
        if (totalMembers > 0) {
            totalMembers -= 1;
        }
        gardenToken.safeTransfer(_member, member.stakedAmount);
        emit MemberUnregistered(_member, member.stakedAmount);
    }

    function kickMember(address _member, address _transferAddress) public {
        onlyCouncilSafe();
        if (!isKickEnabled) {
            revert KickNotEnabled();
        }
        if (!isMember(_member)) {
            revert UserNotInRegistry();
        }
        Member memory member = addressToMemberInfo[_member];
        deactivateAllStrategies(_member);
        delete addressToMemberInfo[_member];
        totalMembers -= 1;

        gardenToken.safeTransfer(_transferAddress, member.stakedAmount);
        emit MemberKicked(_member, _transferAddress, member.stakedAmount);
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function deactivateAllStrategies(address _member) internal {
        address[] memory memberStrategies = strategiesByMember[_member];
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            CVStrategyV0_0(payable(memberStrategies[i])).deactivatePoints(_member);
        }
    }
}
