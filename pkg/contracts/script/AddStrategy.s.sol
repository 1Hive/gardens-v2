// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/CVStrategy.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpers} from "../test/CVStrategyHelpers.sol";
import {MockERC20 as AMockERC20} from "allo-v2-test/utils/MockERC20.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {Safe} from "safe-contracts/contracts/Safe.sol";

contract AddStrategy is Native, CVStrategyHelpers, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50;

    address public SENDER = 0x2F9e113434aeBDd70bB99cB6505e1F726C578D6d;

    address public TOKEN = 0xcc6c8B9f745dB2277f7aaC1Bc026d5C2Ea7bD88D;
    // address public SAFE = 0x70471a50d4655C1677B7f0C5cAdD7a0410Aa2607;
    // address public SAFE = 0x46Abca313093B7F143Ae0833366e606a940BE44d;
    address public SAFE = 0x46Abca313093B7F143Ae0833366e606a940BE44d;
    address public COMMUNITY = 0x127BBb34A1cF9C8dc773Ea4C5D13878C534F1770;

    function pool_admin() public virtual override returns (address) {
        return address(SENDER);
    }

    function run(address payable _strategy) public {
        console2.log("AddStrategy.run(%s)", _strategy);
        // get PK from env
        uint256 councilMemberPKEnv = vm.envUint("PK");
        if (councilMemberPKEnv == 0) {
            revert("PK not set");
        }

        vm.startBroadcast(pool_admin());

        Safe councilSafeDeploy = Safe(payable(SAFE));

        RegistryCommunity registryCommunity = RegistryCommunity(COMMUNITY);

        console2.log("Comm Safe Addr: %s", address(registryCommunity.councilSafe()));

        assertTrue(address(registryCommunity.councilSafe()) != address(0), "Council Safe not set");
        assertEq(address(registryCommunity.councilSafe()), address(councilSafeDeploy), "Council Safe not set2");

        CVStrategy strategy1 = CVStrategy(_strategy);

        safeHelper(
            councilSafeDeploy,
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1))
        );

        vm.stopBroadcast();
    }
}