// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {ArbitrableConfig, CVParams} from "./CVStrategyV0_0.sol";

interface ICVStrategy {
    function setPoolParams(ArbitrableConfig memory _arbitrableConfig, CVParams memory _cvParams) external;
}
