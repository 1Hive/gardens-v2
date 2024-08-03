// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/CVStrategy.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
// import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpersV0_0} from "../test/CVStrategyHelpersV0_0.sol";
import {TERC20} from "../test/shared/TERC20.sol";
import {CVStrategyV0_0} from "../src/CVStrategyV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactoryV0_0.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunityV0_0.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
// import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {IRegistry, Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployCV is Native, CVStrategyHelpersV0_0, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50 ether;
    uint256 public constant COMMUNITY_FEE = 1 * PERCENTAGE_SCALE;
    address public constant FEE_RECEIVER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    uint256 public constant MINIMUM_SCORER_THRESHOLD = 20 ether;

    TERC20 public token;

    Allo _allo_;
    Registry _registry_;
    Allo allo;
    IRegistry registry;
    ISybilScorer sybilScorer;
    RegistryFactoryV0_0 registryFactory;
    IArbitrator safeArbitrator;

    function pool_admin() public virtual override returns (address) {
        return address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }

    function allo_owner() public virtual override returns (address) {
        return address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }

    function scorer_list_manager() public virtual returns (address) {
        return address(0xa0Ee7A142d267C1f36714E4a8F75612F20a79720);
    }

    function run() public {
        vm.startBroadcast(pool_admin());

        allo = Allo(deployAllo());

        token = new TERC20("sepolia Honey", "sepHNY", 18);

        console2.log("sepHNY Token Addr: %s", address(token));

        registry = allo.getRegistry();

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new PassportScorer()),
            abi.encodeWithSelector(PassportScorer.initialize.selector, address(scorer_list_manager()))
        );

        sybilScorer = PassportScorer(payable(address(proxy)));

        // registryFactory = new RegistryFactoryV0_0();
        address protocolFeeReceiver = address(this);

        proxy = new ERC1967Proxy(
            address(new RegistryFactoryV0_0()),
            abi.encodeWithSelector(RegistryFactoryV0_0.initialize.selector, address(protocolFeeReceiver))
        );

        registryFactory = RegistryFactoryV0_0(address(proxy));

        console2.log("Registry Factory Addr: %s", address(registryFactory));

        safeArbitrator = new SafeArbitrator(2 ether);
        console2.log("Safe Arbitrator Addr: %s", address(safeArbitrator));

        safeArbitrator = new SafeArbitrator(2 ether);
        console2.log("Safe Arbitrator Addr: %s", address(safeArbitrator));

        RegistryCommunityV0_0.InitializeParams memory params;

        proxy = new ERC1967Proxy(
            address(new CVStrategyV0_0()), abi.encodeWithSelector(CVStrategyV0_0.init.selector, address(allo))
        );

        CVStrategyV0_0 cvStrategyTemplate = CVStrategyV0_0(payable(address(proxy)));

        assertEq(address(cvStrategyTemplate.getAllo()), address(allo), "CVStrategy initialized");

        params._strategyTemplate = address(cvStrategyTemplate);

        params._allo = address(allo);
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 0;
        params._metadata = metadata; // convenant ipfs
        params._councilSafe = payable(address(_councilSafe()));
        params._communityName = "Pioneers of Sepolia";

        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(registryFactory.createRegistry(params));

        token.mint(address(pool_admin()), 10_000 ether);

        StrategyStruct.PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;

        StrategyStruct.InitializeParams memory paramsCV;

        paramsCV.decay = _etherToFloat(0.9999799 ether); // alpha = decay
        // paramsCV.decay = _etherToFloat(0.9999 ether); // alpha = decay
        paramsCV.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        paramsCV.weight = _etherToFloat(0.001 ether); // RHO = p  = weight
        // paramsCV.minThresholdStakePercentage = 0.2 ether; // 20%
        paramsCV.registryCommunity = address(registryCommunity);
        paramsCV.proposalType = StrategyStruct.ProposalType.Funding;
        paramsCV.pointSystem = StrategyStruct.PointSystem.Unlimited;

        if (pointConfig.maxAmount == 0) {
            // StrategyStruct.PointSystemConfig memory pointConfig;
            //Capped point system
            pointConfig.maxAmount = 200 * DECIMALS;
        }
        paramsCV.pointConfig = pointConfig;

        address collateralVaultTemplate = address(new CollateralVault());

        paramsCV.arbitrableConfig = StrategyStruct.ArbitrableConfig(
            IArbitrator(address(safeArbitrator)),
            payable(address(_councilSafe())),
            2 ether,
            1,
            300,
            collateralVaultTemplate
        ); // Using council safe as tribinal just for testing

        // FAST 1 MIN GROWTH
        (uint256 poolId, address _strategy1) = registryCommunity.createPool(
            address(token), paramsCV, Metadata({protocol: 1, pointer: "QmVtM9MpAJLre2TZXqRc2FTeEdseeY1HTkQUe7QuwGcEAN"})
        );
        console2.log("Collateral Vault 1 Addr: %s", CVStrategy(payable(_strategy1)).getCollateralVault());

        CVStrategy strategy1 = CVStrategy(payable(_strategy1));

        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1))
        );

        paramsCV.proposalType = StrategyStruct.ProposalType.Signaling;
        paramsCV.pointSystem = StrategyStruct.PointSystem.Fixed;

        paramsCV.arbitrableConfig = StrategyStruct.ArbitrableConfig(
            IArbitrator(address(safeArbitrator)),
            payable(address(_councilSafe())),
            3 ether,
            1,
            600,
            collateralVaultTemplate
        );

        (uint256 poolIdFixed, address _strategy2) = registryCommunity.createPool(address(token), paramsCV, metadata);
        console2.log("Collateral Vault 1 Addr: %s", CVStrategy(payable(_strategy2)).getCollateralVault());

        CVStrategy strategy2 = CVStrategy(payable(_strategy2));

        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy2))
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

        // strategy1.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        safeHelper(
            address(strategy1), 0, abi.encodeWithSelector(strategy1.setDecay.selector, _etherToFloat(0.9965402 ether))
        );

        // strategy1.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        safeHelper(
            address(strategy1), 0, abi.encodeWithSelector(strategy1.setMaxRatio.selector, _etherToFloat(0.1 ether))
        );
        // strategy1.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight
        safeHelper(
            address(strategy1), 0, abi.encodeWithSelector(strategy1.setWeight.selector, _etherToFloat(0.0005 ether))
        );

        // FAST 1 MIN GROWTH
        // strategy2.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        safeHelper(
            address(strategy2), 0, abi.encodeWithSelector(strategy2.setDecay.selector, _etherToFloat(0.9965402 ether))
        );
        // strategy2.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        safeHelper(
            address(strategy2), 0, abi.encodeWithSelector(strategy2.setMaxRatio.selector, _etherToFloat(0.1 ether))
        );
        // strategy2.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight
        safeHelper(
            address(strategy2), 0, abi.encodeWithSelector(strategy2.setWeight.selector, _etherToFloat(0.0005 ether))
        );
        vm.stopBroadcast();

        address[] memory membersStaked = new address[](7);
        membersStaked[0] = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        membersStaked[1] = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        membersStaked[2] = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        membersStaked[3] = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
        membersStaked[4] = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);
        membersStaked[5] = address(0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc);
        membersStaked[6] = address(0x976EA74026E726554dB657fA54763abd0C3a0aa9);

        for (uint256 i = 0; i < membersStaked.length; i++) {
            vm.startBroadcast(address(membersStaked[i]));
            token.mint(address(membersStaked[i]), MINIMUM_STAKE * 2);
            if (i < 4) {
                token.approve(address(registryCommunity), MINIMUM_STAKE);
                registryCommunity.stakeAndRegisterMember();
                strategy1.activatePoints();
                strategy2.activatePoints();
            }

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

        console2.log("Scorer Address: %s", address(sybilScorer));

        create_community();

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

    function _getPointConfig() internal pure returns (StrategyStruct.PointSystemConfig memory) {
        StrategyStruct.PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;
        return pointConfig;
    }

    function create_community() public {
        vm.startBroadcast(pool_admin());

        token = new TERC20("sepolia Matias", "sepMAT", 18);

        // RegistryFactoryV0_0 registryFactory = new RegistryFactoryV0_0();

        // console2.log("Registry Factory Addr: %s", address(registryFactory));

        RegistryCommunityV0_0.InitializeParams memory params;

        params._allo = address(allo);
        params._strategyTemplate = address(new CVStrategy(address(allo)));
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = COMMUNITY_FEE;
        params._feeReceiver = address(FEE_RECEIVER);
        params._metadata = metadata; // convenant ipfs
        params._councilSafe = payable(address(_councilSafe()));
        params._communityName = "Pioneers of Matias";

        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(registryFactory.createRegistry(params));

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
            StrategyStruct.PointSystem.Unlimited,
            _getPointConfig()
        );

        uint256 poolIdFixed = createPool(
            Allo(address(allo)),
            address(strategy2),
            address(registryCommunity),
            registry,
            address(token),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Fixed,
            _getPointConfig()
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

        address[] memory membersStaked = new address[](5);
        membersStaked[0] = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        membersStaked[1] = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        membersStaked[2] = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        membersStaked[3] = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
        membersStaked[4] = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);

        for (uint256 i = 0; i < membersStaked.length; i++) {
            vm.startBroadcast(address(membersStaked[i]));
            token.mint(address(membersStaked[i]), MINIMUM_STAKE * 2);
            if (i < 4) {
                token.approve(address(registryCommunity), MINIMUM_STAKE + (MINIMUM_STAKE * COMMUNITY_FEE / 100e4));
                registryCommunity.stakeAndRegisterMember();
                strategy1.activatePoints();
                strategy2.activatePoints();
            }

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

        console2.log("poolIdFixed: %s", poolIdFixed);
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
