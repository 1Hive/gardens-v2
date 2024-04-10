// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "./PowerSystemInterface.sol";

// Your code here
contract CappedPowerSystem is PowerSystemInterface {

    
    uint256 public maxAmount;
   
    constructor(uint256 _maxAmount) {
        maxAmount = _maxAmount;
    }

    // Implement the interface functions here
    function increasePower(uint256 _amountToStake, uint256 _stakedAmount) external view returns (uint256) {
        uint256 pointsToIncrease = _amountToStake;
        uint256 memberPower =_stakedAmount;

        if (memberPower + pointsToIncrease > maxAmount) {
            pointsToIncrease = maxAmount - memberPower;
        }
        return pointsToIncrease;
    }
    
    function decreasePower(uint256 _amountToUnstake) external pure returns (uint256) {
        return _amountToUnstake;
    }
    
    function getPower(address _member, uint256 _stakedAmount) external pure returns (uint256) {
       return 0;
    }
}