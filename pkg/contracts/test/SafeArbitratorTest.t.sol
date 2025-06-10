// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {
    CVStrategyV0_0,
    ArbitrableConfig,
    PointSystemConfig,
    PointSystem,
    ProposalType,
    CreateProposal
} from "../src/CVStrategy/CVStrategyV0_0.sol";
import {
    RegistryCommunityV0_0,
    RegistryCommunityInitializeParamsV0_0
} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {RegistrySetupFull} from "allo-v2-test/foundry/shared/RegistrySetup.sol";
import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
import {SafeSetup} from "./shared/SafeSetup.sol";
import {IArbitrable} from "../src/interfaces/IArbitrable.sol";
import {GV2ERC20} from "../script/GV2ERC20.sol";
import {CVStrategyHelpers} from "./CVStrategyHelpers.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SafeArbitratorTest is Test, RegistrySetupFull, AlloSetup, CVStrategyHelpers, SafeSetup {
    SafeArbitrator safeArbitrator;
    CVStrategyV0_0 cvStrategy;
    uint256 poolId;
    RegistryCommunityV0_0 internal registryCommunity;
    GV2ERC20 public token;
    // address allo_owner = address(0x1);
    address factoryOwner = address(1);
    // address local = address(0x5);
    // address pool_admin = address(3);
    address challenger = address(3);

    uint256 public constant POOL_AMOUNT = 15000 ether;
    uint256 constant TOTAL_SUPPLY = 100000 ether;
    uint256 constant MINIMUM_STAKE = 1 ether;
    uint256 constant COMMUNITY_FEE_PERCENTAGE = 1;
    uint256 constant PROTOCOL_FEE_PERCENTAGE = 1;
    uint256 constant ARBITRATION_FEE = 2 ether;
    uint256 public constant STAKE_WITH_FEES =
        MINIMUM_STAKE + (MINIMUM_STAKE * (COMMUNITY_FEE_PERCENTAGE + PROTOCOL_FEE_PERCENTAGE)) / 100;

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
            payable(
                address(
                    new ERC1967Proxy(
                        address(new SafeArbitrator()),
                        abi.encodeWithSelector(SafeArbitrator.initialize.selector, ARBITRATION_FEE, factoryOwner)
                    )
                )
            )
        );

        // RegistryFactoryV0_0 registryFactory = new RegistryFactoryV0_0();

        vm.stopPrank();

        RegistryCommunityInitializeParamsV0_0 memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = COMMUNITY_FEE_PERCENTAGE;

        params._feeReceiver = address(this);

        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));

        registryCommunity = RegistryCommunityV0_0(
            RegistryFactoryV0_0(
                address(
                    new ERC1967Proxy(
                        address(new RegistryFactoryV0_0()),
                        abi.encodeWithSelector(
                            RegistryFactoryV0_0.initialize.selector,
                            address(factoryOwner),
                            address(2),
                            address(new RegistryCommunityV0_0()),
                            address(new CVStrategyV0_0()),
                            address(new CollateralVault())
                        )
                    )
                )
            ).createRegistry(params)
        );

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
                0
            ),
            metadata
        );
        vm.startPrank(challenger);
        registryCommunity.gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        vm.stopPrank();

        poolId = _poolId;
        cvStrategy = CVStrategyV0_0(payable(_strategy));
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
        allo().fundPool{value: POOL_AMOUNT}(_poolId, POOL_AMOUNT);
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
        vm.prank(challenger);

        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");
        (, address configTribunalSafe,,,,) = cvStrategy.arbitrableConfigs(cvStrategy.currentArbitrableConfigVersion());
        safeArbitrator.createDispute{value: ARBITRATION_FEE}(3, "");

        (
            ,
            ,
            uint256 choices,
            uint256 arbitrationFee,
            uint256 ruling,
            SafeArbitrator.DisputeStatus status,
            address tribunalSafe
        ) = safeArbitrator.disputes(disputeID);

        assertEq(choices, 3);
        assertEq(arbitrationFee, ARBITRATION_FEE);
        assertEq(ruling, 0);
        assertEq(uint256(status), uint256(SafeArbitrator.DisputeStatus.Waiting));
        assertEq(tribunalSafe, configTribunalSafe);
    }

    function testExecuteRuling() public {
        uint256 proposalId = createProposal();

        vm.deal(challenger, 10 ether);
        vm.prank(challenger);
        uint256 disputeID = cvStrategy.disputeProposal{value: 0.01 ether + ARBITRATION_FEE}(proposalId, "", "");

        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeID, 2, address(cvStrategy));

        (,,,, uint256 ruling, SafeArbitrator.DisputeStatus status,) = safeArbitrator.disputes(disputeID);
        assertEq(ruling, 2);
        assertEq(uint256(status), uint256(SafeArbitrator.DisputeStatus.Solved));
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

        (uint256 ruling, bool tied, bool overridden) = safeArbitrator.currentRuling(disputeID);

        assertEq(ruling, 2);
        assertFalse(tied);
        assertFalse(overridden);
    }
}
