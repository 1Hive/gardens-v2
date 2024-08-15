// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleSafe {
    address[] public owners;
    uint256 public nonce;

    constructor() {
        owners.push(msg.sender);
    }

    modifier onlyOwners() {
        bool owner = false;
        for (uint256 index = 0; index < owners.length; index++) {
            if (owners[index] == tx.origin) {
                owner = true;
                break;
            }
        }
        require(owner, "Only owners can call this function");
        _;
    }

    function executeTransaction(address to, uint256 value, bytes calldata data) external onlyOwners {
        (bool success,) = to.call{value: value}(data);
        require(success, "Transaction failed");
    }

    function addOwner(address owner) public onlyOwners {
        owners.push(owner);
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }
}
