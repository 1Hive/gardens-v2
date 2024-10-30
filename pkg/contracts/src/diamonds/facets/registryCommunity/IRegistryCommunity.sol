// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

interface IRegistryCommunity {
    function setStrategyTemplate(address template) external;

    function setCollateralVaultTemplate(address template) external;

    function getBasisStakedAmount() external view returns (uint256);

    function setBasisStakedAmount(uint256 _newAmount) external;
}
