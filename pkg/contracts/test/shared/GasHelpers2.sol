// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";

contract GasHelpers2 is Test {
    string private checkpointLabel;
    uint256 private checkpointGasLeft = 1; // Start the slot warm.

    bool private _enableGasLog = false;

    function setEnableGasLog(bool enable) public {
        _enableGasLog = enable;
    }

    function startMeasuringGas(string memory label) internal virtual {
        if (_enableGasLog) {
            checkpointLabel = label;

            checkpointGasLeft = gasleft();
        }
    }

    function stopMeasuringGas() internal virtual {
        if (_enableGasLog) {
            uint256 checkpointGasLeft2 = gasleft();

            // Subtract 100 to account for the warm SLOAD in startMeasuringGas.
            uint256 gasDelta = checkpointGasLeft - checkpointGasLeft2 - 100;

            emit log_named_uint(string(abi.encodePacked(checkpointLabel, " Gas")), gasDelta);
        }
    }
}
