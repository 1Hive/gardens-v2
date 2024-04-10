// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "./PowerSystemInterface.sol";

// Your code here
contract FixedPowerSystem is PowerSystemInterface {

    
    uint256 public powerPerMember;
   
    constructor(uint256 _powerPerMember) {
        powerPerMember = _powerPerMember;
    }

    // Implement the interface functions here
    function increasePower(uint256 _amountToStake, uint256 _stakedAmount) external view returns (uint256) {
        return 0;
    }
    
    function decreasePower(uint256 _amountToUnstake) external pure returns (uint256) {
        return 0;
    }
    
    function getPower(address _member, uint256 _stakedAmount) external view returns (uint256) {
       return powerPerMember;
    }
}