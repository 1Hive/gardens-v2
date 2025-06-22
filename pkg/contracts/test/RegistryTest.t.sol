// // SPDX-License-Identifier: AGPL-3.0-or-later
// pragma solidity ^0.8.19;

// import "forge-std/Test.sol";
// import "forge-std/console.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
// import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
// // Core contracts
// import {Allo} from "allo-v2-contracts/core/Allo.sol";
// import {Registry} from "allo-v2-contracts/core/Registry.sol";
// // Internal Libraries
// import {Errors} from "allo-v2-contracts/core/libraries/Errors.sol";
// import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
// import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
// // Test libraries
// import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
// import {RegistrySetupFull} from "allo-v2-test/foundry/shared/RegistrySetup.sol";
// import {TestStrategy} from "allo-v2-test/utils/TestStrategy.sol";
// import {MockStrategy} from "allo-v2-test/utils/MockStrategy.sol";
// import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
// import {GV2ERC20} from "../script/GV2ERC20.sol";
// import {GasHelpers2} from "./shared/GasHelpers2.sol";
// import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";
// import {RegistryFactoryV0_1} from "../src/RegistryFactory/RegistryFactoryV0_1.sol";
// import {
//     CVStrategyV0_0,
//     PointSystem,
//     ProposalType,
//     ArbitrableConfig,
//     PointSystemConfig
// } from "../src/CVStrategy/CVStrategyV0_0.sol";
// import {CollateralVault} from "../src/CollateralVault.sol";
// import {SafeArbitrator} from "../src/SafeArbitrator.sol";
// import {
//     RegistryCommunityV0_0,
//     CommunityParams,
//     RegistryCommunityInitializeParamsV0_0
// } from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
// import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
// import {SafeSetup} from "./shared/SafeSetup.sol";

// import {CVStrategyHelpers} from "./CVStrategyHelpers.sol";

// import {Native} from "allo-v2-contracts/core/libraries/Native.sol";

// import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
// // import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";
// import {Core} from "@openzeppelin/foundry/internal/Core.sol";

// import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
// import {RegistryFactoryDiamond, BaseDiamond} from "@src/diamonds/RegistryFactoryDiamond.sol";

// import {IDiamond} from "@src/diamonds/interfaces/IDiamond.sol";
// import {IDiamondCut} from "@src/diamonds/interfaces/IDiamondCut.sol";
// import {DiamondCutFacet} from "@src/diamonds/facets/DiamondCutFacet.sol";
// import {DiamondLoupeFacet} from "@src/diamonds/facets/DiamondLoupeFacet.sol";
// import {RegistryFactoryFacet} from "@src/diamonds/facets/RegistryFactoryFacet.sol";
// // @dev Run forge test --mc RegistryTest -vvvvv

// contract RegistryTest is Test, AlloSetup, RegistrySetupFull, CVStrategyHelpers, Errors, GasHelpers2, SafeSetup {
//     CVStrategyV0_0 public strategy;
//     uint256 public poolId;
//     IArbitrator safeArbitrator;
//     GV2ERC20 public token;
//     uint256 public mintAmount = 1_000_000 * DECIMALS;

//     uint256 public constant MINIMUM_STAKE = 50 * DECIMALS;
//     uint256 public constant SQRT_ONE_THOUSAND = 31622776601683793319;
//     // uint256 public constant PRECISION = 10 ** 4;
//     uint256 public constant PROTOCOL_FEE_PERCENTAGE = 22525; // 2.2525  * 10 ** 4
//     uint256 public constant COMMUNITY_FEE_PERCENTAGE = 3 * PERCENTAGE_SCALE;
//     uint256 public constant STAKE_WITH_FEES = MINIMUM_STAKE
//         + (MINIMUM_STAKE * (COMMUNITY_FEE_PERCENTAGE + PROTOCOL_FEE_PERCENTAGE)) / (100 * PERCENTAGE_SCALE);

//     // Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"});

//     RegistryFactoryV0_0 internal registryFactory;
//     RegistryCommunityV0_0 internal registryCommunity;
//     RegistryCommunityV0_0 internal nonKickableCommunity;

//     address gardenOwner = makeAddr("communityGardenOwner");
//     address gardenMember = makeAddr("communityGardenMember");
//     address protocolFeeReceiver = makeAddr("multisigReceiver");
//     address daoFeeReceiver = makeAddr("daoFeeReceiver");
//     address newCouncilSafe = makeAddr("newCouncilSafe");

//     function setUp() public {
//         __RegistrySetupFull();
//         __AlloSetup(address(registry()));

//         vm.startPrank(allo_owner());
//         allo().updateBaseFee(0);
//         allo().updatePercentFee(0);
//         vm.stopPrank();

//         token = new GV2ERC20("Mock Token", "MTK", 18);
//         token.mint(local(), mintAmount);
//         token.mint(allo_owner(), mintAmount);
//         token.mint(gardenOwner, mintAmount);
//         token.mint(gardenMember, mintAmount);
//         token.approve(address(allo()), mintAmount);

//         vm.startPrank(pool_admin());
//         token.approve(address(allo()), mintAmount);

//         //        strategy = address(new CVMockStrategy(address(allo())));

//         // ERC1967Proxy strategyProxy = new ERC1967Proxy(
//         //     address(new CVStrategyV0_0()),
//         //     abi.encodeWithSelector(
//         //         CVStrategyV0_0.init.selector, address(allo()), address(new CollateralVault()), pool_admin()
//         //     )
//         // );

//         ERC1967Proxy arbitratorProxy = new ERC1967Proxy(
//             address(new SafeArbitrator()), abi.encodeWithSelector(SafeArbitrator.initialize.selector, 2 ether)
//         );
//         safeArbitrator = SafeArbitrator(payable(address(arbitratorProxy)));

//         // strategy.init(address(allo()),address(this),address(this)); @todo Kev create a testRevert
//         // allo.createPoolWithCustomStrategy() @todo kev create new testRvert

