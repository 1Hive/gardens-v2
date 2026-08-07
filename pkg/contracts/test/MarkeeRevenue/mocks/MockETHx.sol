// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @dev Minimal ISETH-shaped mock: ETH-backed balances with a
/// `downgradeToETH` that returns backing ETH to the caller. Test-only.
contract MockETHx {
    mapping(address => uint256) private _balances;
    uint256 public downgradeToETHCalls;

    error InsufficientBalance();
    error MintValueMismatch();
    error TransferFailed();

    function mint(address to, uint256 amount) external payable {
        if (msg.value != amount) {
            revert MintValueMismatch();
        }
        _balances[to] += amount;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function downgradeToETH(uint256 amount) external {
        if (_balances[msg.sender] < amount) {
            revert InsufficientBalance();
        }
        _balances[msg.sender] -= amount;
        downgradeToETHCalls++;
        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
    }

    receive() external payable {}
}
