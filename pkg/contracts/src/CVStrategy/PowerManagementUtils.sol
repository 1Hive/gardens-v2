// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunity} from "../RegistryCommunity/RegistryCommunity.sol";
import {PointSystem} from "./ICVStrategy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

// This contract is a utility for managing power-related functionalities.
library PowerManagementUtils {
    function increasePower(
        RegistryCommunity _registryCommunity,
        address _member,
        uint256 _amountToStake,
        PointSystem _pointSystem,
        uint256 _pointConfigMaxAmount
    ) external returns (uint256 pointsToIncrease) {
        if (_pointSystem == PointSystem.Unlimited) {
            pointsToIncrease = _amountToStake; // from increasePowerUnlimited(_amountToUnstake)
        } else if (_pointSystem == PointSystem.Capped) {
            pointsToIncrease = increasePowerCapped(_registryCommunity, _member, _amountToStake, _pointConfigMaxAmount);
        } else if (_pointSystem == PointSystem.Quadratic) {
            pointsToIncrease = increasePowerQuadratic(_registryCommunity, _member, _amountToStake);
        }
    }

    function increasePowerCapped(
        RegistryCommunity _registryCommunity,
        address _member,
        uint256 _amountToStake,
        uint256 _pointConfigMaxAmount
    ) internal returns (uint256) {
        // console.log("POINTS TO INCREASE", _amountToStake);
        uint256 memberPower = _registryCommunity.getMemberPowerInStrategy(_member, address(this));
        // console.log("MEMBERPOWER", memberPower);
        if (memberPower + _amountToStake > _pointConfigMaxAmount) {
            _amountToStake = _pointConfigMaxAmount - memberPower;
        }
        // console.log("POINTS TO INCREASE END", _amountToStake);

        return _amountToStake;
    }

    function increasePowerQuadratic(RegistryCommunity _registryCommunity, address _member, uint256 _amountToStake)
        internal
        returns (uint256)
    {
        uint256 totalStake = _registryCommunity.getMemberStakedAmount(_member) + _amountToStake;

        uint256 decimal = 18;
        try ERC20(address(_registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {
            // console.log("Error getting decimal");
        }
        uint256 newTotalPoints = Math.sqrt(totalStake * 10 ** decimal);
        uint256 currentPoints = _registryCommunity.getMemberPowerInStrategy(_member, address(this));

        uint256 pointsToIncrease = newTotalPoints - currentPoints;

        return pointsToIncrease;
    }

    function decreasePower(
        RegistryCommunity _registryCommunity,
        address _member,
        uint256 _amountToUnstake,
        PointSystem _pointSystem,
        uint256 _pointConfigMaxAmount
    ) external returns (uint256 pointsToDecrease) {
        if (_pointSystem == PointSystem.Unlimited) {
            pointsToDecrease = _amountToUnstake;
        } else if (_pointSystem == PointSystem.Quadratic) {
            pointsToDecrease = decreasePowerQuadratic(_registryCommunity, _member, _amountToUnstake);
        } else if (_pointSystem == PointSystem.Capped) {
            if (_registryCommunity.getMemberPowerInStrategy(_member, address(this)) < _pointConfigMaxAmount) {
                pointsToDecrease = _amountToUnstake;
            } else if (_registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake < _pointConfigMaxAmount) {
                pointsToDecrease =
                    _pointConfigMaxAmount - (_registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake);
            }
        }
    }

    function decreasePowerQuadratic(RegistryCommunity _registryCommunity, address _member, uint256 _amountToUnstake)
        internal
        returns (uint256)
    {
        uint256 decimal = 18;
        try ERC20(address(_registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {
            // console.log("Error getting decimal");
        }
        // console.log("_amountToUnstake", _amountToUnstake);
        uint256 newTotalStake = _registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake;
        // console.log("newTotalStake", newTotalStake);
        uint256 newTotalPoints = Math.sqrt(newTotalStake * 10 ** decimal);
        uint256 pointsToDecrease = _registryCommunity.getMemberPowerInStrategy(_member, address(this)) - newTotalPoints;
        return pointsToDecrease;
    }
}