//         //        strategy = address(new MockStrategy(address(allo())));
//         // uint256 /* _poolId */ = createPool(
//         //     allo(), address(strategy), address(_registryCommunity()), registry(), NATIVE, ProposalType(0)
//         // );
//         vm.stopPrank();
//         vm.startPrank(allo_owner());
//         allo().transferOwnership(local());
//         vm.stopPrank();
//         vm.startPrank(gardenOwner);
//         ERC1967Proxy proxy = new ERC1967Proxy(
//             address(new RegistryFactoryV0_0()),
//             abi.encodeWithSelector(
//                 RegistryFactoryV0_0.initialize.selector,
//                 gardenOwner,
//                 address(protocolFeeReceiver),
//                 address(new RegistryCommunityV0_0()),
//                 address(new CVStrategyV0_0()),
//                 address(new CollateralVault())
//             )
//         );

//         registryFactory = RegistryFactoryV0_0(address(proxy));

//         // registryFactory = new RegistryFactoryV0_0();
//         // _registryFactory().setReceiverAddress(address(protocolFeeReceiver));

//         vm.stopPrank();

//         RegistryCommunityInitializeParamsV0_0 memory params;
//         params._allo = address(allo());
//         params._gardenToken = IERC20(address(token));
//         params._registerStakeAmount = MINIMUM_STAKE;
//         params._communityFee = COMMUNITY_FEE_PERCENTAGE;
//         params._metadata = metadata;
//         params._feeReceiver = address(daoFeeReceiver);
//         params._councilSafe = payable(address(_councilSafe()));

//         params._isKickEnabled = true;

//         registryCommunity = RegistryCommunityV0_0(registryFactory.createRegistry(params));
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         (uint256 returnedPoolId, address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Unlimited,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 new address[](1),
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         strategy = CVStrategyV0_0(payable(strategyProxy));
//         poolId = returnedPoolId;
//         assertEq(registryFactory.nonce(), 1, "nonce before upgrade");

//         vm.startPrank(gardenOwner);
//         _registryFactory().setProtocolFee(address(registryCommunity), PROTOCOL_FEE_PERCENTAGE);

//         // Upgrades.upgradeProxy(
//         //     address(_registryFactory()),
//         //     "RegistryFactoryV0_1.sol",
//         //     abi.encodeWithSelector(RegistryFactoryV0_1.initializeV2.selector)
//         // );

//         // assertEq(registryFactory.nonce(), 1, "nonce after upgrade");

//         Core.upgradeProxyTo(
//             address(_registryFactory()),
//             address(new RegistryFactoryDiamond()),
//             abi.encodeWithSelector(BaseDiamond.initialize.selector, gardenOwner)
//         );

//         // RegistryFactoryFacet(address(_registryFactory())).initialize(gardenOwner);

//         IDiamondCut(address(_registryFactory())).diamondCut(createCutsFactory(), address(0), "");

//         RegistryFactoryFacet(address(_registryFactory())).initializeV2(gardenOwner);

//         assertEq(
//             address(RegistryFactoryDiamond(payable(address(registryFactory)))._owner()),
//             address(gardenOwner),
//             "owner after upgrade"
//         );
//         assertEq(registryFactory.nonce(), 1, "nonce after upgrade");
//         assertEq(registryFactory.VERSION(), "0.0", "VERSION after upgrade");

//         vm.stopPrank();

//         params._isKickEnabled = false;

//         nonKickableCommunity = RegistryCommunityV0_0(registryFactory.createRegistry(params));
//     }

//     function createCutsFactory() public returns (IDiamond.FacetCut[] memory cuts) {
//         DiamondCutFacet dCutFacet = new DiamondCutFacet(); //@todo can be removed
//         DiamondLoupeFacet dLoupe = new DiamondLoupeFacet();
//         // OwnershipFacet ownerF = new OwnershipFacet();
//         RegistryFactoryFacet registryFactoryF = new RegistryFactoryFacet();

//         cuts = new IDiamond.FacetCut[](3);

//         bytes4[] memory sighashes = new bytes4[](1);
//         sighashes[0] = bytes4(0x1f931c1c);

//         cuts[0] = IDiamond.FacetCut({
//             facetAddress: address(dCutFacet),
//             action: IDiamond.FacetCutAction.Add,
//             functionSelectors: sighashes
//         });

//         sighashes = new bytes4[](5);
//         sighashes[0] = bytes4(0x7a0ed627);
//         sighashes[1] = bytes4(0xadfca15e);
//         sighashes[2] = bytes4(0x52ef6b2c);
//         sighashes[3] = bytes4(0xcdffacc6);
//         sighashes[4] = bytes4(0x01ffc9a7);
//         //build cut struct
//         // IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](2);

//         cuts[1] = (
//             IDiamond.FacetCut({
//                 facetAddress: address(dLoupe),
//                 action: IDiamond.FacetCutAction.Add,
//                 functionSelectors: sighashes
//             })
//         );

//         // sighashes = new bytes4[](2);
//         // sighashes[0] = bytes4(0xf2fde38b);
//         // sighashes[1] = bytes4(0x8da5cb5b);

//         // cut[1] = (IDiamond.FacetCut({facetAddress: address(ownerF), action: IDiamond.FacetCutAction.Add, functionSelectors: sighashes}));

//         bytes4[] memory sighashesInit = new bytes4[](25);
//         sighashesInit[0] = bytes4(0x77122d56);
//         sighashesInit[1] = bytes4(0xbeb331a3);
//         sighashesInit[2] = bytes4(0xb8bed901);
//         sighashesInit[3] = bytes4(0xf5016b5e);
//         sighashesInit[4] = bytes4(0x987435be);
//         sighashesInit[5] = bytes4(0x0a992e0c);
//         sighashesInit[6] = bytes4(0xc4d66de8);
//         sighashesInit[7] = bytes4(0x1459457a);
//         sighashesInit[8] = bytes4(0x29b6eca9);
//         sighashesInit[9] = bytes4(0x3101cfcb);
//         sighashesInit[10] = bytes4(0xaffed0e0);
//         sighashesInit[11] = bytes4(0x8da5cb5b);
//         sighashesInit[12] = bytes4(0x52d1902d);
//         sighashesInit[13] = bytes4(0x02c1d0b1);
//         sighashesInit[14] = bytes4(0x715018a6);
//         sighashesInit[15] = bytes4(0xb0d3713a);
//         sighashesInit[16] = bytes4(0x5a2c8ace);
//         sighashesInit[17] = bytes4(0xb5b3ca2c);
//         sighashesInit[18] = bytes4(0x8279c7db);
//         sighashesInit[19] = bytes4(0x5decae02);
//         sighashesInit[20] = bytes4(0x1b71f0e4);
//         sighashesInit[21] = bytes4(0x5c94e4d2);
//         sighashesInit[22] = bytes4(0xf2fde38b);
//         sighashesInit[23] = bytes4(0x3659cfe6);
//         sighashesInit[24] = bytes4(0x4f1ef286);

//         cuts[2] = (
//             IDiamond.FacetCut({
//                 facetAddress: address(registryFactoryF),
//                 action: IDiamond.FacetCutAction.Add,
//                 functionSelectors: sighashesInit
//             })
//         );
//     }

//     function _registryCommunity() internal view returns (RegistryCommunityV0_0) {
//         return registryCommunity;
//     }

//     function _registryFactory() internal view returns (RegistryFactoryV0_0) {
//         return registryFactory;
//     }

//     function _nonKickableCommunity() internal view returns (RegistryCommunityV0_0) {
//         return nonKickableCommunity;
//     }

//     function _generateArbitrableConfig() internal returns (ArbitrableConfig memory) {
//         return ArbitrableConfig(safeArbitrator, payable(address(_councilSafe())), 3 ether, 2 ether, 1, 600);
//     }

//     function test_stakeAndRegisterMember() public {
//         startMeasuringGas("createProposal");
//         allo().addToCloneableStrategies(address(strategy));
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);

