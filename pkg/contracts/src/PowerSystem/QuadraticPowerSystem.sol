// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "./PowerSystemInterface.sol";

// Your code here
contract QuadraticPowerSystem is PowerSystemInterface {

    
    uint256 public registerStakeAmount;
   
    constructor(uint256 _registerStakeAmount) {
        registerStakeAmount = _registerStakeAmount;
    }

    // Implement the interface functions here
    function increasePower(uint256 _amountToStake, uint256 _stakedAmount) external pure returns (uint256) {

        uint256 powerToIncrease = sqrt((_stakedAmount + _amountToStake)) / 1e5;

        return powerToIncrease;
    }
    
    function decreasePower(uint256 _amountToUnstake) external pure returns (uint256) {
        //To implement
        return 0;
    }
    
    function getPower(address _member, uint256 _stakedAmount) external view returns (uint256) {
        //To implement
       return 0;
    }


    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
        // else z = 0 (default value)
    }
}