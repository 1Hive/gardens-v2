//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.19;

contract RegistryGardens {
    function isMember(address _member) external view returns (bool) {
        return true;
    }

    function getBasisStakedAmount() external view returns (uint256) {
        return 50;
    }

    function getAllStakedAmount() external view returns (uint256) {
        return 1;
    }
}
