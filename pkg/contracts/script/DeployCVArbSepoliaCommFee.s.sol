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

contract DeployCVArbSepoliaCommFee is Native, CVStrategyHelpers, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50 ether;

    address public constant SENDER = 0x2F9e113434aeBDd70bB99cB6505e1F726C578D6d;

    address public TOKEN = 0xcc6c8B9f745dB2277f7aaC1Bc026d5C2Ea7bD88D;
    address public SAFE = 0xd96e152760BBc6502cAc7D2e43C34Da05230076c;
    // address public COMMUNITY = 0xfD4e8327aa3877dD010fd2d5411DF62FED8d262b;
    address public constant FACTORY = 0x197a3115f932DF5aEE2a4b5732E8586A00ccF243;

    Metadata metadata2 = Metadata({protocol: 1, pointer: "QmdRrdzXkxb9LSKVxJUmAkYzqqboo3aAjbnzVUdrbX6VSd"}); // BitcoinDAO metadata QmdRrdzXkxb9LSKVxJUmAkYzqqboo3aAjbnzVUdrbX6VSd

    function pool_admin() public virtual override returns (address) {
        return address(SENDER);
    }

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
        AMockERC20 token = AMockERC20(TOKEN);

        // IRegistry registry = allo.getRegistry();
        // console2.log("Registry Addr: %s", address(registry));

        // console2.log("Pool Admin Addr: %s", pool_admin());

        vm.startBroadcast(pool_admin());

        // AMockERC20 token = new AMockERC20();
        // console2.log("Token Addr: %s", address(token));
        Safe councilSafeDeploy = _councilSafeWithOwner(pool_admin());

        RegistryFactory registryFactory = RegistryFactory(FACTORY);
        // RegistryFactory registryFactory = new RegistryFactory();

        RegistryCommunity.InitializeParams memory params;

        params._strategyTemplate = address(new CVStrategy(address(allo)));
        params._allo = address(allo);
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 1e4;
        // params._metadata = metadata; // convenant ipfs
        params._metadata = metadata2; // BitcoinDAO metadata QmdRrdzXkxb9LSKVxJUmAkYzqqboo3aAjbnzVUdrbX6VSd
        params._councilSafe = payable(address(councilSafeDeploy));
        // params._councilSafe = payable(address(_councilSafeWithOwner(pool_admin());
        params._communityName = "BitcoinDAO";

        assertTrue(params._councilSafe != address(0));

        RegistryCommunity registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));

        // console2.log("Registry Factory Addr: %s", address(registryFactory));
        // console2.log("Registry Community Addr: %s", address(registryCommunity));
        StrategyStruct.PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;

        StrategyStruct.InitializeParams memory paramsCV = getParams(
            address(registryCommunity),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Unlimited,
            pointConfig
        );

        //Capped point system
        // paramsCV.pointConfig.maxAmount = 200 ether ;
        // //Fixed point system
        // paramsCV.pointConfig.pointsPerMember = 100 ether ;
        // //Quadratic point system
        // paramsCV.pointConfig.tokensPerPoint = 1 ether;
        // paramsCV.pointConfig.pointsPerTokenStaked = 5 ether ;

        paramsCV.decay = _etherToFloat(0.9965402 ether); // alpha = decay
        paramsCV.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        paramsCV.weight = _etherToFloat(0.001 ether); // RHO = p  = weight
        // params.minThresholdStakePercentage = 0.2 ether; // 20%
        // paramsCV.registryCommunity = address(registryCommunity);
        // paramsCV.proposalType = StrategyStruct.ProposalType.Funding;

        // CVStrategy strategy2 = new CVStrategy(address(allo));

        (uint256 poolId, address _strategy1) = registryCommunity.createPool(address(token), paramsCV, metadata2);

        CVStrategy strategy1 = CVStrategy(payable(_strategy1));

        safeHelper(
            councilSafeDeploy,
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1))
        );

        strategy1.setDecay(_etherToFloat(0.9965402 ether));
        // alpha = decay
        strategy1.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        strategy1.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

        console2.log("balance of pool admin:        %s", token.balanceOf(pool_admin()));
        token.mint(address(pool_admin()), 10_000_000_000 ether);
        token.approve(address(registryCommunity), type(uint256).max);
        //@todo get correct value instead infinite approval
        registryCommunity.stakeAndRegisterMember();

        strategy1.activatePoints();
        // strategy2.activatePoints();

        // allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        token.approve(address(allo), type(uint256).max);
        allo.fundPool(poolId, 1_000_000 ether);

        StrategyStruct.CreateProposal memory proposal =
            StrategyStruct.CreateProposal(poolId, pool_admin(), 100 ether, address(token), metadata2);
        bytes memory data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);
        // StrategyStruct.ProposalType.Funding
        proposal = StrategyStruct.CreateProposal(poolId, pool_admin(), 1_000 ether, address(token), metadata2);
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal = StrategyStruct.CreateProposal(poolId, pool_admin(), 10_000 ether, address(token), metadata2);
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        vm.stopBroadcast();

        console2.log("PoolId: %s", poolId);
        // console2.log("Strategy1 Addr: %s", address(strategy1));

        // console2.log("PoolIdSignaling: %s", poolIdSignaling);
        // console2.log("Strategy2 Addr: %s", address(strategy2));
        // console2.log("Token Addr: %s", address(token));
        // console2.log("Token Native Addr: %s", address(NATIVE));

        // console2.log("Allo Registry Addr: %s", address(registry));
        // console2.log("Council Safe Addr: %s", address(councilSafeOwner));
    }
}
