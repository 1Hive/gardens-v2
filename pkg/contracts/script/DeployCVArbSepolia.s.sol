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
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactoryV0_0.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
// import {SafeProxyFactory} from "safe-smart-account/contracts/proxies/SafeProxyFactory.sol";

import {TERC20} from "../test/shared/TERC20.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployCVArbSepolia is Native, CVStrategyHelpersV0_0, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50;

    address public constant SENDER = 0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6;

    uint256 councilMemberPKEnv;
    address allo_proxy;
    Allo allo;
    TERC20 token;

    function pool_admin() public virtual override returns (address) {
        return address(SENDER);
    }

    function run() public {
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

        // console2.log("Allo Addr: %s", address(allo));
        token = TERC20(0xcc6c8B9f745dB2277f7aaC1Bc026d5C2Ea7bD88D);

        // IRegistry registry = allo.getRegistry();
        // console2.log("Registry Addr: %s", address(registry));

        // console2.log("Pool Admin Addr: %s", pool_admin());

        vm.startBroadcast(pool_admin());

        // console2.log("Token Addr: %s", address(token));
        Safe councilSafeDeploy = _councilSafeWithOwner(pool_admin());

        // RegistryFactoryV0_0 registryFactory = new RegistryFactoryV0_0();
        RegistryFactoryV0_0 registryFactory = new RegistryFactoryV0_0();
        RegistryCommunityV0_0.InitializeParams memory params;

        params._strategyTemplate = address(new CVStrategyV0_0());
        params._allo = address(allo);
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 0;
        params._metadata = metadata; // convenant ipfs
        params._councilSafe = payable(address(councilSafeDeploy));
        // params._councilSafe = payable(address(_councilSafeWithOwner(pool_admin());
        params._communityName = "GardensDAO";

        assertTrue(params._councilSafe != address(0));

        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(registryFactory.createRegistry(params));

        // console2.log("Registry Factory Addr: %s", address(registryFactory));
        // console2.log("Registry Community Addr: %s", address(registryCommunity));

        StrategyStruct.PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;

        ERC1967Proxy arbitratorProxy = new ERC1967Proxy(
            address(new SafeArbitrator()), abi.encodeWithSelector(SafeArbitrator.initialize.selector, 2 ether)
        );

        StrategyStruct.InitializeParams memory paramsCV = getParams(
            address(registryCommunity),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Fixed,
            pointConfig,
            StrategyStruct.ArbitrableConfig(
                SafeArbitrator(payable(address(arbitratorProxy))),
                payable(address(_councilSafe())),
                3 ether,
                2 ether,
                1,
                300
            )
        );

        // Goss: Commented because already set in getParams
        // paramsCV.decay = _etherToFloat(0.9965402 ether); // alpha = decay
        // paramsCV.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        // paramsCV.weight = _etherToFloat(0.001 ether); // RHO = p  = weight
        // params.minThresholdStakePercentage = 0.2 ether; // 20%
        // paramsCV.registryCommunity = address(registryCommunity);
        // paramsCV.proposalType = StrategyStruct.ProposalType.Funding;

        // address[] memory _pool_managers = new address[](2);
        // _pool_managers[0] = address(params._councilSafe);
        // _pool_managers[1] = address(msg.sender);

        // bytes32 memory_poolProfileId_ = registry.createProfile(
        //     0, "Pool Profile 1", Metadata({protocol: 1, pointer: "PoolProfile1"}), pool_admin(), pool_managers()
        // );

        (uint256 poolId, address _strategy1) = registryCommunity.createPool(address(token), paramsCV, metadata);

        paramsCV.proposalType = StrategyStruct.ProposalType.Signaling;
        paramsCV.pointSystem = StrategyStruct.PointSystem.Unlimited;

        (uint256 poolIdSignaling, address _strategy2) = registryCommunity.createPool(address(0), paramsCV, metadata);

        CVStrategyV0_0 strategy1 = CVStrategyV0_0(payable(_strategy1));
        CVStrategyV0_0 strategy2 = CVStrategyV0_0(payable(_strategy2));

        safeHelper(
            councilSafeDeploy,
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1))
        );

        safeHelper(
            councilSafeDeploy,
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy2))
        );

        // Goss: Commented because already set in getParams
        // strategy1.setDecay(_etherToFloat(0.9965402 ether));
        // // alpha = decay
        // strategy1.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        // strategy1.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

        // // FAST 1 MIN GROWTH
        // strategy2.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        // strategy2.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        // strategy2.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

        // poolId =
        //     createPool(Allo(address(allo)), address(strategy1), address(registryCommunity), registry, address(token));

        // uint256 poolIdSignaling =
        //     createPool(Allo(address(allo)), address(strategy2), address(registryCommunity), registry, address(0));
        //
        token.approve(address(registryCommunity), type(uint256).max);
        //@todo get correct value instead infinite approval
        registryCommunity.stakeAndRegisterMember();

        strategy1.activatePoints();
        strategy2.activatePoints();

        // allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        token.mint(address(pool_admin()), 10_000);
        token.approve(address(allo), type(uint256).max);
        allo.fundPool(poolId, 1_000);

        StrategyStruct.CreateProposal memory proposal =
            StrategyStruct.CreateProposal(poolId, pool_admin(), 50 wei, address(token), metadata);
        bytes memory data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);
        // StrategyStruct.ProposalType.Funding
        proposal = StrategyStruct.CreateProposal(poolId, pool_admin(), 25 wei, address(token), metadata);
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal = StrategyStruct.CreateProposal(poolId, pool_admin(), 10 wei, address(token), metadata);
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        // Strategy 2 Signaling
        StrategyStruct.CreateProposal memory proposal2 =
            StrategyStruct.CreateProposal(poolIdSignaling, pool_admin(), 0, address(0), metadata);
        bytes memory data2 = abi.encode(proposal2);
        allo.registerRecipient(poolIdSignaling, data2);

        vm.stopBroadcast();

        // console2.log("PoolId: %s", poolId);
        // console2.log("Strategy1 Addr: %s", address(strategy1));

        // console2.log("PoolIdSignaling: %s", poolIdSignaling);
        // console2.log("Strategy2 Addr: %s", address(strategy2));
        // console2.log("Token Addr: %s", address(token));
        // console2.log("Token Native Addr: %s", address(NATIVE));

        // console2.log("Allo Registry Addr: %s", address(registry));
        // console2.log("Council Safe Addr: %s", address(councilSafeOwner));
    }
}
