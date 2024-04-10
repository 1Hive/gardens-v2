// SPDX-License-Identifier: MIT
// Your code here
pragma solidity ^0.8.19;

interface PowerSystemInterface {
    function increasePower(uint256 _amountToStake, uint256 _stakedAmount) external returns (uint256);
    function decreasePower(uint256 _amountToUnstake) external returns (uint256);
    //Neeed to think about this
    function getPower(address _member, uint256 _stakedAmount) external returns (uint256);
}
