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
// import {MockERC20 as AMockERC20} from "allo-v2-test/utils/MockERC20.sol";
import {TERC20} from "../test/shared/TERC20.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

contract DeployCV is Native, CVStrategyHelpers, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50 ether;
    uint256 public constant COMMUNITY_FEE = 1 * 10 ** 4;

    TERC20 public token;

    Allo _allo_;
    Registry _registry_;

    function pool_admin() public virtual override returns (address) {
        return address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }

    function allo_owner() public virtual override returns (address) {
        return address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }

    function run() public {
        vm.startBroadcast(pool_admin());

        Allo allo = Allo(deployAllo());

        token = new TERC20("sepolia Honey", "sepHNY", 18);

        IRegistry registry = allo.getRegistry();

        RegistryFactory registryFactory = new RegistryFactory();

        console2.log("Registry Factory Addr: %s", address(registryFactory));

        RegistryCommunity.InitializeParams memory params;

        params._allo = address(allo);
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 0;
        params._metadata = metadata; // convenant ipfs
        params._councilSafe = payable(address(_councilSafe()));
        params._communityName = "Pioneers of Sepolia";

        RegistryCommunity registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));

        token.mint(address(pool_admin()), 10_000 ether);

        CVStrategy strategy1 = new CVStrategy(address(allo));

        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1))
        );
        CVStrategy strategy2 = new CVStrategy(address(allo));
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy2))
        );
        // FAST 1 MIN GROWTH

        uint256 poolId = createPool(
            Allo(address(allo)),
            address(strategy1),
            address(registryCommunity),
            registry,
            address(token),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Unlimited
        );

        uint256 poolIdFixed = createPool(
            Allo(address(allo)),
            address(strategy2),
            address(registryCommunity),
            registry,
            address(token),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Fixed
        );

        // uint256 poolIdSignaling = createPool(
        //     Allo(address(allo)),
        //     address(strategy2),
        //     address(registryCommunity),
        //     registry,
        //     address(0),
        //     StrategyStruct.ProposalType.Signaling,
        //     StrategyStruct.PointSystem.Unlimited
        // );

        strategy1.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        strategy1.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        strategy1.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

        // FAST 1 MIN GROWTH
        strategy2.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        strategy2.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        strategy2.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight
        vm.stopBroadcast();

        address[] memory membersStaked = new address[](4);
        membersStaked[0] = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        membersStaked[1] = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        membersStaked[2] = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        membersStaked[3] = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);

        for (uint256 i = 0; i < membersStaked.length; i++) {
            vm.startBroadcast(address(membersStaked[i]));
            token.mint(address(membersStaked[i]), MINIMUM_STAKE * 2);
            token.approve(address(registryCommunity), MINIMUM_STAKE);
            registryCommunity.stakeAndRegisterMember();
            strategy1.activatePoints();
            strategy2.activatePoints();

            vm.stopBroadcast();
        }
        vm.startBroadcast(pool_admin());

        token.approve(address(allo), type(uint256).max);
        allo.fundPool(poolId, 3_000 ether); // ether
        allo.fundPool(poolIdFixed, 1_000 ether); // ether

        // StrategyStruct.CreateProposal memory proposal =
        //     StrategyStruct.CreateProposal(poolId, membersStaked[0], 50 ether, address(token), metadata);
        // bytes memory data = abi.encode(proposal);
        // allo.registerRecipient(poolId, data);

        // proposal = StrategyStruct.CreateProposal(poolId, membersStaked[1], 25 ether, address(token), metadata);
        // data = abi.encode(proposal);
        // allo.registerRecipient(poolId, data);

        // proposal = StrategyStruct.CreateProposal(poolId, membersStaked[2], 10 ether, address(token), metadata);
        // data = abi.encode(proposal);
        // allo.registerRecipient(poolId, data);

        // allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        StrategyStruct.CreateProposal memory proposal2 =
            StrategyStruct.CreateProposal(poolIdFixed, membersStaked[0], 0, address(token), metadata);
        bytes memory data2 = abi.encode(proposal2);
        allo.registerRecipient(poolIdFixed, data2);
        vm.stopBroadcast();

        create_community(allo, registryFactory);

        console2.log("PoolId: %s", poolId);
        console2.log("Strategy1 Addr: %s", address(strategy1));

        console2.log("poolIdQuadratic: %s", poolIdFixed);
        console2.log("Strategy2 Addr: %s", address(strategy2));

        console2.log("Allo Addr: %s", address(allo));
        console2.log("Token Addr: %s", address(token));
        console2.log("Token Native Addr: %s", address(NATIVE));

        console2.log("Registry Gardens Addr: %s", address(registryCommunity));

        console2.log("Allo Registry Addr: %s", address(registry));
        console2.log("Pool Admin Addr: %s", pool_admin());
        console2.log("Council Safe Addr: %s", address(_councilSafe()));
    }

    function create_community(Allo allo, RegistryFactory registryFactory) public {
        vm.startBroadcast(pool_admin());

        token = new TERC20("sepolia Matias", "sepMAT", 18);

        IRegistry registry = allo.getRegistry();

        // RegistryFactory registryFactory = new RegistryFactory();

        // console2.log("Registry Factory Addr: %s", address(registryFactory));

        RegistryCommunity.InitializeParams memory params;

        params._allo = address(allo);
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = COMMUNITY_FEE;
        params._metadata = metadata; // convenant ipfs
        params._councilSafe = payable(address(_councilSafe()));
        params._communityName = "Pioneers of Matias";

        RegistryCommunity registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));

        token.mint(address(pool_admin()), 10_000 ether);

        CVStrategy strategy1 = new CVStrategy(address(allo));

        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1))
        );
        CVStrategy strategy2 = new CVStrategy(address(allo));
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy2))
        );
        // FAST 1 MIN GROWTH

        uint256 poolId = createPool(
            Allo(address(allo)),
            address(strategy1),
            address(registryCommunity),
            registry,
            address(token),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Unlimited
        );

        uint256 poolIdFixed = createPool(
            Allo(address(allo)),
            address(strategy2),
            address(registryCommunity),
            registry,
            address(token),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Fixed
        );

        // uint256 poolIdSignaling = createPool(
        //     Allo(address(allo)),
        //     address(strategy2),
        //     address(registryCommunity),
        //     registry,
        //     address(0),
        //     StrategyStruct.ProposalType.Signaling,
        //     StrategyStruct.PointSystem.Unlimited
        // );

        strategy1.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        strategy1.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        strategy1.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

        // FAST 1 MIN GROWTH
        strategy2.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        strategy2.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        strategy2.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight
        vm.stopBroadcast();

        address[] memory membersStaked = new address[](4);
        membersStaked[0] = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        membersStaked[1] = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        membersStaked[2] = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        membersStaked[3] = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);

        for (uint256 i = 0; i < membersStaked.length; i++) {
            vm.startBroadcast(address(membersStaked[i]));
            token.mint(address(membersStaked[i]), MINIMUM_STAKE * 2);
            token.approve(address(registryCommunity), MINIMUM_STAKE + (MINIMUM_STAKE * COMMUNITY_FEE / 100e4));
            registryCommunity.stakeAndRegisterMember();
            strategy1.activatePoints();
            strategy2.activatePoints();

            vm.stopBroadcast();
        }
        vm.startBroadcast(pool_admin());

        token.approve(address(allo), type(uint256).max);
        allo.fundPool(poolId, 3_000 ether); // ether
        allo.fundPool(poolIdFixed, 1_000 ether); // ether

        StrategyStruct.CreateProposal memory proposal =
            StrategyStruct.CreateProposal(poolId, membersStaked[0], 50 ether, address(token), metadata);
        bytes memory data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal = StrategyStruct.CreateProposal(poolId, membersStaked[1], 25 ether, address(token), metadata);
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal = StrategyStruct.CreateProposal(poolId, membersStaked[2], 10 ether, address(token), metadata);
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        // allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        StrategyStruct.CreateProposal memory proposal2 =
            StrategyStruct.CreateProposal(poolIdFixed, membersStaked[0], 0, address(token), metadata);
        bytes memory data2 = abi.encode(proposal2);
        allo.registerRecipient(poolIdFixed, data2);
        vm.stopBroadcast();

        console2.log("PoolId: %s", poolId);
        console2.log("Strategy1 Addr: %s", address(strategy1));

        console2.log("poolIdQuadratic: %s", poolIdFixed);
        console2.log("Strategy2 Addr: %s", address(strategy2));

        console2.log("Allo Addr: %s", address(allo));
        console2.log("Token Addr: %s", address(token));
        console2.log("Token Native Addr: %s", address(NATIVE));

        console2.log("Registry Gardens Addr: %s", address(registryCommunity));

        console2.log("Allo Registry Addr: %s", address(registry));
        console2.log("Pool Admin Addr: %s", pool_admin());
        console2.log("Council Safe Addr: %s", address(_councilSafe()));
    }

    function deployAllo() public returns (address) {
        _registry_ = new Registry();
        _registry_.initialize(registry_owner());
        _allo_ = new Allo();

        _allo_.initialize(
            allo_owner(), // _owner
            address(_registry_), // _registry
            allo_treasury(), // _treasury
            0, // _percentFee
            0 // _baseFee
        );

        return address(_allo_);
    }
}