//         _registryCommunity().stakeAndRegisterMember("");
//         assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE);
//         assertEq(token.balanceOf(address(gardenMember)), mintAmount - STAKE_WITH_FEES);
//         uint256 protocolAmount = (MINIMUM_STAKE * PROTOCOL_FEE_PERCENTAGE) / (100 * PERCENTAGE_SCALE);
//         uint256 feeAmount = (MINIMUM_STAKE * COMMUNITY_FEE_PERCENTAGE) / (100 * PERCENTAGE_SCALE);
//         assertEq(token.balanceOf(address(protocolFeeReceiver)), protocolAmount);
//         assertEq(token.balanceOf(address(daoFeeReceiver)), feeAmount);
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_stakeAndRegisterMember_4_times() public {
//         startMeasuringGas("createProposal");
//         allo().addToCloneableStrategies(address(strategy));
//         address[] memory members = new address[](4);
//         members[0] = address(0x1);
//         members[1] = address(0x2);
//         members[2] = address(0x3);
//         members[3] = address(0x4);

//         for (uint256 i = 0; i < members.length; i++) {
//             vm.startPrank(members[i]);
//             token.mint(members[i], mintAmount);
//             token.approve(address(registryCommunity), STAKE_WITH_FEES);

//             _registryCommunity().stakeAndRegisterMember("");
//             vm.stopPrank();

//             assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE * (i + 1), "Registry balance");
//             assertEq(token.balanceOf(members[i]), mintAmount - STAKE_WITH_FEES, "Member balance");

//             uint256 protocolAmount = (MINIMUM_STAKE * PROTOCOL_FEE_PERCENTAGE * (i + 1)) / (100 * PERCENTAGE_SCALE);
//             uint256 feeAmount = (MINIMUM_STAKE * COMMUNITY_FEE_PERCENTAGE * (i + 1)) / (100 * PERCENTAGE_SCALE);
//             assertEq(token.balanceOf(address(protocolFeeReceiver)), protocolAmount, "Protocol balance");
//             assertEq(token.balanceOf(address(daoFeeReceiver)), feeAmount, "DAO balance");
//         }

//         stopMeasuringGas();
//     }

//     function test_unregisterMember() public {
//         startMeasuringGas("Registering and unregistering member");
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         _registryCommunity().unregisterMember();
//         assertTrue(!_registryCommunity().isMember(gardenMember));
//         uint256 feesAmount =
//             (MINIMUM_STAKE * (COMMUNITY_FEE_PERCENTAGE + PROTOCOL_FEE_PERCENTAGE)) / (100 * PERCENTAGE_SCALE);
//         assertEq(token.balanceOf(address(registryCommunity)), 0);
//         assertEq(token.balanceOf(address(gardenMember)), mintAmount - feesAmount);
//         assertEq(registryCommunity.memberPowerInStrategy(gardenMember, address(strategy)), 0);
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_setProtocolFee() public {
//         startMeasuringGas("Setting protocol fee");
//         vm.startPrank(gardenOwner);
//         _registryFactory().setProtocolFee(address(registryCommunity), 2);
//         assertEq(_registryFactory().getProtocolFee(address(registryCommunity)), 2);
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_revertGetProtocolFee() public {
//         startMeasuringGas("Setting protocol fee");
//         vm.startPrank(gardenOwner);
//         _registryFactory().setProtocolFee(address(registryCommunity), 2);
//         _registryFactory().setCommunityValidity(address(registryCommunity), false);
//         vm.expectRevert(
//             abi.encodeWithSelector(RegistryFactoryV0_0.CommunityInvalid.selector, address(registryCommunity))
//         );
//         _registryFactory().getProtocolFee(address(registryCommunity));
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_setCommunityValidity() public {
//         startMeasuringGas("Setting community Validity");
//         vm.startPrank(gardenOwner);
//         _registryFactory().setCommunityValidity(address(registryCommunity), false);

//         assertEq(_registryFactory().getCommunityValidity(address(registryCommunity)), false);

//         _registryFactory().setCommunityValidity(address(registryCommunity), true);

//         assertEq(_registryFactory().getCommunityValidity(address(registryCommunity)), true);
//     }

//     function test_activate_totalActivatedPoints_fixed_system() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         ( /*uint256  _poolId */ , address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Fixed,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 new address[](1),
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         // poolId = _poolId;
//         CVStrategyV0_0 fixedStrategy = CVStrategyV0_0(payable(strategyProxy));

//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(fixedStrategy));
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");
//         fixedStrategy.activatePoints();

//         // token.approve(address(registryCommunity), tokenAmount * DECIMALS);
//         // _registryCommunity().increasePower(tokenAmount * DECIMALS);

//         assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE, "balance");

//         vm.stopPrank();

//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(fixedStrategy)),
//             registryCommunity.getMemberStakedAmount(gardenMember),
//             "memberPower"
//         );
//     }

//     function test_activate_deactivate_totalActivatedPoints_fixed_system() public {
//         vm.startPrank(pool_admin());

//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         ( /*uint256  _poolId */ , address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Fixed,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 new address[](1),
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         CVStrategyV0_0 fixedStrategy = CVStrategyV0_0(payable(strategyProxy));

//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(fixedStrategy));
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");
//         fixedStrategy.activatePoints();

//         // token.approve(address(registryCommunity), tokenAmount * DECIMALS);
//         // _registryCommunity().increasePower(tokenAmount * DECIMALS);

//         assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE, "balance");
//         token.approve(address(registryCommunity), 20 * DECIMALS);
//         _registryCommunity().increasePower(20 * DECIMALS);
//         fixedStrategy.deactivatePoints();
//         fixedStrategy.activatePoints();
//         vm.stopPrank();

//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(fixedStrategy)),
//             registryCommunity.registerStakeAmount(),
//             "memberPower"
//         );
//     }

//     function testFuzz_increasePower(uint256 tokenAmount) public {
//         vm.assume(tokenAmount > 2 && tokenAmount < 100);
//         vm.startPrank(pool_admin());
//         (uint256 maxAmount) = strategy.pointConfig();
//         assertEq(maxAmount, 200 * DECIMALS);
//         vm.stopPrank();
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         vm.stopPrank();
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");
//         strategy.activatePoints();

//         token.approve(address(registryCommunity), tokenAmount * DECIMALS);
//         _registryCommunity().increasePower(tokenAmount * DECIMALS);
//         assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE + (tokenAmount * DECIMALS));

//         vm.stopPrank();
//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)),
//             registryCommunity.getMemberStakedAmount(gardenMember)
//         );
//     }

//     function testFuzz_increasePowerCapped(uint256 tokenAmount) public {
//         uint256 CAPPED_MAX_AMOUNT = 200 * DECIMALS;
//         uint256 MIN_AMOUNT_TO_MAX = (CAPPED_MAX_AMOUNT - MINIMUM_STAKE) / DECIMALS;
//         console.log("MINIMUM_STAKE: %s", MINIMUM_STAKE / DECIMALS);
//         console.log("CAPPED_MAX_AMOUNT- MINIMUM_STAKE: %s", MIN_AMOUNT_TO_MAX);

//         vm.assume(tokenAmount <= MIN_AMOUNT_TO_MAX * 2);
//         vm.assume(tokenAmount >= MIN_AMOUNT_TO_MAX);
//         // vm.assume(tokenAmount > 0);

//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         ( /*uint256  _poolId */ , address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Capped,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 new address[](1),
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         CVStrategyV0_0 cappedStrategy = CVStrategyV0_0(payable(strategyProxy));

//         vm.stopPrank();
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(cappedStrategy));
//         vm.stopPrank();
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");
//         cappedStrategy.activatePoints();

//         token.mint(gardenMember, tokenAmount * DECIMALS);
//         token.approve(address(registryCommunity), tokenAmount * DECIMALS);

//         _registryCommunity().increasePower(tokenAmount * DECIMALS);

//         uint256 memberPower = registryCommunity.getMemberPowerInStrategy(gardenMember, address(cappedStrategy));

//         uint256 current = tokenAmount * DECIMALS + MINIMUM_STAKE;

//         console.log("Current: %s", current);
//         // if (tokenAmount >= CAPPED_MAX_AMOUNT) {
//         assertEq(memberPower, CAPPED_MAX_AMOUNT, "Power to 200");
//         // } else {
//         // assertEq(
//         // memberPower,
//         // registryCommunity.getMemberStakedAmount(gardenMember) + (tokenAmount * DECIMALS),
//         // "power = staked + tokenAmount"
//         // );
//         // }
//     }

//     function testFuzz_increasePowerQuadratic(uint256 firstIncrease, uint256 secondIncrease) public {
//         vm.assume(firstIncrease < 10000 && firstIncrease > 0);
//         vm.assume(secondIncrease < 10000 && secondIncrease > 0);

//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         (, address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Quadratic,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 new address[](1),
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         CVStrategyV0_0 quadraticStrategy = CVStrategyV0_0(payable(strategyProxy));
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         {
//             _registryCommunity().addStrategy(address(quadraticStrategy));
//         }
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         {
//             token.approve(address(registryCommunity), STAKE_WITH_FEES);
//             _registryCommunity().stakeAndRegisterMember("");
//             //vm.expectRevert("error");
//             quadraticStrategy.activatePoints(); //its call increasePower w 0

//             token.approve(address(registryCommunity), firstIncrease * DECIMALS);

//             _registryCommunity().increasePower(firstIncrease * DECIMALS);

//             assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE + (firstIncrease * DECIMALS));

//             assertEq(
//                 registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)),
//                 (Math.sqrt((MINIMUM_STAKE + firstIncrease * DECIMALS) * DECIMALS)),
//                 "power1"
//             );
//             //assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)), 110 );
//             token.approve(address(registryCommunity), secondIncrease * DECIMALS);

//             _registryCommunity().increasePower(secondIncrease * DECIMALS);
//             assertEq(
//                 registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)),
//                 Math.sqrt((MINIMUM_STAKE + firstIncrease * DECIMALS + secondIncrease * DECIMALS) * DECIMALS),
//                 "power2"
//             );
//             // assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)), 120  );
//         }
//         vm.stopPrank();
//     }

//     function test_increasePowerQuadraticFixedValues() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         ( /*uint256  _poolId */ , address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Quadratic,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 new address[](1),
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         CVStrategyV0_0 quadraticStrategy = CVStrategyV0_0(payable(strategyProxy));

//         vm.stopPrank();
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(quadraticStrategy));
//         vm.stopPrank();
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");

//         // DECIMALS = 10 ** 6;
//         uint256 TO_INCREASE = 1100 * DECIMALS - MINIMUM_STAKE;
//         token.approve(address(registryCommunity), TO_INCREASE);

//         _registryCommunity().increasePower(TO_INCREASE);

//         assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE + TO_INCREASE, "After increase");
//         //Sqrt of 1100

//         quadraticStrategy.activatePoints();

//         uint256 sqrtValue = 33166247903553998491;
//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)),
//             sqrtValue,
//             "power for 1100"
//         );

//         token.approve(address(registryCommunity), 300 * DECIMALS);
//         _registryCommunity().increasePower(300 * DECIMALS);
//         //sqrt of 1400
//         sqrtValue = 37416573867739413855;
//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)),
//             sqrtValue,
//             "power for 1200"
//         );
//         vm.stopPrank();
//     }

//     // function test_activateAfterIncreasePowerQuadratic() public {
//     //     vm.startPrank(pool_admin());
//     //     uint256 /* _poolId */ = createPool(
//     //         allo(),
//     //         address(strategy),
//     //         address(_registryCommunity()),
//     //         registry(),
//     //         NATIVE,
//     //         ProposalType(0),
//     //         PointSystem.Quadratic
//     //     );
//     //     console.log("PoolId: %s", poolId);
//     //     vm.stopPrank();
//     //     vm.startPrank(address(councilSafe));
//     //     _registryCommunity().addStrategy(address(strategy));
//     //     vm.stopPrank();
//     //     vm.startPrank(gardenMember);
//     //     token.approve(address(registryCommunity), STAKE_WITH_FEES);
//     //     _registryCommunity().stakeAndRegisterMember("");
//     //     //vm.expectRevert("error");

//     //     // DECIMALS = 10 ** 6;
//     //     uint256 TO_INCREASE = 1100 * DECIMALS - MINIMUM_STAKE;
//     //     token.approve(address(registryCommunity), TO_INCREASE);

//     //     _registryCommunity().increasePower(TO_INCREASE);

//     //     assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE + TO_INCREASE, "After increase");
//     //     //Sqrt of 1100
//     //     uint256 sqrtValue = 33166247903553998491;
//     //     assertEq(
//     //         registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)), sqrtValue, "power for 1100"
//     //     );

//     //     token.approve(address(registryCommunity), 300 * DECIMALS);
//     //     _registryCommunity().increasePower(300 * DECIMALS);
//     //     //sqrt of 1400
//     //     sqrtValue = 37416573867739413855;
//     //     assertEq(
//     //         registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)), sqrtValue, "power for 1200"
//     //     );
//     //     vm.stopPrank();
//     // }

//     function test_activateAfterIncreasePowerQuadratic() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         ( /*uint256  _poolId */ , address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Quadratic,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 new address[](1),
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         CVStrategyV0_0 quadraticStrategy = CVStrategyV0_0(payable(strategyProxy));
//         console.log("PoolId: %s", poolId);
//         vm.stopPrank();
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(quadraticStrategy));
//         vm.stopPrank();
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");
//         quadraticStrategy.activatePoints();

//         // DECIMALS = 10 ** 6;
//         uint256 TO_INCREASE = 1100 * DECIMALS - MINIMUM_STAKE;
//         token.approve(address(registryCommunity), TO_INCREASE);

//         _registryCommunity().increasePower(TO_INCREASE);

//         assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE + TO_INCREASE, "After increase");
//         //Sqrt of 1100
//         uint256 sqrtValue = 33166247903553998491;
//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)),
//             sqrtValue,
//             "power for 1100"
//         );

//         token.approve(address(registryCommunity), 300 * DECIMALS);
//         _registryCommunity().increasePower(300 * DECIMALS);
//         //sqrt of 1400
//         sqrtValue = 37416573867739413855;
//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)),
//             sqrtValue,
//             "power for 1200"
//         );
//         vm.stopPrank();
//     }

//     function testFuzz_activateAfterIncreasePower(uint256 tokenAmount) public {
//         //To avoid InsufficientBalance
//         vm.assume(tokenAmount < 100000);
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         vm.stopPrank();
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");

//         token.approve(address(registryCommunity), tokenAmount * DECIMALS);
//         _registryCommunity().increasePower(tokenAmount * DECIMALS);
//         assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE + (tokenAmount * DECIMALS));

//         strategy.activatePoints();

//         vm.stopPrank();
//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)),
//             registryCommunity.getMemberStakedAmount(gardenMember)
//         );
//     }

//     function test_DecreasePower_after_increasePower_diff_orders() public {
//         vm.startPrank(pool_admin());
//         // ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         // uint256 poolId = createPool(
//         //     allo(),
//         //     address(strategy),
//         //     address(_registryCommunity()),
//         //     registry(),
//         //     address(token),
//         //     ProposalType(0),
//         //     PointSystem.Unlimited,
//         //     arbitrableConfig
//         // );
//         // console.log("PoolId: %s", poolId);
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");

//         token.approve(address(registryCommunity), 100 * DECIMALS);

//         strategy.activatePoints();

//         _registryCommunity().increasePower(100 * DECIMALS);

//         strategy.deactivatePoints();
//         strategy.activatePoints();

//         _registryCommunity().decreasePower(50 * DECIMALS);

//         strategy.deactivatePoints();
//         strategy.activatePoints();

//         _registryCommunity().decreasePower(50 * DECIMALS);

//         // assertEq(
//         //     registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)),
//         //     registryCommunity.registerStakeAmount() + (150 * DECIMALS)
//         // );

//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)),
//             registryCommunity.registerStakeAmount()
//         );
//         // vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.DecreaseUnderMinimum.selector));
//         vm.stopPrank();
//     }

//     function test_DecreasePower_after_increasePower() public {
//         vm.startPrank(pool_admin());
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");

//         token.approve(address(registryCommunity), 150 * DECIMALS);

//         _registryCommunity().increasePower(100 * DECIMALS);
//         _registryCommunity().increasePower(50 * DECIMALS);
//         // token.approve(address(registryCommunity), 100 * DECIMALS);
//         strategy.activatePoints();

//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)),
//             registryCommunity.registerStakeAmount() + (150 * DECIMALS)
//         );

//         _registryCommunity().decreasePower(150 * DECIMALS);

//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)),
//             registryCommunity.registerStakeAmount()
//         );
//         // vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.DecreaseUnderMinimum.selector));
//         vm.stopPrank();
//     }

//     function test_only_allowlist_executeAction() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         address[] memory allowlist = new address[](2);
//         address otherGardenMember = makeAddr("otherCommunityGardenMember");
//         allowlist[0] = address(gardenMember);
//         allowlist[1] = address(otherGardenMember);
//         token.mint(otherGardenMember, mintAmount);

//         (, address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Unlimited,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 allowlist,
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         CVStrategyV0_0 allowlistStrategy = CVStrategyV0_0(payable(strategyProxy));
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(allowlistStrategy));
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         allowlistStrategy.activatePoints();
//         vm.stopPrank();

//         vm.startPrank(otherGardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         allowlistStrategy.activatePoints();
//         vm.stopPrank();
//     }

//     function test_add_to_allowlist() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         address[] memory allowlist = new address[](2);
//         address otherGardenMember = makeAddr("otherCommunityGardenMember");
//         allowlist[0] = address(gardenMember);
//         allowlist[1] = address(otherGardenMember);
//         token.mint(otherGardenMember, mintAmount);

//         (, address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Unlimited,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 allowlist,
//                 address(0),
//                 0,
//                 address(0)
//             ),
//             metadata
//         );
//         CVStrategyV0_0 allowlistStrategy = CVStrategyV0_0(payable(strategyProxy));
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(allowlistStrategy));
//         vm.stopPrank();

//         // gardenOwner isn't in allowlist, so should revert
//         vm.startPrank(gardenOwner);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         vm.expectRevert(abi.encodeWithSelector(CVStrategyV0_0.UserCannotExecuteAction.selector));
//         allowlistStrategy.activatePoints();
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         address[] memory membersToAdd = new address[](1);
//         membersToAdd[0] = gardenOwner;
//         allowlistStrategy.addToAllowList(membersToAdd);
//         vm.stopPrank();
//         // Now should be able to activate points
//         vm.startPrank(gardenOwner);
//         allowlistStrategy.activatePoints();
//         vm.stopPrank();
//     }

//     function testRevert_allowlistTooBig() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         // Max is 10000, should revert
//         uint256 limit = 10001;
//         address[] memory allowlist = new address[](limit);
//         for (uint256 i = 0; i < limit; i++) {
//             allowlist[i] = address(uint160(uint256(keccak256(abi.encodePacked(i)))));
//         }
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.AllowlistTooBig.selector, limit));
//         registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Unlimited,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 allowlist,
//                 address(0),
//                 0
//             ),
//             metadata
//         );
//     }

