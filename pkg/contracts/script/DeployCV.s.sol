// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
// import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {SafeArbitrator, IArbitrator} from "../src/SafeArbitrator.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpers, CVStrategy} from "../test/CVStrategyHelpers.sol";
import {TERC20} from "../test/shared/TERC20.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity, RegistryCommunityInitializeParams} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {CommunityDiamondConfigurator} from "../test/helpers/CommunityDiamondConfigurator.sol";
import {StrategyDiamondConfigurator} from "../test/helpers/StrategyDiamondConfigurator.sol";
// import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {IRegistry, Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";
import {
    CVStrategy,
    PointSystemConfig,
    PointSystem,
    ArbitrableConfig,
    ProposalType,
    CreateProposal
} from "../src/CVStrategy/CVStrategy.sol";
import {CVStrategyInitializeParamsV0_2} from "../src/CVStrategy/CVStrategy.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployCV is Native, CVStrategyHelpers, Script, SafeSetup {
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
    RegistryFactory registryFactory;
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

        ERC1967Proxy scorerProxy = new ERC1967Proxy(
            address(new PassportScorer()),
            abi.encodeWithSelector(PassportScorer.initialize.selector, address(scorer_list_manager()))
        );

        sybilScorer = PassportScorer(payable(address(scorerProxy)));

        address protocolFeeReceiver = address(this);

        ERC1967Proxy factoryProxy = new ERC1967Proxy(
            address(new RegistryFactory()),
            abi.encodeWithSelector(
                RegistryFactory.initialize.selector,
                pool_admin(),
                address(protocolFeeReceiver),
                address(new RegistryCommunity()),
                address(new CVStrategy()),
                address(new CollateralVault())
            )
        );
        registryFactory = RegistryFactory(address(factoryProxy));
        console2.log("Registry Factory Addr: %s", address(registryFactory));

        ERC1967Proxy arbitratorProxy = new ERC1967Proxy(
            address(new SafeArbitrator()), abi.encodeWithSelector(SafeArbitrator.initialize.selector, 2 ether)
        );

        safeArbitrator = SafeArbitrator(payable(address(arbitratorProxy)));

        console2.log("Safe Arbitrator Addr: %s", address(safeArbitrator));

        RegistryCommunityInitializeParams memory params;

        params._allo = address(allo);
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 0;
        params._metadata = metadata; // convenant ipfs
        params._councilSafe = payable(address(_councilSafe()));
        params._communityName = "Pioneers of Sepolia";

        RegistryCommunity registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        token.mint(address(pool_admin()), 10_000 ether);

        CVStrategyInitializeParamsV0_2 memory paramsCV;

        // CVParams
        paramsCV.cvParams.decay = _etherToFloat(0.9999799 ether); // alpha = decay
        paramsCV.cvParams.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        paramsCV.cvParams.weight = _etherToFloat(0.001 ether); // RHO = p  = weight
        paramsCV.cvParams.minThresholdPoints = 0.2 ether; // 20%

        paramsCV.registryCommunity = address(registryCommunity);
        paramsCV.proposalType = ProposalType.Funding;
        paramsCV.pointSystem = PointSystem.Unlimited;
        paramsCV.sybilScorer = address(sybilScorer);
        paramsCV.sybilScorerThreshold = 1;

        // Point config
        PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;
        if (pointConfig.maxAmount == 0) {
            // PointSystemConfig memory pointConfig;
            //Capped point system
            pointConfig.maxAmount = 200 * DECIMALS;
        }
        paramsCV.pointConfig = pointConfig;

        // ArbitrableConfig
        ArbitrableConfig memory arbitrableConfig;
        arbitrableConfig.arbitrator = safeArbitrator;
        arbitrableConfig.tribunalSafe = payable(address(_councilSafe()));
        arbitrableConfig.submitterCollateralAmount = 0.1 ether;
        arbitrableConfig.challengerCollateralAmount = 0.2 ether;
        arbitrableConfig.defaultRuling = 1;
        arbitrableConfig.defaultRulingTimeout = 900; // 15 minutes
        paramsCV.arbitrableConfig = arbitrableConfig;

        // FAST 1 MIN GROWTH
        (uint256 poolId, address _strategy1) = registryCommunity.createPool(
            address(token), paramsCV, Metadata({protocol: 1, pointer: "QmVtM9MpAJLre2TZXqRc2FTeEdseeY1HTkQUe7QuwGcEAN"})
        );
        CVStrategy strategy1 = CVStrategy(payable(_strategy1));

        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1))
        );

        paramsCV.proposalType = ProposalType.Signaling;
        paramsCV.pointSystem = PointSystem.Fixed;

        (uint256 poolIdFixed, address _strategy2) = registryCommunity.createPool(address(token), paramsCV, metadata);

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
        //     ProposalType.Signaling,
        //     PointSystem.Unlimited
        // );

        // strategy1.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        // strategy1.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        // strategy1.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight
        // CVParams memory poolParams1;
        // poolParams1.decay = _etherToFloat(0.9999799 ether); // alpha = decay
        // poolParams1.maxRatio = _etherToFloat(0.1 ether); // beta = maxRatio
        // poolParams1.weight = _etherToFloat(0.0005 ether); // RHO = p  = weight
        // safeHelper(
        //     address(strategy1),
        //     0,
        //     abi.encodeWithSelector(strategy1.setPoolParams.selector, poolParams1, arbitrableConfig)
        // );

        // // FAST 1 MIN GROWTH
        // // strategy2.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        // safeHelper(
        //     address(strategy2),
        //     0,
        //     abi.encodeWithSelector(strategy1.setPoolParams.selector, poolParams1, arbitrableConfig)
        // );
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
                registryCommunity.stakeAndRegisterMember("");
                strategy1.activatePoints();
                strategy2.activatePoints();
            }

            vm.stopBroadcast();
        }
        vm.startBroadcast(pool_admin());

        token.approve(address(allo), type(uint256).max);
        // allo.fundPool(poolId, 3_000 ether); // ether
        // allo.fundPool(poolIdFixed, 1_000 ether); // ether

        // CreateProposal memory proposal =
        //     CreateProposal(poolId, membersStaked[0], 50 ether, address(token), metadata);
        // bytes memory data = abi.encode(proposal);
        // allo.registerRecipient{value:2 ether}(poolId, data);

        // proposal = CreateProposal(poolId, membersStaked[1], 25 ether, address(token), metadata);
        // data = abi.encode(proposal);
        // allo.registerRecipient{value:2 ether}(poolId, data);

        // proposal = CreateProposal(poolId, membersStaked[2], 10 ether, address(token), metadata);
        // data = abi.encode(proposal);
        // allo.registerRecipient{value:2 ether}(poolId, data);

        // allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        CreateProposal memory proposal2 = CreateProposal(poolIdFixed, membersStaked[0], 0, address(token), metadata);
        bytes memory data2 = abi.encode(proposal2);
        allo.registerRecipient{value: 3 ether}(poolIdFixed, data2);
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

    function _getPointConfig() internal pure returns (PointSystemConfig memory) {
        PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;
        return pointConfig;
    }

    function create_community() public {
        vm.startBroadcast(pool_admin());

        token = new TERC20("sepolia Matias", "sepMAT", 18);

        // RegistryFactory registryFactory = new RegistryFactory();

        // console2.log("Registry Factory Addr: %s", address(registryFactory));

        RegistryCommunityInitializeParams memory params;

        params._allo = address(allo);

        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = COMMUNITY_FEE;
        params._feeReceiver = address(FEE_RECEIVER);
        params._metadata = metadata; // convenant ipfs
        params._councilSafe = payable(address(_councilSafe()));
        params._communityName = "Pioneers of Matias";

        CommunityDiamondConfigurator communityDiamondConfigurator = new CommunityDiamondConfigurator();
        StrategyDiamondConfigurator diamondConfigurator = new StrategyDiamondConfigurator();
        registryFactory.initializeV2(
            communityDiamondConfigurator.getFacetCuts(),
            address(communityDiamondConfigurator.diamondInit()),
            abi.encodeCall(RegistryCommunityDiamondInit.init, ()),
            diamondConfigurator.getFacetCuts(),
            address(diamondConfigurator.diamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );
        RegistryCommunity registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));

        console.log("Registry Community Addr: %s", address(registryCommunity));

        token.mint(address(pool_admin()), 10_000 ether);
        ERC1967Proxy strategy1Proxy = new ERC1967Proxy(
            address(new CVStrategy()),
            abi.encodeWithSelector(
                CVStrategy.init.selector, address(allo), address(new CollateralVault()), pool_admin()
            )
        );
        CVStrategy strategy1 = CVStrategy(payable(strategy1Proxy));

        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy1Proxy))
        );

        ERC1967Proxy strategy2Proxy = new ERC1967Proxy(
            address(new CVStrategy()),
            abi.encodeWithSelector(
                CVStrategy.init.selector, address(allo), address(new CollateralVault()), pool_admin()
            )
        );

        CVStrategy strategy2 = CVStrategy(payable(strategy2Proxy));

        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy2))
        );

        // ArbitrableConfig
        ArbitrableConfig memory arbitrableConfig;
        arbitrableConfig.arbitrator = safeArbitrator;
        arbitrableConfig.tribunalSafe = payable(address(_councilSafe()));
        arbitrableConfig.submitterCollateralAmount = 0.1 ether;
        arbitrableConfig.challengerCollateralAmount = 0.2 ether;
        arbitrableConfig.defaultRuling = 1;
        arbitrableConfig.defaultRulingTimeout = 900; // 15 minutes

        // FAST 1 MIN GROWTH
        uint256 poolId = createPool(
            Allo(address(allo)),
            address(strategy1),
            address(registryCommunity),
            registry,
            address(token),
            ProposalType.Funding,
            PointSystem.Unlimited,
            _getPointConfig(),
            arbitrableConfig
        );

        uint256 poolIdFixed = createPool(
            Allo(address(allo)),
            address(strategy2),
            address(registryCommunity),
            registry,
            address(token),
            ProposalType.Funding,
            PointSystem.Fixed,
            _getPointConfig(),
            arbitrableConfig
        );

        // uint256 poolIdSignaling = createPool(
        //     Allo(address(allo)),
        //     address(strategy2),
        //     address(registryCommunity),
        //     registry,
        //     address(0),
        //     ProposalType.Signaling,
        //     PointSystem.Unlimited
        // );

        // Goss: Commented because already set in getParams
        // CVParams memory poolParams1;
        // poolParams1.decay = _etherToFloat(0.9999799 ether); // alpha = decay
        // poolParams1.maxRatio = _etherToFloat(0.1 ether); // beta = maxRatio
        // poolParams1.weight = _etherToFloat(0.0005 ether); // RHO = p  = weight

        // Goss: Commented because already set in getParams
        // alpha = decay
        // beta = maxRatio
        // RHO = p  = weight
        // strategy1.setPoolParams(abi.encode(poolParams1, arbitrableConfig));

        // Goss: Commented because already set in getParams
        // FAST 1 MIN GROWTH
        // CVParams memory poolParams2;
        // poolParams2.decay = _etherToFloat(0.9965402 ether); // alpha = decay
        // poolParams2.maxRatio = _etherToFloat(0.1 ether); // beta = maxRatio
        // poolParams2.weight = _etherToFloat(0.0005 ether); // RHO = p  = weight
        // strategy1.setPoolParams(abi.encode(poolParams2, arbitrableConfig));

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
                token.approve(address(registryCommunity), MINIMUM_STAKE + ((MINIMUM_STAKE * COMMUNITY_FEE) / 100e4));
                registryCommunity.stakeAndRegisterMember("");
                strategy1.activatePoints();
                strategy2.activatePoints();
            }

            vm.stopBroadcast();
        }
        vm.startBroadcast(pool_admin());

        token.approve(address(allo), type(uint256).max);
        // allo.fundPool(poolId, 3_000 ether); // ether
        // allo.fundPool(poolIdFixed, 1_000 ether); // ether

        CreateProposal memory proposal = CreateProposal(poolId, membersStaked[0], 50 ether, address(token), metadata);
        bytes memory data = abi.encode(proposal);
        allo.registerRecipient{value: 3 ether}(poolId, data);

        proposal = CreateProposal(poolId, membersStaked[1], 25 ether, address(token), metadata);
        data = abi.encode(proposal);

        allo.registerRecipient{value: 3 ether}(poolId, data);

        proposal = CreateProposal(poolId, membersStaked[2], 10 ether, address(token), metadata);

        data = abi.encode(proposal);
        allo.registerRecipient{value: 3 ether}(poolId, data);

        // allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        CreateProposal memory proposal2 = CreateProposal(poolIdFixed, membersStaked[0], 0, address(token), metadata);

        bytes memory data2 = abi.encode(proposal2);
        allo.registerRecipient{value: 3 ether}(poolIdFixed, data2);

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
