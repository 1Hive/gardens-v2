// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @dev Minimal WETH9-shaped mock. Test-only.
contract MockWETH9 {
    mapping(address => uint256) public balanceOf;

    error InsufficientBalance();
    error TransferFailed();

    function mint(address to) external payable {
        balanceOf[to] += msg.value;
    }

    function withdraw(uint256 amount) external {
        if (balanceOf[msg.sender] < amount) {
            revert InsufficientBalance();
        }
        balanceOf[msg.sender] -= amount;
        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
    }

    receive() external payable {}
}