//     function test_createPool_loop_gas() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         uint256 limit = 10000;
//         address[] memory allowlist = new address[](limit);
//         for (uint256 i = 0; i < limit; i++) {
//             allowlist[i] = address(uint160(uint256(keccak256(abi.encodePacked(i)))));
//         }
//         // CreatePool with one address = 1 246 096 gas used
//         // CreatePool with two addresses = 1 271 771
//         // Around 25000 gas per extra address
//         registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Unlimited,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 allowlist,
//                 address(0),
//                 0
//             ),
//             metadata
//         );
//         vm.stopPrank();
//     }

//     function test_add_to_allowlist_after_addressZero_initialized() public {
//         // The strategy created in setup has address(0) as initial member,
//         // in other words everyone
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         address[] memory membersToAdd = new address[](1);
//         membersToAdd[0] = gardenMember;
//         strategy.addToAllowList(membersToAdd);
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         strategy.activatePoints();
//         vm.stopPrank();

//         // gardenOwner isn't in allowlist, so should revert
//         vm.startPrank(gardenOwner);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         vm.expectRevert(abi.encodeWithSelector(CVStrategyV0_0.UserCannotExecuteAction.selector));
//         strategy.activatePoints();
//         vm.stopPrank();
//     }

//     function test_removeFromAllowlist() public {
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         address[] memory membersToAdd = new address[](1);
//         membersToAdd[0] = gardenMember;
//         strategy.addToAllowList(membersToAdd);
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         strategy.activatePoints();
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         address[] memory membersToRemove = new address[](1);
//         membersToRemove[0] = gardenMember;
//         strategy.removeFromAllowList(membersToRemove);
//         vm.stopPrank();
//         // gardenMember isn't in allowlist, so should revert
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), 350 * DECIMALS);
//         vm.expectRevert(abi.encodeWithSelector(CVStrategyV0_0.UserCannotExecuteAction.selector));
//         _registryCommunity().increasePower(350 * DECIMALS);
//         vm.stopPrank();
//     }

