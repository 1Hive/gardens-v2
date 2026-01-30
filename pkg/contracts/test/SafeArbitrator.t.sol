// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {
    CVStrategy,
    ArbitrableConfig,
    PointSystemConfig,
    PointSystem,
    ProposalType,
    CreateProposal
} from "../src/CVStrategy/CVStrategy.sol";
import {RegistryCommunity, RegistryCommunityInitializeParams} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {RegistrySetupFull} from "allo-v2-test/foundry/shared/RegistrySetup.sol";
import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
import {SafeSetup} from "./shared/SafeSetup.sol";
import {IArbitrable} from "../src/interfaces/IArbitrable.sol";
import {GV2ERC20} from "../script/GV2ERC20.sol";
import {CVStrategyHelpers} from "./CVStrategyHelpers.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {StrategyDiamondConfigurator} from "./helpers/StrategyDiamondConfigurator.sol";
import {CommunityDiamondConfigurator} from "./helpers/CommunityDiamondConfigurator.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";

contract SafeArbitratorTest is Test, RegistrySetupFull, AlloSetup, CVStrategyHelpers, SafeSetup {
    SafeArbitrator safeArbitrator;
    CVStrategy cvStrategy;
    uint256 poolId;
    RegistryCommunity internal registryCommunity;
    GV2ERC20 public token;
    // address allo_owner = address(0x1);
    address factoryOwner = address(1);
    // address local = address(0x5);
    // address pool_admin = address(3);
    address challenger = address(3);
    StrategyDiamondConfigurator public diamondConfigurator;
    CommunityDiamondConfigurator public communityDiamondConfigurator;

    uint256 public constant POOL_AMOUNT = 15000 ether;
    uint256 constant TOTAL_SUPPLY = 100000 ether;
    uint256 constant MINIMUM_STAKE = 1 ether;
    uint256 constant COMMUNITY_FEE_PERCENTAGE = 1;
    uint256 constant PROTOCOL_FEE_PERCENTAGE = 1;
    uint256 constant ARBITRATION_FEE = 2 ether;
    uint256 public constant STAKE_WITH_FEES =
        MINIMUM_STAKE + (MINIMUM_STAKE * (COMMUNITY_FEE_PERCENTAGE + PROTOCOL_FEE_PERCENTAGE)) / 100;
    uint256 public constant DISPUTE_COOLDOWN_SEC = 2 hours;

    function setUp() public {
        //TODO - Abstract all this setup into a shared function that could be used on cvstrategy test also
        __RegistrySetupFull();
        __AlloSetup(address(registry()));

        vm.startPrank(allo_owner());
        allo().updateBaseFee(0);
        allo().updatePercentFee(0);
        vm.stopPrank();

        token = new GV2ERC20("Mock Token", "MTK", 18);
        token.mint(local(), TOTAL_SUPPLY / 4);
        token.mint(pool_admin(), TOTAL_SUPPLY / 4);
        token.mint(challenger, TOTAL_SUPPLY / 4);
        //PassportScorer test
        token.mint(address(6), TOTAL_SUPPLY / 4);
        token.approve(address(allo()), 1500 ether);

        vm.startPrank(allo_owner());
        allo().transferOwnership(local());
        vm.stopPrank();

        vm.startPrank(factoryOwner);

        safeArbitrator = SafeArbitrator(
            payable(address(
                    new ERC1967Proxy(
                        address(new SafeArbitrator()),
                        abi.encodeWithSelector(SafeArbitrator.initialize.selector, ARBITRATION_FEE, factoryOwner)
                    )
                ))
        );

        // RegistryFactory registryFactory = new RegistryFactory();

        vm.stopPrank();

        RegistryCommunityInitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = COMMUNITY_FEE_PERCENTAGE;

        params._feeReceiver = address(this);

        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));

        diamondConfigurator = new StrategyDiamondConfigurator();
        communityDiamondConfigurator = new CommunityDiamondConfigurator();
        RegistryFactory factory = RegistryFactory(
            address(
                new ERC1967Proxy(
                    address(new RegistryFactory()),
                    abi.encodeWithSelector(
                        RegistryFactory.initialize.selector,
                        address(factoryOwner),
                        address(2),
                        address(new RegistryCommunity()),
                        address(new CVStrategy()),
                        address(new CollateralVault())
                    )
                )
            )
        );
        vm.startPrank(factoryOwner);
        factory.initializeV2(
            communityDiamondConfigurator.getFacetCuts(),
            address(communityDiamondConfigurator.diamondInit()),
            abi.encodeCall(RegistryCommunityDiamondInit.init, ()),
            diamondConfigurator.getFacetCuts(),
            address(diamondConfigurator.diamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );
        vm.stopPrank();
        registryCommunity = RegistryCommunity(factory.createRegistry(params));

        uint256 _poolId;
        address _strategy;

        (_poolId, _strategy) = registryCommunity.createPool(
            NATIVE,
            getParams(
                address(registryCommunity),
                ProposalType.Funding,
                PointSystem.Unlimited,
                PointSystemConfig(200 * DECIMALS),
                ArbitrableConfig(safeArbitrator, payable(address(_councilSafe())), 0.02 ether, 0.01 ether, 1, 300),
                new address[](1),
                address(0),
                0,
                address(0)
            ),
            metadata
        );
        vm.startPrank(challenger);
        registryCommunity.gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        vm.stopPrank();

        poolId = _poolId;
        cvStrategy = CVStrategy(payable(_strategy));

        // register tribunal safe for this arbitrable strategy
        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));
        address registeredSafe = safeArbitrator.arbitrableTribunalSafe(address(cvStrategy));
        require(registeredSafe != address(0), "tribunal safe not registered");

        vm.startPrank(pool_admin());
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(cvStrategy))
        );
        vm.stopPrank();

        registryCommunity.gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cvStrategy.activatePoints();

        vm.deal(address(this), POOL_AMOUNT);
        (bool success,) = address(cvStrategy).call{value: POOL_AMOUNT}("");
        require(success, "Transfer failed");
    }

    function createProposal() public returns (uint256 proposalId) {
        uint256 requestAmount = 1 ether;
        CreateProposal memory proposal = CreateProposal(poolId, pool_admin(), requestAmount, address(NATIVE), metadata);
        bytes memory data = abi.encode(proposal);

        (,, uint256 submitterCollateralAmount,,,) = cvStrategy.getArbitrableConfig();
        vm.deal(pool_admin(), submitterCollateralAmount);

        vm.startPrank(pool_admin());
        registryCommunity.gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        proposalId = uint160(allo().registerRecipient{value: submitterCollateralAmount}(poolId, data));
        vm.stopPrank();
    }

    function testSetArbitrationFee() public {
        vm.startPrank(factoryOwner);
        uint256 newFee = 0.02 ether;
        safeArbitrator.setArbitrationFee(newFee);
        assertEq(safeArbitrator.arbitrationCost(""), newFee);
        vm.stopPrank();
    }

    function testCreateDispute() public {
        uint256 proposalId = createProposal();
        vm.deal(challenger, 10 ether);
        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));
        vm.prank(challenger);
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");
        (, address configTribunalSafe,,,,) = cvStrategy.arbitrableConfigs(cvStrategy.currentArbitrableConfigVersion());

        // fund this contract to cover the direct call below
        vm.deal(address(this), ARBITRATION_FEE);
        safeArbitrator.createDispute{value: ARBITRATION_FEE}(3, "");

        (
            ,,
            uint256 choices,
            uint256 arbitrationFee,
            uint256 ruling,
            SafeArbitrator.DisputeStatus status,
            address tribunalSafe
        ) = safeArbitrator.disputes(disputeID - 1);

        assertEq(choices, 3);
        assertEq(arbitrationFee, ARBITRATION_FEE);
        assertEq(ruling, 0);
        assertEq(uint256(status), uint256(SafeArbitrator.DisputeStatus.Waiting));
        assertEq(tribunalSafe, configTribunalSafe);
    }

    function testExecuteRuling() public {
        uint256 proposalId = createProposal();

        vm.deal(challenger, 10 ether);
        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));
        vm.prank(challenger);
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeID, 2, address(cvStrategy));

        (,,,, uint256 ruling, SafeArbitrator.DisputeStatus status,) = safeArbitrator.disputes(disputeID - 1);
        assertEq(ruling, 2);
        assertEq(uint256(status), uint256(SafeArbitrator.DisputeStatus.Solved));
    }

    function testRevert_ExecuteRuling_InvalidProposalStatus() public {
        uint256 proposalId = createProposal();
        vm.deal(challenger, 10 ether);

        // Register safe
        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));

        // First dispute - should succeed
        vm.prank(challenger);
        uint256 disputeID1 = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        // Resolve the first dispute (so proposal goes back to Active and can be disputed again)
        vm.startPrank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeID1, 1, address(cvStrategy)); // Ruling that keeps proposal active
        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.ProposalStatusInvalid.selector, 1, 1));
        cvStrategy.rule(disputeID1, 1);
        vm.stopPrank();
    }

    function testRevert_ExecuteRuling_senderNotArbitrator() public {
        uint256 proposalId = createProposal();
        vm.deal(challenger, 10 ether);

        // Register safe
        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));

        // First dispute - should succeed
        vm.prank(challenger);
        uint256 disputeID1 = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");
        vm.expectRevert(
            abi.encodeWithSelector(CVDisputeFacet.OnlyArbitrator.selector, address(this), address(safeArbitrator))
        );
        cvStrategy.rule(disputeID1, 1);
    }

    function testArbitrationCost() public view {
        uint256 cost = safeArbitrator.arbitrationCost("");
        assertEq(cost, ARBITRATION_FEE);
    }

    function testCannotCreateDisputeWithInsufficientFee() public {
        vm.deal(challenger, 10 ether);
        vm.prank(challenger);
        vm.expectRevert(SafeArbitrator.NotEnoughArbitrationFees.selector);
        safeArbitrator.createDispute{value: ARBITRATION_FEE - 1}(3, "");
    }

    function testRevert_CreateDispute_ProposalInvalid() public {
        uint256 proposalId = createProposal();
        vm.deal(challenger, 10 ether);
        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));
        vm.prank(challenger);
        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.ProposalStatusInvalid.selector, 0, 0));
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether}(0, "", "");
        // (, address configTribunalSafe,,,,) = cvStrategy.arbitrableConfigs(cvStrategy.currentArbitrableConfigVersion());

        // // fund this contract to cover the direct call below
        // vm.deal(address(this), ARBITRATION_FEE - 1);
        // safeArbitrator.createDispute{value: ARBITRATION_FEE}(3, "");

        // (
        //     ,,
        //     uint256 choices,
        //     uint256 arbitrationFee,
        //     uint256 ruling,
        //     SafeArbitrator.DisputeStatus status,
        //     address tribunalSafe
        // ) = safeArbitrator.disputes(disputeID - 1);

        // assertEq(choices, 3);
        // assertEq(arbitrationFee, ARBITRATION_FEE);
        // assertEq(ruling, 0);
        // assertEq(uint256(status), uint256(SafeArbitrator.DisputeStatus.Waiting));
        // assertEq(tribunalSafe, configTribunalSafe);
    }

    function testRevert_CreateDispute_ChallengerCollateralTooLow() public {
        uint256 proposalId = createProposal();
        vm.deal(challenger, 10 ether);
        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));
        vm.prank(challenger);
        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.ChallengerCollateralTooLow.selector, 0, 0.01 ether));
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.0 ether}(proposalId, "", "");
    }

    function testRevert_CreateDispute_DisputeCooldownActive() public {
        uint256 proposalId = createProposal();
        vm.deal(challenger, 10 ether);

        // Register safe
        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));

        // First dispute - should succeed
        vm.prank(challenger);
        uint256 disputeID1 = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        // Resolve the first dispute (so proposal goes back to Active and can be disputed again)
        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeID1, 1, address(cvStrategy)); // Ruling that keeps proposal active

        // Try to create a second dispute immediately - should revert due to cooldown
        // vm.deal(challenger, 10 ether); // Refund challenger
        vm.prank(challenger);

        // Calculate remaining cooldown time

        uint256 remainingCooldown = DISPUTE_COOLDOWN_SEC; // Full cooldown since we just resolved

        vm.expectRevert(
            abi.encodeWithSelector(CVDisputeFacet.DisputeCooldownActive.selector, proposalId, remainingCooldown)
        );
        cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        // Fast forward past cooldown period
        vm.warp(block.timestamp + DISPUTE_COOLDOWN_SEC + 1);

        // // Now dispute should succeed
        vm.prank(challenger);
        uint256 disputeID2 = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");
    }

    function testCannotExecuteRulingFromNonSafe() public {
        uint256 proposalId = createProposal();

        vm.deal(challenger, 1000 ether);
        vm.startPrank(challenger);

        registryCommunity.stakeAndRegisterMember("");
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        vm.expectRevert(abi.encodeWithSelector(SafeArbitrator.OnlySafe.selector, challenger, councilSafe));
        safeArbitrator.executeRuling(disputeID, 2, address(cvStrategy));
        vm.stopPrank();
    }

    function testCannotExecuteRulingTwice() public {
        uint256 proposalId = createProposal();

        vm.deal(challenger, 10 ether);
        vm.prank(challenger);
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeID, 2, address(cvStrategy));

        vm.expectRevert(SafeArbitrator.DisputeAlreadySolved.selector);
        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeID, 1, address(cvStrategy));
    }

    function testCannotRuleInvalidRuling() public {
        uint256 proposalId = createProposal();

        vm.deal(challenger, 10 ether);
        vm.prank(challenger);
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        vm.expectRevert(SafeArbitrator.InvalidRuling.selector);
        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeID, 4, address(cvStrategy));
    }

    function testCurrentRuling() public {
        uint256 proposalId = createProposal();

        vm.deal(challenger, 10 ether);
        vm.prank(challenger);
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeID, 2, address(cvStrategy));

        (uint256 ruling, bool tied, bool overridden) = safeArbitrator.currentRuling(disputeID - 1);

        assertEq(ruling, 2);
        assertFalse(tied);
        assertFalse(overridden);
    }

    function test_createDispute_tokenVariant_revertsNotSupported() public {
        vm.expectRevert(SafeArbitrator.NotSupported.selector);
        safeArbitrator.createDispute(2, "", IERC20(address(0xBEEF)), 1 ether);
    }

    function test_arbitrationCost_tokenVariant_revertsNotSupported() public {
        vm.expectRevert(SafeArbitrator.NotSupported.selector);
        safeArbitrator.arbitrationCost("", IERC20(address(0xBEEF)));
    }
}
