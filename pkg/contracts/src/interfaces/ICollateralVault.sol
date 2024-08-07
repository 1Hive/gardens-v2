// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

interface ICollateralVault {
    function initialize() external;

    function depositCollateral(
        uint256 proposalId,
        address user
    ) external payable;

    function withdrawCollateral(
        uint256 _proposalId,
        address _user,
        uint256 _amount
    ) external;

    function withdrawCollateralFor(
        uint256 _proposalId,
        address _fromUser,
        address _toUser,
        uint256 _amount
    ) external;
}