//     function testRevert_only_allowlist_executeAction() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         address[] memory allowlist = new address[](2);
//         address otherGardenMember = makeAddr("otherCommunityGardenMember");
//         allowlist[0] = address(gardenMember);
//         allowlist[1] = address(otherGardenMember);
//         token.mint(otherGardenMember, mintAmount);

//         (, address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Unlimited,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 allowlist,
//                 address(0),
//                 0
//             ),
//             metadata
//         );
//         CVStrategyV0_0 allowlistStrategy = CVStrategyV0_0(payable(strategyProxy));
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(allowlistStrategy));
//         vm.stopPrank();
//         // This one shouldn't revert, because he's in allowlist
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         allowlistStrategy.activatePoints();
//         vm.stopPrank();

//         // gardenOwner isn't in allowlist, so should revert
//         vm.startPrank(gardenOwner);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         vm.expectRevert(abi.encodeWithSelector(CVStrategyV0_0.UserCannotExecuteAction.selector));
//         allowlistStrategy.activatePoints();
//         vm.stopPrank();
//     }

//     function test_decreasePowerQuadratic_FixedValues() public {
//         vm.startPrank(pool_admin());
//         ArbitrableConfig memory arbitrableConfig = _generateArbitrableConfig();
//         (, address strategyProxy) = registryCommunity.createPool(
//             NATIVE,
//             getParams(
//                 address(registryCommunity),
//                 ProposalType(0),
//                 PointSystem.Quadratic,
//                 PointSystemConfig(0),
//                 arbitrableConfig,
//                 new address[](1),
//                 address(0),
//                 0
//             ),
//             metadata
//         );
//         CVStrategyV0_0 quadraticStrategy = CVStrategyV0_0(payable(strategyProxy));
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(quadraticStrategy));
//         vm.stopPrank();

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         quadraticStrategy.activatePoints();

