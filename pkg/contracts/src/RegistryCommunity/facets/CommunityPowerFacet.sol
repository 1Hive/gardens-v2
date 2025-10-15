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
import {CVStrategyV0_0} from "../../CVStrategy/CVStrategyV0_0.sol";
import {PointSystem} from "../../CVStrategy/ICVStrategy.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";

struct Member {
    address member;
    uint256 stakedAmount;
    bool isRegistered;
}

/**
 * @title CommunityPowerFacet
 * @notice Facet containing power management functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunityV0_0
 *      CRITICAL: Must inherit from same base contracts as main contract for storage alignment
 */
contract CommunityPowerFacet is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
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
    event MemberActivatedStrategy(address _member, address _strategy, uint256 _pointsToIncrease);
    event MemberDeactivatedStrategy(address _member, address _strategy);
    event MemberPowerIncreased(address _member, uint256 _stakedAmount);
    event MemberPowerDecreased(address _member, uint256 _unstakedAmount);

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error UserNotInRegistry();
    error UserAlreadyActivated();
    error StrategyDisabled();
    error SenderNotStrategy();
    error DecreaseUnderMinimum();
    error CantDecreaseMoreThanPower(uint256 _decreaseAmount, uint256 _currentPower);

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function isMember(address _member) internal view returns (bool) {
        return addressToMemberInfo[_member].isRegistered;
    }

    function onlyRegistryMemberSender() internal view {
        if (!isMember(msg.sender)) {
            revert UserNotInRegistry();
        }
    }

    function onlyRegistryMemberAddress(address _sender) internal view {
        if (!isMember(_sender)) {
            revert UserNotInRegistry();
        }
    }

    function onlyStrategyEnabled(address _strategy) internal view {
        if (!enabledStrategies[_strategy]) {
            revert StrategyDisabled();
        }
    }

    function onlyStrategyAddress(address _sender, address _strategy) internal pure {
        if (_sender != _strategy) {
            revert SenderNotStrategy();
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function getMemberPowerInStrategy(address _member, address _strategy) public view returns (uint256) {
        return memberPowerInStrategy[_member][_strategy];
    }

    function getMemberStakedAmount(address _member) public view returns (uint256) {
        return addressToMemberInfo[_member].stakedAmount;
    }

    function activateMemberInStrategy(address _member, address _strategy) public {
        onlyRegistryMemberAddress(_member);
        onlyStrategyEnabled(_strategy);
        onlyStrategyAddress(msg.sender, _strategy);

        if (memberActivatedInStrategies[_member][_strategy]) {
            revert UserAlreadyActivated();
        }

        Member memory member = addressToMemberInfo[_member];

        uint256 totalStakedAmount = member.stakedAmount;
        uint256 pointsToIncrease = registerStakeAmount;

        if (CVStrategyV0_0(payable(_strategy)).getPointSystem() == PointSystem.Quadratic) {
            pointsToIncrease = CVStrategyV0_0(payable(_strategy)).increasePower(_member, 0);
        } else if (CVStrategyV0_0(payable(_strategy)).getPointSystem() != PointSystem.Fixed) {
            pointsToIncrease = CVStrategyV0_0(payable(_strategy)).increasePower(_member, totalStakedAmount);
        }

        memberPowerInStrategy[_member][_strategy] = pointsToIncrease; // can be all zero
        memberActivatedInStrategies[_member][_strategy] = true;

        strategiesByMember[_member].push(_strategy);

        emit MemberActivatedStrategy(_member, _strategy, pointsToIncrease);
    }

    function deactivateMemberInStrategy(address _member, address _strategy) public {
        if (!memberActivatedInStrategies[_member][_strategy]) {
            return;
        }

        onlyRegistryMemberAddress(_member);
        onlyStrategyAddress(msg.sender, _strategy);

        memberActivatedInStrategies[_member][_strategy] = false;
        memberPowerInStrategy[_member][_strategy] = 0;
        removeStrategyFromMember(_member, _strategy);
        emit MemberDeactivatedStrategy(_member, _strategy);
    }

    function increasePower(uint256 _amountStaked) public {
        onlyRegistryMemberSender();
        address member = msg.sender;
        uint256 pointsToIncrease;

        for (uint256 i = 0; i < strategiesByMember[member].length; i++) {
            pointsToIncrease =
                CVStrategyV0_0(payable(strategiesByMember[member][i])).increasePower(member, _amountStaked);
            if (pointsToIncrease != 0) {
                memberPowerInStrategy[member][strategiesByMember[member][i]] += pointsToIncrease;
            }
        }

        gardenToken.safeTransferFrom(member, address(this), _amountStaked);
        addressToMemberInfo[member].stakedAmount += _amountStaked;
        emit MemberPowerIncreased(member, _amountStaked);
    }

    function decreasePower(uint256 _amountUnstaked) public {
        onlyRegistryMemberSender();
        address member = msg.sender;
        address[] storage memberStrategies = strategiesByMember[member];

        uint256 pointsToDecrease;

        if (addressToMemberInfo[member].stakedAmount - _amountUnstaked < registerStakeAmount) {
            revert DecreaseUnderMinimum();
        }
        gardenToken.safeTransfer(member, _amountUnstaked);
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            address strategy = memberStrategies[i];
            pointsToDecrease = CVStrategyV0_0(payable(strategy)).decreasePower(member, _amountUnstaked);
            uint256 currentPower = memberPowerInStrategy[member][memberStrategies[i]];
            if (pointsToDecrease > currentPower) {
                revert CantDecreaseMoreThanPower(pointsToDecrease, currentPower);
            } else {
                memberPowerInStrategy[member][memberStrategies[i]] -= pointsToDecrease;
            }
        }
        addressToMemberInfo[member].stakedAmount -= _amountUnstaked;
        emit MemberPowerDecreased(member, _amountUnstaked);
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function removeStrategyFromMember(address _member, address _strategy) internal {
        address[] storage memberStrategies = strategiesByMember[_member];
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            if (memberStrategies[i] == _strategy) {
                memberStrategies[i] = memberStrategies[memberStrategies.length - 1];
                memberStrategies.pop();
            }
        }
    }
}
