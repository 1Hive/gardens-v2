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

contract DeployCVArbSepoliaPool is Native, CVStrategyHelpers, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50;

    address public constant SENDER = 0x2F9e113434aeBDd70bB99cB6505e1F726C578D6d;

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
        AMockERC20 token = AMockERC20(0xcc6c8B9f745dB2277f7aaC1Bc026d5C2Ea7bD88D);

        // IRegistry registry = allo.getRegistry();
        // console2.log("Registry Addr: %s", address(registry));

        // console2.log("Pool Admin Addr: %s", pool_admin());

        vm.startBroadcast(pool_admin());

        // AMockERC20 token = new AMockERC20();
        // console2.log("Token Addr: %s", address(token));
        // Safe councilSafeDeploy = _councilSafeWithOwner(pool_admin());
        Safe councilSafeDeploy = Safe(payable(0xEf5769BB4a3b0927595b01Fccf8F9acABe8C3618));

        // RegistryFactory registryFactory = new RegistryFactory();
        // RegistryFactory registryFactory = RegistryFactory(0xeE8B920641210e26d4D18BD285A862156f31556f);

        // RegistryCommunity.InitializeParams memory params;

        // params._allo = address(allo);
        // params._gardenToken = IERC20(address(token));
        // params._registerStakeAmount = MINIMUM_STAKE;
        // params._communityFee = 0;
        // params._metadata = metadata; // convenant ipfs
        // params._councilSafe = payable(address(councilSafeDeploy));
        // // params._councilSafe = payable(address(_councilSafeWithOwner(pool_admin());
        // params._communityName = "GardensDAO";

        // RegistryCommunity registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        RegistryCommunity registryCommunity = RegistryCommunity(0xBe665Ca945316f27e853d430251DC12FD7A8e755);

        console2.log("Comm Safe Addr: %s", address(registryCommunity.councilSafe()));

        assertTrue(address(registryCommunity.councilSafe()) != address(0), "Council Safe not set");
        assertTrue(address(registryCommunity.councilSafe()) == address(councilSafeDeploy), "Council Safe not set2");

        // console2.log("Registry Factory Addr: %s", address(registryFactory));
        // console2.log("Registry Community Addr: %s", address(registryCommunity));

        StrategyStruct.InitializeParams memory paramsCV = getParams(
            address(registryCommunity), StrategyStruct.ProposalType.Funding, StrategyStruct.PointSystem.Capped
        );

        paramsCV.decay = _etherToFloat(0.9965402 ether); // alpha = decay
        paramsCV.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        paramsCV.weight = _etherToFloat(0.001 ether); // RHO = p  = weight
        // params.minThresholdStakePercentage = 0.2 ether; // 20%
        // paramsCV.registryCommunity = address(registryCommunity);
        // paramsCV.proposalType = StrategyStruct.ProposalType.Funding;

        CVStrategy strategy1 = new CVStrategy(address(allo));
        CVStrategy strategy2 = new CVStrategy(address(allo));

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

        (uint256 poolId,) = registryCommunity.createPool(address(strategy1), address(token), paramsCV, metadata);
        console2.log("PoolId: %s", poolId);

        assertTrue(strategy1.proposalType() == StrategyStruct.ProposalType.Funding, "ProposalType not set");

        paramsCV.pointSystem = StrategyStruct.PointSystem.Unlimited;
        (uint256 poolId2,) = registryCommunity.createPool(address(strategy2), address(token), paramsCV, metadata);

        token.mint(address(pool_admin()), 10_000);
        token.approve(address(allo), type(uint256).max);
        allo.fundPool(poolId, 1_000);
        allo.fundPool(poolId2, 1_500);

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