//         token.approve(address(registryCommunity), 350 * DECIMALS);
//         _registryCommunity().increasePower(350 * DECIMALS);

//         uint256 sqrtValue = 20 * DECIMALS;
//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)),
//             sqrtValue,
//             "powerrrrrrrrrrrr for 1100"
//         );

//         _registryCommunity().decreasePower(300 * DECIMALS);

//         sqrtValue = 10 * DECIMALS;
//         assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)), sqrtValue);

//         _registryCommunity().decreasePower(36 * DECIMALS);

//         sqrtValue = 8 * DECIMALS;
//         assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(quadraticStrategy)), sqrtValue);

//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.DecreaseUnderMinimum.selector));
//         _registryCommunity().decreasePower(50 * DECIMALS);
//         vm.stopPrank();
//     }

//     function test_isCouncilMember() public view {
//         assertEq(_registryCommunity().isCouncilMember(address(councilSafe)), true);
//         assertEq(_registryCommunity().isCouncilMember(gardenMember), false);
//     }

//     function test_kickMember() public {
//         startMeasuringGas("Registering and kicking member");

//         //CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

//         vm.startPrank(pool_admin());
//         vm.stopPrank();
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         vm.stopPrank();
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");
//         strategy.activatePoints();
//         vm.stopPrank();
//         assertEq(
//             registryCommunity.memberPowerInStrategy(gardenMember, address(strategy)),
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy))
//         );
//         //assertEq(strategy.activatedPointsIn)
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().kickMember(gardenMember, address(councilSafe));
//         assertTrue(!_registryCommunity().isMember(gardenMember));
//         assertEq(token.balanceOf(address(councilSafe)), MINIMUM_STAKE);
//         assertEq(registryCommunity.memberPowerInStrategy(gardenMember, address(strategy)), 0);
//         // assertTrue(!_registryCommunity().memberActivatedInStrategies(gardenMember,address(strategy)));
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_revertKickMemberBool() public {
//         startMeasuringGas("Registering and kicking member");
//         vm.startPrank(gardenMember);
//         token.approve(address(nonKickableCommunity), STAKE_WITH_FEES);
//         _nonKickableCommunity().stakeAndRegisterMember("");
//         vm.stopPrank();
//         vm.startPrank(address(councilSafe));
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.KickNotEnabled.selector));
//         _nonKickableCommunity().kickMember(gardenMember, address(councilSafe));
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_revert_activateMemberInStrategy() public {
//         startMeasuringGas("Registering and kicking member");

//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.StrategyDisabled.selector));
//         strategy.activatePoints();
//         vm.stopPrank();
//     }

//     function test_revert_addStrategy() public {
//         startMeasuringGas("Registering and kicking member");

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.StrategyExists.selector));
//         _registryCommunity().addStrategy(address(strategy));
//         vm.stopPrank();
//     }

