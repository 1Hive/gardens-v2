// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";

/**
 * @title DecimalScalingUtils
 * @notice Shared helpers for converting amounts between pool-token units and SuperToken units.
 */
library DecimalScalingUtils {
    function scaleTokenAmount(uint256 amount, uint8 fromDecimals, uint8 toDecimals) internal pure returns (uint256) {
        if (amount == 0 || fromDecimals == toDecimals) {
            return amount;
        }
        if (fromDecimals < toDecimals) {
            return amount * (10 ** (toDecimals - fromDecimals));
        }
        return amount / (10 ** (fromDecimals - toDecimals));
    }

    function tokenDecimals(address token) internal view returns (uint8) {
        try IERC20Metadata(token).decimals() returns (uint8 decimals_) {
            return decimals_;
        } catch {
            return 18;
        }
    }

    function toSuperTokenAmount(uint256 poolTokenAmount, address poolToken, ISuperToken targetSuperToken)
        internal
        view
        returns (uint256)
    {
        if (poolTokenAmount == 0 || address(targetSuperToken) == address(0) || poolToken == address(targetSuperToken)) {
            return poolTokenAmount;
        }

        return scaleTokenAmount(poolTokenAmount, tokenDecimals(poolToken), tokenDecimals(address(targetSuperToken)));
    }

    function fromSuperTokenAmount(uint256 superTokenAmount, address poolToken, ISuperToken sourceSuperToken)
        internal
        view
        returns (uint256)
    {
        if (superTokenAmount == 0 || address(sourceSuperToken) == address(0) || poolToken == address(sourceSuperToken))
        {
            return superTokenAmount;
        }

        return scaleTokenAmount(superTokenAmount, tokenDecimals(address(sourceSuperToken)), tokenDecimals(poolToken));
    }
}
