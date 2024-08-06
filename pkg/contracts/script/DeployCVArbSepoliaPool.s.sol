// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpersV0_0, CVStrategyV0_0, StrategyStruct} from "../test/CVStrategyHelpersV0_0.sol";
import {SafeArbitrator, IArbitrator} from "../src/SafeArbitrator.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactoryV0_0.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {Safe} from "safe-contracts/contracts/Safe.sol";
import {TERC20} from "../test/shared/TERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployCVArbSepoliaPool is Native, CVStrategyHelpersV0_0, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50 * DECIMALS;

    address public SENDER = 0x2F9e113434aeBDd70bB99cB6505e1F726C578D6d;

    address public TOKEN = 0xcc6c8B9f745dB2277f7aaC1Bc026d5C2Ea7bD88D;
    address public SAFE = 0xd96e152760BBc6502cAc7D2e43C34Da05230076c;
    address public COMMUNITY = 0xfD4e8327aa3877dD010fd2d5411DF62FED8d262b;

    function pool_admin() public virtual override returns (address) {
        return address(SENDER);
    }

    // function allo_owner() public virtual override returns (address) {
    //     return address(SENDER);
    // }

    function run() public {
        address allo_proxy = vm.envAddress("ALLO_PROXY");
        if (allo_proxy == address(0)) {
            revert("ALLO_PROXY not set");
        }
        // get PK from env
        uint256 councilMemberPKEnv = vm.envUint("PK");
        if (councilMemberPKEnv == 0) {
            revert("PK not set");
        }

        Allo allo = Allo(allo_proxy);

        // console2.log("Allo Addr: %s", address(allo));
        TERC20 token = TERC20(TOKEN);

        // IRegistry registry = allo.getRegistry();
        // console2.log("Registry Addr: %s", address(registry));

        // console2.log("Pool Admin Addr: %s", pool_admin());

        vm.startBroadcast(pool_admin());

        // console2.log("Token Addr: %s", address(token));
        // Safe councilSafeDeploy = _councilSafeWithOwner(pool_admin());
        Safe councilSafeDeploy = Safe(payable(SAFE));

        // RegistryFactoryV0_0 registryFactory = new RegistryFactoryV0_0();
        // RegistryFactoryV0_0 registryFactory = RegistryFactory(0xeE8B920641210e26d4D18BD285A862156f31556f);

        // RegistryCommunityV0_0.InitializeParams memory params;

        // params._allo = address(allo);
        // params._gardenToken = IERC20(address(token));
        // params._registerStakeAmount = MINIMUM_STAKE;
        // params._communityFee = 0;
        // params._metadata = metadata; // convenant ipfs
        // params._councilSafe = payable(address(councilSafeDeploy));
        // // params._councilSafe = payable(address(_councilSafeWithOwner(pool_admin());
        // params._communityName = "GardensDAO";

        // RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(registryFactory.createRegistry(params));
        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(COMMUNITY);

        console2.log("Comm Safe Addr: %s", address(registryCommunity.councilSafe()));

        assertTrue(address(registryCommunity.councilSafe()) != address(0), "Council Safe not set");
        assertTrue(address(registryCommunity.councilSafe()) == address(councilSafeDeploy), "Council Safe not set2");

        // console2.log("Registry Factory Addr: %s", address(registryFactory));
        // console2.log("Registry Community Addr: %s", address(registryCommunity));

        StrategyStruct.PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;

        // Goss: Commented until used
        // ERC1967Proxy arbitratorProxy = new ERC1967Proxy(
        //     address(new SafeArbitrator()),
        //     abi.encodeWithSelector(SafeArbitrator.initialize.selector, 2 ether)
        // );
        // IArbitrator safeArbitrator = SafeArbitrator(payable(address(arbitratorProxy)));
        // StrategyStruct.InitializeParams memory paramsCV = getParams(
        //     address(registryCommunity),
        //     StrategyStruct.ProposalType.Funding,
        //     StrategyStruct.PointSystem.Capped,
        //     pointConfig,
        //     StrategyStruct.ArbitrableConfig(
        //       IArbitrator(address(safeArbitrator)),
        //       payable(address(_councilSafe())),
        //       3 ether,
        //       2 ether,
        //       1,
        //       300,
        //       address(new CollateralVault())
        //   )
        // );

        // Goss: Commented because already set in getParams
        // paramsCV.decay = _etherToFloat(0.9965402 ether); // alpha = decay
        // paramsCV.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        // paramsCV.weight = _etherToFloat(0.001 ether); // RHO = p  = weight
        // params.minThresholdStakePercentage = 0.2 ether; // 20%
        // paramsCV.registryCommunity = address(registryCommunity);
        // paramsCV.proposalType = StrategyStruct.ProposalType.Funding;

        // CVStrategy strategy1 = new CVStrategy(address(allo));
        // CVStrategy strategy2 = new CVStrategy(address(allo));

        // safeHelper(
        //     councilSafeDeploy,
        //     councilMemberPKEnv,
        //     address(registryCommunity),
        //     abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1))
        // );
        // safeHelper(
        //     councilSafeDeploy,
        //     councilMemberPKEnv,
        //     address(registryCommunity),
        //     abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy2))
        // );

        uint256 poolId = 306;
        uint256 poolId2 = 307;
        // (uint256 poolId,) = registryCommunity.createPool(address(strategy1), address(token), paramsCV, metadata);
        console2.log("PoolId: %s", poolId);

        // assertTrue(strategy1.proposalType() == StrategyStruct.ProposalType.Funding, "ProposalType not set");

        // paramsCV.pointSystem = StrategyStruct.PointSystem.Unlimited;
        // (uint256 poolId2,) = registryCommunity.createPool(address(strategy2), address(token), paramsCV, metadata);

        // token.mint(address(pool_admin()), 10_000);
        // token.approve(address(allo), type(uint256).max);
        // allo.fundPool(poolId, 1_000);
        // allo.fundPool(poolId2, 1_500);

        console2.log("PoolId2: %s", poolId2);

        StrategyStruct.CreateProposal memory proposal =
            StrategyStruct.CreateProposal(poolId, pool_admin(), 50 wei, address(token), metadata);
        bytes memory data = abi.encode(proposal);

        allo.registerRecipient(poolId, data);

        console2.log("Proposal 1");

        data = abi.encode(StrategyStruct.CreateProposal(poolId, pool_admin(), 10 wei, address(token), metadata));

        allo.registerRecipient(poolId2, data);
        console2.log("Proposal 2");

        vm.stopBroadcast();

        // console2.log("Strategy1 Addr: %s", address(strategy1));

        // console2.log("PoolIdSignaling: %s", poolIdSignaling);
        // console2.log("Strategy2 Addr: %s", address(strategy2));
        // console2.log("Token Addr: %s", address(token));
        // console2.log("Token Native Addr: %s", address(NATIVE));

        // console2.log("Allo Registry Addr: %s", address(registry));
        // console2.log("Council Safe Addr: %s", address(councilSafeOwner));
    }
}
