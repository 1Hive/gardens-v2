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
        if (memberPower >= _pointConfigMaxAmount) {
            return 0;
        }
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

        uint256 scale = _decimalScale(_votingPowerRegistry);
        if (totalStake > type(uint256).max / scale) {
            totalStake = type(uint256).max / scale;
        }
        uint256 newTotalPoints = Math.sqrt(totalStake * scale);
        uint256 currentPoints = _votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));

        if (newTotalPoints <= currentPoints) {
            return 0;
        }
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
            uint256 memberPower = _votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));
            uint256 memberStake = _votingPowerRegistry.getMemberStakedAmount(_member);
            if (memberPower < _pointConfigMaxAmount) {
                pointsToDecrease = _amountToUnstake;
            } else if (memberStake < _pointConfigMaxAmount) {
                pointsToDecrease = _pointConfigMaxAmount - memberStake;
            }
        } else if (_pointSystem == PointSystem.Custom) {
            // Custom is handled directly in CVPowerFacet, where current and previous values are available.
            pointsToDecrease = 0;
        }
    }

    function decreasePowerQuadratic(
        IVotingPowerRegistry _votingPowerRegistry,
        address _member,
        uint256
    ) internal returns (uint256) {
        uint256 scale = _decimalScale(_votingPowerRegistry);
        uint256 newTotalStake = _votingPowerRegistry.getMemberStakedAmount(_member);
        if (newTotalStake > type(uint256).max / scale) {
            newTotalStake = type(uint256).max / scale;
        }
        uint256 newTotalPoints = Math.sqrt(newTotalStake * scale);
        uint256 currentPoints = _votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));
        if (newTotalPoints >= currentPoints) {
            return 0;
        }
        uint256 pointsToDecrease = currentPoints - newTotalPoints;
        return pointsToDecrease;
    }

    function _decimalScale(IVotingPowerRegistry _votingPowerRegistry) internal view returns (uint256 scale) {
        uint256 decimal = 18;
        address ercAddress = address(_votingPowerRegistry.ercAddress());
        if (ercAddress.code.length > 0) {
            try ERC20(ercAddress).decimals() returns (uint8 _decimal) {
                decimal = uint256(_decimal);
            } catch {}
        }

        // 10**78 overflows uint256, cap to largest safe exponent.
        if (decimal > 77) {
            decimal = 77;
        }
        scale = 10 ** decimal;
    }
}
