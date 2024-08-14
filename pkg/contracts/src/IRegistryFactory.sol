// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IRegistryFactory {
    function getGardensFeeReceiver() external view returns (address);

    function getProtocolFee(address _community) external view returns (uint256);
}
