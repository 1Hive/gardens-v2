// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Canonical Base WETH9 surface used for unwrapping vault revenue.
interface IWETH9 is IERC20 {
    function withdraw(uint256 amount) external;
}
