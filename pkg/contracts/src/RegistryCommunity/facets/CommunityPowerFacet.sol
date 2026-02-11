// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet, Member} from "../CommunityBaseFacet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {CVStrategy} from "../../CVStrategy/CVStrategy.sol";
import {PointSystem} from "../../CVStrategy/ICVStrategy.sol";

/**
 * @title CommunityPowerFacet
 * @notice Facet containing power management functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunity
 *      CRITICAL: Inherits storage layout from CommunityBaseFacet
 */
contract CommunityPowerFacet is CommunityBaseFacet {
    using SafeERC20 for IERC20;

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error UserNotInRegistry(); // 0x6a5cfb6d
    error UserAlreadyActivated(); // 0xd5b9bc96
    error StrategyDisabled(); // 0x46c26e4b
    error SenderNotStrategy(); // 0xbbe79611
    error DecreaseUnderMinimum(); // 0x9c47d02e
    error CantDecreaseMoreThanPower(uint256 _decreaseAmount, uint256 _currentPower); // 0x8a11f318
    error PointsDeactivated(); // 0xd4d3290e

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/

    event MemberActivatedStrategy(address _member, address _strategy, uint256 _pointsToIncrease);
    event MemberDeactivatedStrategy(address _member, address _strategy);
    event MemberPowerIncreased(address _member, uint256 _stakedAmount);
    event MemberPowerDecreased(address _member, uint256 _unstakedAmount);

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
        if (!isMember(_sender)) { revert UserNotInRegistry(); }
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

    // Sig: 0xeb5cbe43
    function ercAddress() public view returns (address) {
        return address(gardenToken);
    }

    // Sig: 0x7817ee4f
    function getMemberPowerInStrategy(address _member, address _strategy) public view returns (uint256) {
        return memberPowerInStrategy[_member][_strategy];
    }

    // Sig: 0x2c611c4a
    function getMemberStakedAmount(address _member) public view returns (uint256) {
        return addressToMemberInfo[_member].stakedAmount;
    }

    // Sig: 0x0d4a8b49
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

        PointSystem ps = CVStrategy(payable(_strategy)).getPointSystem();
        if (ps == PointSystem.Custom) {
            // Custom: registry is the source of truth, power set via activatePoints() in CVPowerFacet
            pointsToIncrease = CVStrategy(payable(_strategy)).increasePower(_member, 0);
        } else if (ps == PointSystem.Quadratic) {
            pointsToIncrease = CVStrategy(payable(_strategy)).increasePower(_member, 0);
        } else if (ps != PointSystem.Fixed) {
            pointsToIncrease = CVStrategy(payable(_strategy)).increasePower(_member, totalStakedAmount);
        }

        memberPowerInStrategy[_member][_strategy] = pointsToIncrease; // can be all zero
        memberActivatedInStrategies[_member][_strategy] = true;

        bool alreadyListed;
        for (uint256 i = 0; i < strategiesByMember[_member].length; i++) {
            if (strategiesByMember[_member][i] == _strategy) {
                alreadyListed = true;
                break;
            }
        }
        if (!alreadyListed) {
            strategiesByMember[_member].push(_strategy);
        }

        emit MemberActivatedStrategy(_member, _strategy, pointsToIncrease);
    }

    // Sig: 0x22bcf999
    function deactivateMemberInStrategy(address _member, address _strategy) public {
        onlyStrategyAddress(msg.sender, _strategy);
        onlyRegistryMemberAddress(_member);
        if (!memberActivatedInStrategies[_member][_strategy]) {
            revert PointsDeactivated();
        }

        memberActivatedInStrategies[_member][_strategy] = false;
        memberPowerInStrategy[_member][_strategy] = 0; emit MemberDeactivatedStrategy(_member, _strategy);
    }

    // Sig: 0x559de05d
    function increasePower(uint256 _amountStaked) public {
        onlyRegistryMemberSender();
        address member = msg.sender;
        uint256 pointsToIncrease;

        for (uint256 i = 0; i < strategiesByMember[member].length; i++) {
            address strategy = strategiesByMember[member][i];
            pointsToIncrease = CVStrategy(payable(strategy)).increasePower(member, _amountStaked);
            if (pointsToIncrease != 0) {
                memberPowerInStrategy[member][strategy] += pointsToIncrease;
            }
        }

        gardenToken.safeTransferFrom(member, address(this), _amountStaked); addressToMemberInfo[member].stakedAmount += _amountStaked;
        emit MemberPowerIncreased(member, _amountStaked);
    }

    // Sig: 0x5ecf71c5
    function decreasePower(uint256 _amountUnstaked) public {
        onlyRegistryMemberSender();
        address member = msg.sender;
        address[] storage memberStrategies = strategiesByMember[member];

        uint256 pointsToDecrease;

        if (addressToMemberInfo[member].stakedAmount - _amountUnstaked < registerStakeAmount) {
            revert DecreaseUnderMinimum();
        } gardenToken.safeTransfer(member, _amountUnstaked);
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            address strategy = memberStrategies[i];
            pointsToDecrease = CVStrategy(payable(strategy)).decreasePower(member, _amountUnstaked);
            uint256 currentPower = memberPowerInStrategy[member][memberStrategies[i]];
            if (pointsToDecrease > currentPower) {
                revert CantDecreaseMoreThanPower(pointsToDecrease, currentPower);
            } else {
                memberPowerInStrategy[member][memberStrategies[i]] -= pointsToDecrease;
            }
        }
        addressToMemberInfo[member].stakedAmount -= _amountUnstaked; emit MemberPowerDecreased(member, _amountUnstaked); }

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
