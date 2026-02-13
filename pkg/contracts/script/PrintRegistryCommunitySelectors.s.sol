// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

/// @notice Foundry script that reads the compiled artifact for RegistryCommunity
///         and prints every external/public function selector.
contract PrintRegistryCommunitySelectors is Script {
    using stdJson for string;

    function run() external {
        string memory artifactPath = string.concat(
            vm.projectRoot(),
            "/pkg/contracts/out/RegistryCommunity.sol/RegistryCommunity.json"
        );

        require(vm.exists(artifactPath), "RegistryCommunity artifact missing. Run `forge build` first.");

        string memory artifactJson = vm.readFile(artifactPath);
        string[] memory signatures = vm.parseJsonKeys(artifactJson, ".methodIdentifiers");

        console2.log("RegistryCommunity function selectors:", signatures.length);
        for (uint256 i = 0; i < signatures.length; ++i) {
            string memory selectorPath = string.concat(".methodIdentifiers[\"", signatures[i], "\"]");
            string memory selector = artifactJson.readString(selectorPath);
            console2.log(string.concat(signatures[i], " => 0x", selector));
        }
    }
}
