// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
// Core contracts
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
// Internal Libraries
import {Errors} from "allo-v2-contracts/core/libraries/Errors.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
// Test libraries
import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
import {RegistrySetupFull} from "allo-v2-test/foundry/shared/RegistrySetup.sol";
import {TestStrategy} from "allo-v2-test/utils/TestStrategy.sol";
import {MockStrategy} from "allo-v2-test/utils/MockStrategy.sol";
import {MockERC20} from "allo-v2-test/utils/MockERC20.sol";

import {CVStrategy} from "../src/CVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";

import {GasHelpers2} from "./shared/GasHelpers2.sol";
import {SafeSetup} from "./shared/SafeSetup.sol";
import {CVStrategyHelpers} from "./CVStrategyHelpers.sol";
/* @dev Run 
* forge test --mc CVStrategyTest -vvvvv
* forge test --mt testRevert -vvvv
* forge test --mc CVStrategyTest --mt test -vv 
*/

contract CVStrategyTest is Test, AlloSetup, RegistrySetupFull, CVStrategyHelpers, Errors, GasHelpers2, SafeSetup {
    MockERC20 public token;
    uint256 public mintAmount = 15000 ether;
    uint256 public constant TOTAL_SUPPLY = 45000 ether;
    uint256 public constant POOL_AMOUNT = 15000 ether;
    uint256 public constant MINIMUM_STAKE = 50 ether;
    uint256 public constant PROTOCOL_FEE_PERCENTAGE = 1;
    uint256 public constant COMMUNITY_FEE_PERCENTAGE = 2;
    uint256 public constant STAKE_WITH_FEES =
        MINIMUM_STAKE + (MINIMUM_STAKE * (COMMUNITY_FEE_PERCENTAGE + PROTOCOL_FEE_PERCENTAGE)) / 100;
    uint256 public constant REQUESTED_AMOUNT = 1000 ether;
    

    RegistryCommunity internal registryCommunity;
    address factoryOwner = makeAddr("registryFactoryDeployer");

    function setUp() public {
        __RegistrySetupFull();
        __AlloSetup(address(registry()));

        vm.startPrank(allo_owner());
        allo().updateBaseFee(0);
        allo().updatePercentFee(0);
        vm.stopPrank();

        token = new MockERC20();
        token.mint(local(), TOTAL_SUPPLY / 2);
        token.mint(pool_admin(), TOTAL_SUPPLY / 2);
        token.approve(address(allo()), mintAmount);

        vm.startPrank(allo_owner());
        allo().transferOwnership(local());
        vm.stopPrank();

        // registryCommunity = new RegistryCommunity();
        vm.startPrank(factoryOwner);
        RegistryFactory registryFactory = new RegistryFactory();
        vm.stopPrank();

        RegistryCommunity.InitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = COMMUNITY_FEE_PERCENTAGE;
        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));

        registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        vm.startPrank(factoryOwner);
        registryFactory.setProtocolFee(address(registryCommunity), PROTOCOL_FEE_PERCENTAGE);
        vm.stopPrank();
        token.approve(address(registryCommunity), registryCommunity.getBasisStakedAmount());
    }

    function _registryCommunity() internal view returns (RegistryCommunity) {
        return registryCommunity;
    }

    /**
     *   HELPERS FUNCTIONS
     */
    function _createProposal(address _tokenPool, uint256 requestAmount, uint256 poolAmount)
        public
        returns (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId)
    {
        (pool, poolId, proposalId) =
            _createProposal(_tokenPool, requestAmount, poolAmount, CVStrategy.ProposalType.Funding);
    }

    function _createProposal(
        address _tokenPool,
        uint256 requestAmount,
        uint256 poolAmount,
        CVStrategy.ProposalType proposalType
    ) public returns (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) {
        if (requestAmount == 0) {
            requestAmount = REQUESTED_AMOUNT;
        }

        if (poolAmount == 0) {
            poolAmount = POOL_AMOUNT;
        }
        address useTokenPool = _tokenPool;
        if (_tokenPool == address(0)) {
            useTokenPool = NATIVE;
        }

        startMeasuringGas("createProposal");
        // allo().addToCloneableStrategies(address(strategy));

        vm.startPrank(pool_admin());

        CVStrategy strategy = new CVStrategy(address(allo()));

        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy))
        );

        poolId = createPool(
            allo(), address(strategy), address(_registryCommunity()), registry(), address(useTokenPool), proposalType
        );

        vm.stopPrank();

        _registryCommunity().gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember();
        strategy.activatePoints();

        pool = allo().getPool(poolId);

        vm.deal(address(this), poolAmount);
        if (useTokenPool == NATIVE) {
            allo().fundPool{value: poolAmount}(poolId, poolAmount);
        } else {
            MockERC20(useTokenPool).mint(address(this), poolAmount);
            MockERC20(useTokenPool).approve(address(allo()), poolAmount);
            allo().fundPool(poolId, poolAmount);
        }

        assertEq(pool.profileId, poolProfile_id1(registry(), local(), pool_managers()), "poolProfileID");
        // assertNotEq(address(pool.strategy), address(strategy), "Strategy Clones");

        startMeasuringGas("createProposal");

        CVStrategy.CreateProposal memory proposal =
            CVStrategy.CreateProposal(poolId, pool_admin(), requestAmount, address(useTokenPool), metadata);
        bytes memory data = abi.encode(proposal);
        proposalId = uint160(allo().registerRecipient(poolId, data));

        stopMeasuringGas();
    }

    function getBalance(address _token, address holder) public view returns (uint256) {
        if (_token == NATIVE) {
            return address(holder).balance;
        } else {
            return IERC20(_token).balanceOf(address(holder));
        }
    }
    /**
     *    TESTS
     */

    function testRevert_allocate_ProposalIdDuplicated() public {
        ( /*IAllo.Pool memory pool*/ , uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](2);
        // votes[0] = CVStrategy.ProposalSupport(proposalId, 70); // 0 + 70 = 70% = 35
        votes[0] = CVStrategy.ProposalSupport(proposalId, 80); // 0 + 70 = 70% = 35
        votes[1] = CVStrategy.ProposalSupport(proposalId, 20); // 70 + 20 = 90% = 45
        // votes[2] = CVStrategy.ProposalSupport(proposalId, -10); // 90 - 10 = 80% = 40
        // 35 + 45 + 40 = 120
        bytes memory data = abi.encode(votes);
        // vm.expectRevert(CVStrategy.ProposalSupportDuplicated.selector);
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalSupportDuplicated.selector, proposalId, 0));
        allo().allocate(poolId, data);
        stopMeasuringGas();
    }

    function testRevert_allocate_UserNotInRegistry() public {
        ( /*IAllo.Pool memory pool*/ , uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](2);
        // votes[0] = CVStrategy.ProposalSupport(proposalId, 70); // 0 + 70 = 70% = 35
        votes[0] = CVStrategy.ProposalSupport(proposalId, 80); // 0 + 70 = 70% = 35
        votes[1] = CVStrategy.ProposalSupport(proposalId, 20); // 70 + 20 = 90% = 45
        // votes[2] = CVStrategy.ProposalSupport(proposalId, -10); // 90 - 10 = 80% = 40
        // 35 + 45 + 40 = 120
        bytes memory data = abi.encode(votes);
        vm.startPrank(pool_admin());
        vm.expectRevert(CVStrategy.UserNotInRegistry.selector);
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalSupportDuplicated.selector, proposalId, 0));
        allo().allocate(poolId, data);

        vm.stopPrank();
        stopMeasuringGas();
    }

    function testRevert_allocate_removeSupport_wo_support_before_SUPPORT_UNDERFLOW() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, -100);
        bytes memory data = abi.encode(votes);

        vm.expectRevert(abi.encodeWithSelector(CVStrategy.SupportUnderflow.selector, 0, -100, -100));
        allo().allocate(poolId, data);
        stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), 0, "VoterStakeAmount"); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), 0, "TotalStakedAmountInProposal");
    }

    function testRevert_registerRecipient_TokenNotAllowed() public {
        (, uint256 poolId,) = _createProposal(NATIVE, 0, 0);

        // address wrong_token = address(new MockERC20());
        CVStrategy.CreateProposal memory proposal =
            CVStrategy.CreateProposal(poolId, pool_admin(), REQUESTED_AMOUNT, address(0x666), metadata);
        bytes memory data = abi.encode(proposal);
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.TokenNotAllowed.selector));
        allo().registerRecipient(poolId, data);
    }

    function test_proposalSupported_change_support() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, 80); // 0 + 70 = 70% = 35 range is -100 +100
        bytes memory data = abi.encode(votes);

        allo().allocate(poolId, data);

        stopMeasuringGas();
        uint256 STAKED_AMOUNT = 80 * MINIMUM_STAKE / 100;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        // vm.startPrank(pool_admin());

        // token.approve(address(registryCommunity), registryCommunity.getBasisStakedAmount());
        // registryCommunity.stakeAndregisterMember();

        CVStrategy.ProposalSupport[] memory votes2 = new CVStrategy.ProposalSupport[](1);
        votes2[0] = CVStrategy.ProposalSupport(proposalId, 20);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        // vm.stopPrank();

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), MINIMUM_STAKE); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), MINIMUM_STAKE);
    }

    function test_conviction_check_function() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        cv.setDecay(_etherToFloat(0.9 ether)); // alpha = decay
        cv.setMaxRatio(_etherToFloat(0.2 ether)); // beta = maxRatio
        cv.setWeight(_etherToFloat(0.002 ether)); // RHO = p  = weight

        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, 80);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 AMOUNT_STAKED = 80 * MINIMUM_STAKE / 100;
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(proposalId), AMOUNT_STAKED);

        uint256 cv_amount = cv.calculateConviction(10, 0, AMOUNT_STAKED);
        console.log("cv_amount: %s", cv_amount);
        uint256 cv_cmp = _calculateConviction(10, 0, AMOUNT_STAKED, 0.9 ether / 10 ** 11);
        console.log("cv_cmp: %s", cv_cmp);
        assertEq(cv_amount, cv_cmp);
    }

    function test_conviction_check_as_js_test() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        cv.setDecay(_etherToFloat(0.9 ether)); // alpha = decay
        cv.setMaxRatio(_etherToFloat(0.2 ether)); // beta = maxRatio
        cv.setWeight(_etherToFloat(0.002 ether)); // RHO = p  = weight
        uint256 AMOUNT_STAKED = 45000;

        // registryCommunity.setBasisStakedAmount(AMOUNT_STAKED);
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, AMOUNT_STAKED)
        );
        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, 100);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(proposalId), AMOUNT_STAKED);

        uint256 AMOUNT_STAKED_1 = 15000;
        uint256 cv_amount = cv.calculateConviction(10, 0, AMOUNT_STAKED_1);

        console.log("cv_amount: %s", cv_amount);
        uint256 cv_cmp = _calculateConviction(10, 0, AMOUNT_STAKED_1, 0.9 ether / 10 ** 11);
        console.log("cv_cmp: %s", cv_cmp);

        assertEq(cv_amount, cv_cmp);
        assertEq(AMOUNT_STAKED_1, 15000);
        assertEq(AMOUNT_STAKED, 45000);
        assertEq(cv_amount, 97698);

        // registryCommunity.setBasisStakedAmount(MINIMUM_STAKE);
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, MINIMUM_STAKE)
        );
    }

    function disabled_test_threshold_check_as_js_test() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        cv.setDecay(_etherToFloat(0.9 ether)); // alpha = decay
        cv.setMaxRatio(_etherToFloat(0.2 ether)); // beta = maxRatio
        cv.setWeight(_etherToFloat(0.002 ether)); // RHO = p  = weight
        // registryCommunity.setBasisStakedAmount(45000);
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, 45000)
        );
        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, 100); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 AMOUNT_STAKED = 45000;
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), AMOUNT_STAKED); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), AMOUNT_STAKED); // 80% of 50 = 40

        uint256 ct1 = cv.calculateThreshold(1000);
        console.log("threshold %s", ct1);
        assertEq(AMOUNT_STAKED, 45000);
        assertEq(ct1, 50625);

        // registryCommunity.setBasisStakedAmount(MINIMUM_STAKE);
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, MINIMUM_STAKE)
        );
    }

    function test_total_staked_amount() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        // registryCommunity.setBasisStakedAmount(45000);
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, 45 ether)
        );
        /**
         * ASSERTS
         */
        // startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, 100);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        // stopMeasuringGas();

        uint256 AMOUNT_STAKED = 45 ether;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(1), AMOUNT_STAKED );

        votes[0] = CVStrategy.ProposalSupport(1, -80);
        data = abi.encode(votes);
        allo().allocate(poolId, data);

        assertEq(cv.getProposalVoterStake(1, address(this)), (20 * AMOUNT_STAKED)/100, "VoterStake");
        assertEq(cv.getProposalStakedAmount(1), (20 * AMOUNT_STAKED)/100, "StakedAmount");

        assertEq(cv.totalStaked(), (20 * AMOUNT_STAKED)/100, "TotalStaked");

        votes[0] = CVStrategy.ProposalSupport(1, -5);
        data = abi.encode(votes);
        allo().allocate(poolId, data);

        assertEq(cv.getProposalVoterStake(1, address(this)), (15 * AMOUNT_STAKED)/100, "VoterStake");
        assertEq(cv.getProposalStakedAmount(1), (15 * AMOUNT_STAKED)/100, "StakedAmount");

        assertEq(cv.totalStaked(), (15 * AMOUNT_STAKED)/100, "TotalStaked");

        // registryCommunity.setBasisStakedAmount(MINIMUM_STAKE);
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, MINIMUM_STAKE)
        );
    }

    function test_allocate_proposalSupport_empty_array() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](2);
        votes[0] = CVStrategy.ProposalSupport(proposalId, 100);
        votes[1];
        bytes memory data = abi.encode(votes);

        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.SupportUnderflow.selector, 0, -100, -100));
        allo().allocate(poolId, data);
        stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), MINIMUM_STAKE); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), MINIMUM_STAKE);
    }
    function test_allocate_proposalSupport_precision() public {
        uint256 TWO_POINT_FIVE_TOKENS = 2.5 ether ;
        uint256 PRECISE_FIVE_PERCENT = 5 * 10 ** 4;

        (IAllo.Pool memory pool, uint256 poolId,) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](2);
        
        votes[0] = CVStrategy.ProposalSupport(1, 5);
        bytes memory data = abi.encode(votes);
        
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.SupportUnderflow.selector, 0, -100, -100));
        allo().allocate(poolId, data);
        stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getTotalVoterStakePct(address(this)),PRECISE_FIVE_PERCENT);
        //assertEq(cv.getProposalVoterStake(1, address(this)), MINIMUM_STAKE); // 100% of 50 = 50
        //assertEq(cv.getProposalStakedAmount(1), (MINIMUM_STAKE * PRECISE_FIVE_PERCENT)/PRECISE_HUNDRED_PERCENT);
        assertEq(cv.getProposalStakedAmount(1), TWO_POINT_FIVE_TOKENS);
    }

    function test_proposalSupported_conviction_threshold_2_users() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(address(0), 50 ether, 1_000 ether);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // cv.setDecay(_etherToFloat(0.9999987 ether)); // alpha = decay
        // cv.setMaxRatio(_etherToFloat(0.7 ether)); // beta = maxRatio
        // cv.setWeight(_etherToFloat(0.049 ether)); // RHO = p  = weight

        // FAST 1 MIN GROWTH
        cv.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        cv.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        cv.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight
        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = 100;
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / (100 * 10 ** 4);
        assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember();
        cv.activatePoints();

        CVStrategy.ProposalSupport[] memory votes2 = new CVStrategy.ProposalSupport[](1);
        int256 SUPPORT_PCT2 = 100;
        votes2[0] = CVStrategy.ProposalSupport(proposalId, SUPPORT_PCT2);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2) * MINIMUM_STAKE / (100 * 10 ** 4);

        assertEq(cv.getProposalVoterStake(proposalId, address(pool_admin())), STAKED_AMOUNT2); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT + STAKED_AMOUNT2);

        /**
         * ASSERTS
         *
         */
        console.log("before block.number", block.number);
        uint256 totalEffectiveActivePoints = cv.totalEffectiveActivePoints();
        console.log("totalEffectiveActivePoints", totalEffectiveActivePoints);
        console.log("maxCVSupply", cv.getMaxConviction(totalEffectiveActivePoints));
        console.log("maxCVStaked", cv.getMaxConviction(cv.getProposalStakedAmount(proposalId)));

        assertEq(cv.getMaxConviction(totalEffectiveActivePoints), 289034, "maxCVSupply");
        assertEq(cv.getMaxConviction(cv.getProposalStakedAmount(proposalId)), 28903, "maxCVStaked");

        vm.roll(110);
        console.log("after block.number", block.number);
        // x = 8731 / 149253
        // x = 0.174 current tokens growth

        // convictionLast / maxConviction(effectivestaked) * 100 = stakedConviction in percetage of the effetiveSupply
        // threshold / maxConviction(effectivestaked)

        cv.updateProposalConviction(proposalId);

        (
            , // address submitter,
            , // address beneficiary,
            , // address requestedToken,
            , // uint256 requestedAmount,
            , // uint256 stakedTokens,
            , // ProposalStatus proposalStatus,
            , // uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold,
            uint256 voterPointsPct
        ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        // console.log("Threshold: %s", threshold);
        // console.log("Conviction Last: %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        assertEq(threshold, 57806, "threshold");
        assertEq(convictionLast, 9093 , "convictionLast");
        assertEq(voterPointsPct, 100 * 10 ** 4, "voterPointsPct");
    }

    function test_1_proposalSupported() public {
        console.log("tokenPool", address(token));
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(address(token), 0, 0);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = 80;
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT, "ProposalVoterStake1"); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        CVStrategy.CreateProposal memory proposal = CVStrategy.CreateProposal(
            // proposalID2,
            poolId,
            pool_admin(),
            // CVStrategy.ProposalType.Funding,
            REQUESTED_AMOUNT,
            address(token),
            metadata
        );
        data = abi.encode(proposal);

        uint256 proposalID2 = uint160(allo().registerRecipient(poolId, data));

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember();
        cv.activatePoints();

        votes = new CVStrategy.ProposalSupport[](1);
        int256 SUPPORT_PCT2 = 100;
        votes[0] = CVStrategy.ProposalSupport(proposalID2, SUPPORT_PCT2);
        data = abi.encode(votes);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2) * MINIMUM_STAKE / 100;

        assertEq(cv.getProposalVoterStake(proposalID2, address(pool_admin())), STAKED_AMOUNT2, "ProposalVoterStake2"); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalID2), STAKED_AMOUNT2, "StakedMount2");

        /**
         * ASSERTS
         *
         */
        console.log("before block.number", block.number);
        console.log("maxCVSupply", cv.getMaxConviction(cv.totalStaked()));
        console.log("maxCVStaked", cv.getMaxConviction(cv.getProposalStakedAmount(proposalId)));
        vm.roll(10);
        console.log("after block.number", block.number);

        cv.updateProposalConviction(proposalId);

        // (
        //     ,
        //     ,
        //     ,
        //     uint256 requestedAmount,
        //     uint256 stakedTokens,
        //     ,
        //     ,
        //     uint256 convictionLast,
        //     uint256 threshold,
        //     uint256 voterPointsPct
        // ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        // console.log("Threshold: %s", threshold);
        // console.log("Conviction Last: %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
    }

    function test_distribute_native_token() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = 100;
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        // bytes memory data = ;
        allo().allocate(poolId, abi.encode(votes));
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT); // 80% of 50 = 40

        (
            , // address submitter,
            address beneficiary,
            , // address requestedToken,
            uint256 requestedAmount,
            , // uint256 stakedTokens,
            , // ProposalStatus proposalStatus,
            , // uint256 blockLast,
            , // uint256 convictionLast,
            , // uint256 threshold,
                // uint256 voterPointsPct
        ) = cv.getProposal(proposalId);

        // console.log("Proposal Status: %s", proposalStatus);
        // console.log("Proposal Type: %s", proposalType);
        // console.log("Requested Token: %s", requestedToken);
        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        // console.log("Threshold: %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        // console.log("Block Last: %s", blockLast);
        // console.log("Conviction Last: %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);
        address[] memory recipients = new address[](0);
        // recipients[0] = address(1);
        bytes memory dataProposal = abi.encode(proposalId);

        uint256 amount = getBalance(pool.token, beneficiary);
        // console.log("Beneficienry Before amount: %s", amount);

        assertEq(amount, 0);

        allo().distribute(poolId, recipients, dataProposal);
        amount = getBalance(pool.token, beneficiary);
        // console.log("Beneficienry After amount: %s", amount);
        assertEq(amount, requestedAmount);
    }

    function test_distribute_signaling_proposal() public {
        (IAllo.Pool memory pool, uint256 poolId,) = _createProposal(address(0), 0, 0, CVStrategy.ProposalType.Signaling);

        startMeasuringGas("createProposal");

        CVStrategy.CreateProposal memory proposal =
            CVStrategy.CreateProposal(poolId, address(0), 0, address(0), metadata);
        bytes memory data = abi.encode(proposal);
        uint256 PROPOSAL_ID = uint160(allo().registerRecipient(poolId, data));

        stopMeasuringGas();
        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = 100;
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(PROPOSAL_ID, SUPPORT_PCT); // 0 + 70 = 70% = 35
        // bytes memory data = ;
        allo().allocate(poolId, abi.encode(votes));
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(PROPOSAL_ID, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(PROPOSAL_ID), STAKED_AMOUNT); // 80% of 50 = 40

        printProposalDetails(cv, PROPOSAL_ID);
        // address[] memory recipients = ;
        // recipients[0] = address(1);
        bytes memory dataProposal = abi.encode(PROPOSAL_ID);

        allo().distribute(poolId, new address[](0), dataProposal);
        // console.log("Beneficienry After amount: %s", amount);
    }

    function printProposalDetails(CVStrategy cv, uint256 proposalId) public view {
        (
            , // address submitter,
            , // address beneficiary,
            , // address requestedToken,
            uint256 requestedAmount,
            uint256 stakedTokens,
            , // ProposalStatus proposalStatus,
            uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold,
            // uint256 voterPointsPct
        ) = cv.getProposal(proposalId);

        // console.log("Proposal Status: %s", proposalStatus);
        // console.log("Proposal Type: %s", proposalType);
        // console.log("Requested Token: %s", requestedToken);

        // Return the proposal details
        console.log("Requested Amount: %s", requestedAmount);
        console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold: %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        console.log("Block Last: %s", blockLast);
        console.log("Conviction Last: %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);
    }

    function test_registry_community_name_default_empty() public {
        RegistryFactory registryFactory = new RegistryFactory();

        RegistryCommunity.InitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 2;
        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));

        registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        // CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(registryCommunity.communityName(), "", "communityMember");
    }

    function test_registry_community_name_defined() public {
        RegistryFactory registryFactory = new RegistryFactory();

        RegistryCommunity.InitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 2;
        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));
        params._communityName = "GardensDAO";

        registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        // CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(registryCommunity.communityName(), "GardensDAO", "communityMember");
    }

    function test_activate_points() public {
        (IAllo.Pool memory pool,,) = _createProposal(address(0), 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        registryCommunity.stakeAndRegisterMember();
        assertEq(registryCommunity.isMember(local()), true, "isMember");

        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserAlreadyActivated.selector));
        cv.activatePoints();

        vm.startPrank(pool_admin());
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember();
        assertEq(registryCommunity.isMember(pool_admin()), true, "isMember");

        cv.activatePoints();
        vm.stopPrank();

        assertEq(registryCommunity.isMember(pool_admin()), true, "isMember");
    }

    function test_deactivate_points() public {
        (IAllo.Pool memory pool,,) = _createProposal(address(0), 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        registryCommunity.stakeAndRegisterMember();
        assertEq(registryCommunity.isMember(local()), true, "isMember");
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserAlreadyActivated.selector));
        cv.activatePoints();

        cv.deactivatePoints();
        // assertEq(registryCommunity.isMember(local()), false, "isMember");

        vm.startPrank(pool_admin());
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember();
        assertEq(registryCommunity.isMember(pool_admin()), true, "isMember");
        cv.activatePoints();
        assertEq(registryCommunity.totalPointsActivatedInStrategy(address(cv)),100 * 10 ** 4);
        
        cv.deactivatePoints();
        assertEq(registryCommunity.totalPointsActivatedInStrategy(address(cv)),0);
        
        vm.stopPrank();

        // assertEq(registryCommunity.isMember(pool_admin()), false, "isMember");
    }

    
}
