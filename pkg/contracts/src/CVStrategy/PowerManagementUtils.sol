// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {PointSystem} from "./ICVStrategy.sol";
import {IVotingPowerRegistry} from "../interfaces/IVotingPowerRegistry.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

// This contract is a utility for managing power-related functionalities.
library PowerManagementUtils {
    function increasePower(
        IVotingPowerRegistry _votingPowerRegistry,
        address _member,
        uint256 _amountToStake,
        PointSystem _pointSystem,
        uint256 _pointConfigMaxAmount
    ) external returns (uint256 pointsToIncrease) {
        if (_pointSystem == PointSystem.Unlimited) {
            pointsToIncrease = _amountToStake; // from increasePowerUnlimited(_amountToUnstake)
        } else if (_pointSystem == PointSystem.Capped) {
            pointsToIncrease = increasePowerCapped(_votingPowerRegistry, _member, _amountToStake, _pointConfigMaxAmount);
        } else if (_pointSystem == PointSystem.Quadratic) {
            pointsToIncrease = increasePowerQuadratic(_votingPowerRegistry, _member, _amountToStake);
        } else if (_pointSystem == PointSystem.Custom) {
            // Custom is handled directly in CVPowerFacet, where current and previous values are available.
            pointsToIncrease = 0;
        }
    }

    function increasePowerCapped(
        IVotingPowerRegistry _votingPowerRegistry,
        address _member,
        uint256 _amountToStake,
        uint256 _pointConfigMaxAmount
    ) internal returns (uint256) {
        uint256 memberPower = _votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));
        if (memberPower + _amountToStake > _pointConfigMaxAmount) {
            _amountToStake = _pointConfigMaxAmount - memberPower;
        }

        return _amountToStake;
    }

    function increasePowerQuadratic(IVotingPowerRegistry _votingPowerRegistry, address _member, uint256 _amountToStake)
        internal
        returns (uint256)
    {
        uint256 totalStake = _votingPowerRegistry.getMemberStakedAmount(_member) + _amountToStake;

        uint256 decimal = 18;
        try ERC20(address(_votingPowerRegistry.ercAddress())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {
        }
        uint256 newTotalPoints = Math.sqrt(totalStake * 10 ** decimal);
        uint256 currentPoints = _votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));

        uint256 pointsToIncrease = newTotalPoints - currentPoints;

        return pointsToIncrease;
    }

    function decreasePower(
        IVotingPowerRegistry _votingPowerRegistry,
        address _member,
        uint256 _amountToUnstake,
        PointSystem _pointSystem,
        uint256 _pointConfigMaxAmount
    ) external returns (uint256 pointsToDecrease) {
        if (_pointSystem == PointSystem.Unlimited) {
            pointsToDecrease = _amountToUnstake;
        } else if (_pointSystem == PointSystem.Quadratic) {
            pointsToDecrease = decreasePowerQuadratic(_votingPowerRegistry, _member, _amountToUnstake);
        } else if (_pointSystem == PointSystem.Capped) {
            if (_votingPowerRegistry.getMemberPowerInStrategy(_member, address(this)) < _pointConfigMaxAmount) {
                pointsToDecrease = _amountToUnstake;
            } else if (_votingPowerRegistry.getMemberStakedAmount(_member) - _amountToUnstake < _pointConfigMaxAmount) {
                pointsToDecrease =
                    _pointConfigMaxAmount - (_votingPowerRegistry.getMemberStakedAmount(_member) - _amountToUnstake);
            }
        } else if (_pointSystem == PointSystem.Custom) {
            // Custom is handled directly in CVPowerFacet, where current and previous values are available.
            pointsToDecrease = 0;
        }
    }

    function decreasePowerQuadratic(
        IVotingPowerRegistry _votingPowerRegistry,
        address _member,
        uint256 _amountToUnstake
    ) internal returns (uint256) {
        uint256 decimal = 18;
        try ERC20(address(_votingPowerRegistry.ercAddress())).decimals() returns (uint8 _decimal) {
            decimal = uint256(_decimal);
        } catch {
        }
        uint256 newTotalStake = _votingPowerRegistry.getMemberStakedAmount(_member) - _amountToUnstake;
        uint256 newTotalPoints = Math.sqrt(newTotalStake * 10 ** decimal);
        uint256 pointsToDecrease =
            _votingPowerRegistry.getMemberPowerInStrategy(_member, address(this)) - newTotalPoints;
        return pointsToDecrease;
    }
}
