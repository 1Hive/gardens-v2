// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DiamondMultiInit
 * @author Nick Mudge (nick@perfectabstractions.com)
 * @notice EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
 * @dev Helper to run multiple initializers during a diamond cut.
 */
import {LibDiamond} from "@src/diamonds/libraries/LibDiamond.sol";

error AddressAndCalldataLengthDoNotMatch(uint256 _addressesLength, uint256 _calldataLength);

contract DiamondMultiInit {
    // This function is provided in the third parameter of the `diamondCut` function.
    // The `diamondCut` function executes this function to execute multiple initializer functions for a single upgrade.

    function multiInit(address[] calldata _addresses, bytes[] calldata _calldata) external {
        if (_addresses.length != _calldata.length) {
            revert AddressAndCalldataLengthDoNotMatch(_addresses.length, _calldata.length);
        }
        for (uint256 i; i < _addresses.length; i++) {
            LibDiamond.initializeDiamondCut(_addresses[i], _calldata[i]);
        }
    }
}
