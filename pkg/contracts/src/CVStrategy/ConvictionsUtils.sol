// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {CVParams} from "./ICVStrategy.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

library ConvictionsUtils {
    uint256 public constant D = 10000000; // 10**7
    uint256 internal constant TWO_128 = 0x100000000000000000000000000000000; // 2**128
    uint256 internal constant TWO_127 = 0x80000000000000000000000000000000; // 2**127

    /**
     * @dev Conviction formula: a^t * y(0) + x * (1 - a^t) / (1 - a)
     * Solidity implementation: y = (2^128 * a^t * y0 + x * D * (2^128 - 2^128 * a^t) / (D - aD) + 2^127) / 2^128
     * @param _timePassed Number of blocks since last conviction record
     * @param _lastConv Last conviction record
     * @param _oldAmount Amount of tokens staked until now
     * @return Current conviction
     */
    function calculateConviction(uint256 _timePassed, uint256 _lastConv, uint256 _oldAmount, uint256 _decay)
        public
        pure
        returns (uint256)
    {
        uint256 t = _timePassed;
        // atTWO_128 = 2^128 * a^t
        //        @audit-issue why that _pow require that need be less than TWO_128? why dont use 256?
        //        @audit-ok they use 2^128 as the container for the result of the _pow function
        uint256 atTWO_128 = _pow((_decay << 128) / D, t);
        return (((atTWO_128 * _lastConv) + ((_oldAmount * D * (TWO_128 - atTWO_128)) / (D - _decay))) + TWO_127) >> 128;
    }

    /**
     * @dev Formula: ρ * totalStaked / (1 - a) / (β - requestedAmount / total)**2
     * For the Solidity implementation we amplify ρ and β and simplify the formula:
     * weight = ρ * D
     * maxRatio = β * D
     * decay = a * D
     * threshold = weight * totalStaked * D ** 2 * funds ** 2 / (D - decay) / (maxRatio * funds - requestedAmount * D) ** 2
     * @param _requestedAmount Requested amount of tokens on certain proposal
     * @return _threshold Threshold a proposal's conviction should surpass in order to be able to
     * executed it.
     */
    function calculateThreshold(
        uint256 _requestedAmount,
        uint256 _poolAmount,
        uint256 _totalPointsActivated,
        uint256 _decay,
        uint256 _weight,
        uint256 _maxRatio,
        uint256 _minThresholdPoints
    ) public pure returns (uint256 _threshold) {
        uint256 denom = (_maxRatio * 2 ** 64) / D - (_requestedAmount * 2 ** 64) / _poolAmount;
        uint256 weightScaled = (_weight << 128) / D;
        uint256 ratioTerm = Math.mulDiv(weightScaled, D, (denom * denom) >> 64);
        uint256 decayAdjusted = ratioTerm / (D - _decay);
        _threshold = Math.mulDiv(decayAdjusted, _totalPointsActivated, 2 ** 64);

        if (_totalPointsActivated != 0) {
            uint256 thresholdOverride = (
                (_minThresholdPoints * D * getMaxConviction(_totalPointsActivated, _decay)) / (_totalPointsActivated)
            ) / 10 ** 7;
            _threshold = _threshold > thresholdOverride ? _threshold : thresholdOverride;
        }
    }

    function getMaxConviction(uint256 amount, uint256 _decay) public pure returns (uint256) {
        return ((amount * D) / (D - _decay));
    }

    /**
     * Calculate (_a / 2^128)^_b * 2^128.  Parameter _a should be less than 2^128.
     *
     * @param _a left argument
     * @param _b right argument
     * @return _result (_a / 2^128)^_b * 2^128
     */
    function _pow(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        // TODO: Uncomment when contract size fixed with diamond
        // if (_a >= TWO_128) {
        //     revert AShouldBeUnderTwo_128();
        // }

        uint256 a = _a;
        uint256 b = _b;
        _result = TWO_128;
        while (b > 0) {
            if (b & 1 == 0) {
                a = _mul(a, a);
                b >>= 1;
            } else {
                _result = _mul(_result, a);
                b -= 1;
            }
        }
    }

    /**
     * Multiply _a by _b / 2^128.  Parameter _a should be less than or equal to
     * 2^128 and parameter _b should be less than 2^128.
     * @param _a left argument
     * @param _b right argument
     * @return _result _a * _b / 2^128
     */
    function _mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        // TODO: Uncomment when contract size fixed with diamond
        // if (_a > TWO_128) {
        //     revert AShouldBeUnderOrEqTwo_128();
        // }
        // if (_b > TWO_128) {
        //     revert BShouldBeLessTwo_128();
        // }

        return ((_a * _b) + TWO_127) >> 128;
    }
}
