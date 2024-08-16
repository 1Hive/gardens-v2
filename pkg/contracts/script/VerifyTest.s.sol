// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "../src/CVStrategyV0_0.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpersV0_0, CVStrategyV0_0} from "../test/CVStrategyHelpersV0_0.sol";
import {GV2ERC20} from "./GV2ERC20.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {RegistryFactoryV0_0} from "../src/RegistryFactoryV0_0.sol";

import {RegistryCommunityV0_0} from "../src/RegistryCommunityV0_0.sol";
import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
// import {SafeProxyFactory} from "safe-smart-account/contracts/proxies/SafeProxyFactory.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";

import {BaseMultiChain} from "./BaseMultiChain.s.sol";

contract VerifyTest is BaseMultiChain {
    using stdJson for string;

    function run(string memory network) public virtual override {
        // get PK from env
        councilMemberPKEnv = vm.envUint("PK");
        if (councilMemberPKEnv == 0) {
            revert("PK not set");
        }

        vm.startBroadcast(pool_admin());

        if (bytes(network).length != 0) {
            CURRENT_NETWORK = network;
        }

        string memory json = getNetworkJson();

        uint256 chainId = json.readUint(getKeyNetwork(".chainId"));
        string memory name = json.readString(getKeyNetwork(".name"));
        SENDER = json.readAddress(getKeyNetwork(".ENVS.SENDER"));

        console2.log("name: %s", name);
        console2.log("sender: %s", SENDER);
        console2.log("chainId : %s", chainId);

        allo_proxy = json.readAddress(getKeyNetwork(".ENVS.ALLO_PROXY"));

        if (allo_proxy == address(0)) {
            revert("ALLO_PROXY not set");
        }

        allo = Allo(allo_proxy);

        assertTrue(address(allo) != address(0));

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new RegistryFactoryV0_0()),
            abi.encodeWithSelector(
                RegistryFactoryV0_0.initialize.selector, address(SENDER), address(SENDER), address(SENDER)
            )
        );

        vm.stopBroadcast();
    }

    function runCurrentNetwork() public virtual override {}
}