//     function test_revert_initialize_zeroStake() public {
//         RegistryCommunityInitializeParamsV0_0 memory params;
//         params._allo = address(allo());
//         params._gardenToken = IERC20(address(token));
//         params._registerStakeAmount = 0;
//         params._communityFee = COMMUNITY_FEE_PERCENTAGE;
//         params._metadata = metadata;
//         params._feeReceiver = address(daoFeeReceiver);
//         params._councilSafe = payable(address(_councilSafe()));
//         params._isKickEnabled = true;
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.ValueCannotBeZero.selector));
//         registryCommunity = RegistryCommunityV0_0(registryFactory.createRegistry(params));
//     }

//     function test_revert_deactivateMemberInStrategyCaller() public {
//         startMeasuringGas("Registering and kicking member");

//         vm.startPrank(gardenMember);

//         token.approve(address(registryCommunity), STAKE_WITH_FEES);

//         _registryCommunity().stakeAndRegisterMember("");

//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.SenderNotStrategy.selector));
//         _registryCommunity().deactivateMemberInStrategy(gardenMember, address(strategy));

//         vm.stopPrank();

//         stopMeasuringGas();
//     }

//     function test_revert_deactivateMember_alreadyDeactivated() public {
//         startMeasuringGas("Registering and kicking member");
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         vm.stopPrank();
//         vm.startPrank(address(strategy));
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserAlreadyDeactivated.selector));
//         _registryCommunity().deactivateMemberInStrategy(gardenMember, address(strategy));
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_revertIncreasePower() public {
//         vm.startPrank(gardenMember);
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInRegistry.selector));
//         _registryCommunity().increasePower(20 * DECIMALS);
//     }

//     function test_revertDecreasePower() public {
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         vm.stopPrank();
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         //vm.expectRevert("error");
//         strategy.activatePoints();

//         token.approve(address(registryCommunity), 100 * DECIMALS);
//         _registryCommunity().increasePower(100 * DECIMALS);
//         assertEq(
//             registryCommunity.getMemberPowerInStrategy(gardenMember, address(strategy)),
//             registryCommunity.getMemberStakedAmount(gardenMember)
//         );
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.DecreaseUnderMinimum.selector));
//         _registryCommunity().decreasePower(101 * DECIMALS);

//         //Test if decreasing by 100 doesn't revert as it shouldn't
//         _registryCommunity().decreasePower(100 * DECIMALS);

//         vm.stopPrank();
//     }

//     function test_revertKickUnregisteredMember() public {
//         startMeasuringGas("Registering and kicking member");
//         vm.startPrank(address(councilSafe));
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInRegistry.selector));
//         _registryCommunity().kickMember(gardenMember, address(councilSafe));
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_revertKickNotCouncil() public {
//         startMeasuringGas("Registering and kicking member");
//         vm.startPrank(gardenMember);
//         token.approve(address(registryCommunity), STAKE_WITH_FEES);
//         _registryCommunity().stakeAndRegisterMember("");
//         vm.stopPrank();
//         vm.startPrank(gardenOwner);
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInCouncil.selector, gardenOwner));
//         _registryCommunity().kickMember(gardenMember, address(councilSafe));
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_setCommunityFee() public {
//         startMeasuringGas("Updating protocol fee");
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().setCommunityFee(5 * PERCENTAGE_SCALE);
//         assertEq(_registryCommunity().communityFee(), 5 * PERCENTAGE_SCALE);
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_setCouncilSafe() public {
//         startMeasuringGas("Setting council safe");
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().setCouncilSafe(payable(newCouncilSafe));
//         assertEq(address(_registryCommunity().pendingCouncilSafe()), address(newCouncilSafe));
//         vm.stopPrank();
//         vm.startPrank(newCouncilSafe);
//         _registryCommunity().acceptCouncilSafe();
//         assertEq(address(_registryCommunity().councilSafe()), address(newCouncilSafe));
//         vm.stopPrank();
//     }

//     function test_addStrategy() public {
//         startMeasuringGas("Adding strategy");
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), true);
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_revertSetCouncilSafe() public {
//         vm.startPrank(gardenMember);
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInCouncil.selector, gardenMember));
//         _registryCommunity().setCouncilSafe(payable(newCouncilSafe));
//         vm.stopPrank();
//         vm.startPrank(address(councilSafe));
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.AddressCannotBeZero.selector));
//         _registryCommunity().setCouncilSafe(payable(address(0)));
//         _registryCommunity().setCouncilSafe(payable(newCouncilSafe));
//         assertEq(address(_registryCommunity().pendingCouncilSafe()), address(newCouncilSafe));
//         vm.stopPrank();
//         vm.startPrank(gardenMember);
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.SenderNotNewOwner.selector));
//         _registryCommunity().acceptCouncilSafe();
//         vm.stopPrank();
//     }

