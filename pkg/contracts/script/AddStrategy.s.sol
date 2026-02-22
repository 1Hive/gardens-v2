// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpers, CVStrategy} from "../test/CVStrategyHelpers.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
// import {SafeProxyFactory} from "safe-smart-account/contracts/proxies/SafeProxyFactory.sol";

import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";

contract AddStrategy is Native, CVStrategyHelpers, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50;

    address public SENDER = 0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD;

    address public TOKEN = 0xcc6c8B9f745dB2277f7aaC1Bc026d5C2Ea7bD88D;
    // address public SAFE = 0x70471a50d4655C1677B7f0C5cAdD7a0410Aa2607;
    // address public SAFE = 0x46Abca313093B7F143Ae0833366e606a940BE44d;
    // address public SAFE = 0x46Abca313093B7F143Ae0833366e606a940BE44d;
    address public SAFE;
    address public COMMUNITY = 0x127BBb34A1cF9C8dc773Ea4C5D13878C534F1770;

    address allo_proxy;
    Allo allo;

    function pool_admin() public virtual override returns (address) {
        return address(SENDER);
    }

    function run(uint256 poolId, address _comm) public {
        assertNotEq(_comm, address(0), "Community not set");
        assertNotEq(poolId, 0, "Pool ID not set");

        allo_proxy = vm.envAddress("ALLO_PROXY");
        if (allo_proxy == address(0)) {
            revert("ALLO_PROXY not set");
        }

        allo = Allo(allo_proxy);

        IAllo.Pool memory pool = allo.getPool(poolId);


        run(payable(address(pool.strategy)), _comm);
    }

    function run(address payable _strategy, address _comm) public {
        assertNotEq(_strategy, address(0), "Strategy not set");
        // get PK from env
        uint256 councilMemberPKEnv = vm.envUint("PK");
        if (councilMemberPKEnv == 0) {
            revert("PK not set");
        }

        allo_proxy = vm.envAddress("ALLO_PROXY");
        if (allo_proxy == address(0)) {
            revert("ALLO_PROXY not set");
        }
        // get PK from env
        councilMemberPKEnv = vm.envUint("PK");
        if (councilMemberPKEnv == 0) {
            revert("PK not set");
        }

        allo = Allo(allo_proxy);

        IAllo.Pool memory pool = allo.getPool(172);

        // address strategy = address(pool.strategy);
        // address strategy = address(pool.strategy);

        // assertNotEq(strategy, address(0), "Strategy not found");

        vm.startBroadcast(pool_admin());

        if (_comm != address(0)) {
            COMMUNITY = _comm;
        }

        RegistryCommunity registryCommunity = RegistryCommunity(COMMUNITY);

        if (SAFE == address(0)) {
            SAFE = address(registryCommunity.councilSafe());
        }
        Safe councilSafeDeploy = Safe(payable(SAFE));


        assertTrue(address(registryCommunity.councilSafe()) != address(0), "Council Safe not set");
        assertTrue(address(councilSafeDeploy) != address(0), "Council Safe empty");

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
