// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {CREATE3} from "allo-v2/lib/hats-protocol/lib/solady/src/utils/CREATE3.sol";
import "forge-std/Script.sol";
import {CollateralVault} from "../src/CollateralVault.sol";

library DeployCollateralVaultTemplate {
    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    function deployCollateralVaultTemplate() external {
        if (isContract(0xfb05EB7dA4e0266a9b671c04927272a9A6cf6C9c)) {
            console.log("CollateralVault template already deployed!");
        } else {
            // --- Deterministic Deployment Parameters ---
            bytes32 salt = bytes32(uint256(12345)); // Choose a fixed salt

            // --- Deployment using CREATE3 from Solmate ---
            address deployedAddress = CREATE3.deploy(
                salt,
                type(CollateralVault).creationCode, // Pass the bytecode directly
                0
            );

            // --- Predicted Address Verification ---
            address predictedAddress = CREATE3.getDeployed(salt);

            require(deployedAddress == predictedAddress, "Deployment address mismatch!");

            console.log("Deployed CollateralVault template at:", deployedAddress);
        }
    }
}