//     function test_removeStrategy() public {
//         startMeasuringGas("Testing strategy removal");
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategy(address(strategy));
//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), true);
//         _registryCommunity().removeStrategy(address(strategy));
//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), false);
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_setBasisStake() public {
//         startMeasuringGas("Testing strategy removal");
//         vm.startPrank(address(councilSafe));
//         _registryCommunity().setBasisStakedAmount(500);
//         assertEq(_registryCommunity().registerStakeAmount(), 500);
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_setCommunityParams() public {
//         startMeasuringGas("Testing setCommunityParams");
//         vm.startPrank(address(councilSafe));
//         //         struct CommunityParams {
//         //     uint256 registerStakeAmount;
//         //     bool isKickEnabled;
//         //     string covenantIpfsHash;
//         //     address councilSafe;
//         //     address feeReceiver;
//         //     uint256 communityFee;
//         //     string communityName;
//         // }

//         _registryCommunity().setCommunityParams(
//             CommunityParams({
//                 registerStakeAmount: 500,
//                 isKickEnabled: true,
//                 covenantIpfsHash: "0x0",
//                 councilSafe: address(councilSafe),
//                 feeReceiver: address(daoFeeReceiver),
//                 communityFee: 5 * PERCENTAGE_SCALE,
//                 communityName: "Test"
//             })
//         );
//         assertEq(_registryCommunity().registerStakeAmount(), 500);
//         assertEq(_registryCommunity().isKickEnabled(), true);
//         assertEq(_registryCommunity().communityFee(), 5 * PERCENTAGE_SCALE);
//         assertEq(_registryCommunity().communityName(), "Test");
//         assertEq(_registryCommunity().covenantIpfsHash(), "0x0");
//         assertEq(_registryCommunity().feeReceiver(), address(daoFeeReceiver));
//         _registryCommunity().setCommunityParams(
//             CommunityParams({
//                 registerStakeAmount: 500,
//                 isKickEnabled: true,
//                 covenantIpfsHash: "0x0",
//                 councilSafe: address(newCouncilSafe),
//                 feeReceiver: address(daoFeeReceiver),
//                 communityFee: 5 * PERCENTAGE_SCALE,
//                 communityName: "Test"
//             })
//         );
//         assertEq(address(_registryCommunity().pendingCouncilSafe()), address(newCouncilSafe));
//         vm.stopPrank();
//         vm.startPrank(newCouncilSafe);
//         _registryCommunity().acceptCouncilSafe();
//         assertEq(address(_registryCommunity().councilSafe()), address(newCouncilSafe));
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_revertUnregisterMember() public {
//         startMeasuringGas("Testing kick member revert");
//         vm.startPrank(gardenOwner);
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInRegistry.selector));
//         _registryCommunity().unregisterMember();
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_revertSetCommunityFee() public {
//         startMeasuringGas("Testing update protocol revert");
//         vm.startPrank(gardenOwner);
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInCouncil.selector, gardenOwner));
//         _registryCommunity().setCommunityFee(5);
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.NewFeeGreaterThanMax.selector));
//         _registryCommunity().setCommunityFee(11 * PERCENTAGE_SCALE);
//         _registryCommunity().setCommunityFee(10 * PERCENTAGE_SCALE);
//         assertEq(_registryCommunity().communityFee(), 10 * PERCENTAGE_SCALE);
//         vm.stopPrank();
//     }

//     function test_revertSetBasisStakeAmount() public {
//         startMeasuringGas("Testing setBasisStake revert");
//         vm.startPrank(gardenOwner);
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInCouncil.selector, gardenOwner));
//         _registryCommunity().setBasisStakedAmount(500);
//         vm.stopPrank();
//         stopMeasuringGas();
//     }

//     function test_getStakeAmountWithFees() public view {
//         uint256 stakeFees = _registryCommunity().getStakeAmountWithFees();
//         assertEq(stakeFees, STAKE_WITH_FEES);
//     }

//     function test_removeStrategyByPoolId() public {
//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), false);

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategyByPoolId(poolId);

//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), true);

//         _registryCommunity().removeStrategyByPoolId(poolId);

//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), false);

//         vm.stopPrank();
//     }

//     function test_addStrategyByPoolId() public {
//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), false);

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategyByPoolId(poolId);
//         vm.stopPrank();

//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), true);
//     }

//     function test_Revert_removeStrategyByPoolId() public {
//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), false);

//         vm.startPrank(address(councilSafe));
//         _registryCommunity().addStrategyByPoolId(poolId);
//         vm.stopPrank();

//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInCouncil.selector, address(this)));
//         _registryCommunity().removeStrategyByPoolId(poolId);

//         vm.startPrank(address(councilSafe));

//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.AddressCannotBeZero.selector));
//         _registryCommunity().removeStrategyByPoolId(poolId + 1);

//         vm.stopPrank();

//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), true);
//     }

//     function test_Revert_addStrategyByPoolId() public {
//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), false);

//         vm.startPrank(gardenOwner);
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.UserNotInCouncil.selector, gardenOwner));
//         _registryCommunity().addStrategyByPoolId(poolId);
//         vm.stopPrank();

//         vm.startPrank(address(councilSafe));
//         vm.expectRevert(abi.encodeWithSelector(RegistryCommunityV0_0.AddressCannotBeZero.selector));
//         _registryCommunity().addStrategyByPoolId(poolId + 1);
//         vm.stopPrank();

//         assertEq(_registryCommunity().enabledStrategies(address(strategy)), false);
//     }
// }
