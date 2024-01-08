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
import {RegistryGardens} from "../src/RegistryGardens.sol";
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
    CVStrategy public strategy;
    MockERC20 public token;
    // uint256 public mintAmount = 1_000 * 10 ** 18;
    uint256 public mintAmount = 15000;
    uint256 public constant TOTAL_SUPPLY = 45000;
    uint256 public constant POOL_AMOUNT = 15000;
    uint256 public constant MINIMUM_STAKE = 50;
    uint256 public constant REQUESTED_AMOUNT = 1000;

    RegistryGardens internal registryGardens;

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

        strategy = new CVStrategy(address(allo()));

        vm.startPrank(allo_owner());
        allo().transferOwnership(local());
        vm.stopPrank();

        // registryGardens = new RegistryGardens();
        RegistryFactory registryFactory = new RegistryFactory();
        RegistryGardens.InitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._minimumStakeAmount = MINIMUM_STAKE;
        params._protocolFee = 2;
        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));
        registryGardens = RegistryGardens(registryFactory.createRegistry(params));

        token.approve(address(registryGardens), registryGardens.getBasisStakedAmount());
        registryGardens.stakeAndregisterMember();
    }

    function _registryGardens() internal view returns (RegistryGardens) {
        return registryGardens;
    }

    /**
     *   HELPERS FUNCTIONS
     */
    function _createProposal(address _tokenPool) public returns (IAllo.Pool memory pool, uint256 poolId) {
        startMeasuringGas("createProposal");
        allo().addToCloneableStrategies(address(strategy));

        vm.startPrank(pool_admin());

        poolId = createPool(allo(), address(strategy), address(_registryGardens()), registry(), address(_tokenPool));

        vm.stopPrank();

        pool = allo().getPool(poolId);

        vm.deal(address(this), 1 ether);
        allo().fundPool{value: POOL_AMOUNT}(poolId, POOL_AMOUNT);

        assertEq(pool.profileId, poolProfile_id1(registry()), "poolProfileID");
        assertNotEq(address(pool.strategy), address(strategy), "Strategy Clones");

        startMeasuringGas("createProposal");
        CVStrategy.CreateProposal memory proposal = CVStrategy.CreateProposal(
            1, poolId, pool_admin(), pool_admin(), CVStrategy.ProposalType.Signaling, REQUESTED_AMOUNT, NATIVE
        );
        bytes memory data = abi.encode(proposal);
        allo().registerRecipient(poolId, data);

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
        ( /*IAllo.Pool memory pool*/ , uint256 poolId) = _createProposal(NATIVE);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](2);
        // votes[0] = CVStrategy.ProposalSupport(1, 70); // 0 + 70 = 70% = 35
        votes[0] = CVStrategy.ProposalSupport(1, 80); // 0 + 70 = 70% = 35
        votes[1] = CVStrategy.ProposalSupport(1, 20); // 70 + 20 = 90% = 45
        // votes[2] = CVStrategy.ProposalSupport(1, -10); // 90 - 10 = 80% = 40
        // 35 + 45 + 40 = 120
        bytes memory data = abi.encode(votes);
        // vm.expectRevert(CVStrategy.ProposalSupportDuplicated.selector);
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalSupportDuplicated.selector, 1, 0));
        allo().allocate(poolId, data);
        stopMeasuringGas();
    }

    // @todo write that test vote without have points
    function testRevert_allocate_UserNotInRegistry() public {
        ( /*IAllo.Pool memory pool*/ , uint256 poolId) = _createProposal(NATIVE);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](2);
        // votes[0] = CVStrategy.ProposalSupport(1, 70); // 0 + 70 = 70% = 35
        votes[0] = CVStrategy.ProposalSupport(1, 80); // 0 + 70 = 70% = 35
        votes[1] = CVStrategy.ProposalSupport(1, 20); // 70 + 20 = 90% = 45
        // votes[2] = CVStrategy.ProposalSupport(1, -10); // 90 - 10 = 80% = 40
        // 35 + 45 + 40 = 120
        bytes memory data = abi.encode(votes);
        vm.startPrank(pool_admin());
        vm.expectRevert(CVStrategy.UserNotInRegistry.selector);
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalSupportDuplicated.selector, 1, 0));
        allo().allocate(poolId, data);

        vm.stopPrank();
        stopMeasuringGas();
    }

    function testRevert_allocate_removeSupport_wo_support_before_SUPPORT_UNDERFLOW() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, -100);
        bytes memory data = abi.encode(votes);

        vm.expectRevert(abi.encodeWithSelector(CVStrategy.SupportUnderflow.selector, 0, -100, -100));
        allo().allocate(poolId, data);
        stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(cv.getProposalVoterStake(1, address(this)), 0, "VoterStakeAmount"); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(1), 0, "TotalStakedAmountInProposal");
    }

    function testRevert_registerRecipient_ProposalIdAlreadyExist() public {
        (, uint256 poolId) = _createProposal(NATIVE);

        CVStrategy.CreateProposal memory proposal = CVStrategy.CreateProposal(
            1, poolId, pool_admin(), pool_admin(), CVStrategy.ProposalType.Signaling, REQUESTED_AMOUNT, NATIVE
        );
        bytes memory data = abi.encode(proposal);
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalIdAlreadyExist.selector, 1));
        allo().registerRecipient(poolId, data);
    }

    function test_proposalSupported_2_times() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);

        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, 80); // 0 + 70 = 70% = 35 range is -100 +100
        bytes memory data = abi.encode(votes);

        allo().allocate(poolId, data);

        stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), 40); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(1), 40); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        token.approve(address(registryGardens), registryGardens.getBasisStakedAmount());
        registryGardens.stakeAndregisterMember();

        CVStrategy.ProposalSupport[] memory votes2 = new CVStrategy.ProposalSupport[](1);
        votes2[0] = CVStrategy.ProposalSupport(1, 100);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        assertEq(cv.getProposalVoterStake(1, address(pool_admin())), 50); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(1), 40 + 50);
    }

    function test_conviction_check_function() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);

        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, 80);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 AMOUNT_STAKED = 40;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(1), AMOUNT_STAKED);

        uint256 cv_amount = cv.calculateConviction(10, 0, AMOUNT_STAKED);
        console.log("cv_amount: %s", cv_amount);
        uint256 cv_cmp = _calculateConviction(10, 0, AMOUNT_STAKED, 0.9 ether / 10 ** 11);
        console.log("cv_cmp: %s", cv_cmp);
        assertEq(cv_amount, cv_cmp);
    }

    function test_conviction_check_as_js_test() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);
        uint256 AMOUNT_STAKED = 45000;

        // registryGardens.setBasisStakedAmount(AMOUNT_STAKED);
        safeHelper(
            address(registryGardens),
            0,
            abi.encodeWithSelector(registryGardens.setBasisStakedAmount.selector, AMOUNT_STAKED)
        );
        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, 100);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(1), AMOUNT_STAKED);

        uint256 AMOUNT_STAKED_1 = 15000;
        uint256 cv_amount = cv.calculateConviction(10, 0, AMOUNT_STAKED_1);

        console.log("cv_amount: %s", cv_amount);
        uint256 cv_cmp = _calculateConviction(10, 0, AMOUNT_STAKED_1, 0.9 ether / 10 ** 11);
        console.log("cv_cmp: %s", cv_cmp);

        assertEq(cv_amount, cv_cmp);
        assertEq(AMOUNT_STAKED_1, 15000);
        assertEq(AMOUNT_STAKED, 45000);
        assertEq(cv_amount, 97698);

        // registryGardens.setBasisStakedAmount(MINIMUM_STAKE);
        safeHelper(
            address(registryGardens),
            0,
            abi.encodeWithSelector(registryGardens.setBasisStakedAmount.selector, MINIMUM_STAKE)
        );
    }

    function test_threshold_check_as_js_test() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);
        // registryGardens.setBasisStakedAmount(45000);
        safeHelper(
            address(registryGardens), 0, abi.encodeWithSelector(registryGardens.setBasisStakedAmount.selector, 45000)
        );
        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, 100); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 AMOUNT_STAKED = 45000;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), AMOUNT_STAKED); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(1), AMOUNT_STAKED); // 80% of 50 = 40

        uint256 ct1 = cv.calculateThreshold(REQUESTED_AMOUNT);
        console.log("threshold %s", ct1);
        assertEq(AMOUNT_STAKED, 45000);
        assertEq(ct1, 50625);

        // registryGardens.setBasisStakedAmount(MINIMUM_STAKE);
        safeHelper(
            address(registryGardens),
            0,
            abi.encodeWithSelector(registryGardens.setBasisStakedAmount.selector, MINIMUM_STAKE)
        );
    }

    function test_total_staked_amount() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);
        // registryGardens.setBasisStakedAmount(45000);
        safeHelper(
            address(registryGardens), 0, abi.encodeWithSelector(registryGardens.setBasisStakedAmount.selector, 45000)
        );
        /**
         * ASSERTS
         */
        // startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, 100);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        // stopMeasuringGas();

        uint256 AMOUNT_STAKED = 45000;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(1), AMOUNT_STAKED);

        votes[0] = CVStrategy.ProposalSupport(1, -100);
        data = abi.encode(votes);
        allo().allocate(poolId, data);

        assertEq(cv.getProposalVoterStake(1, address(this)), 0, "VoterStake");
        assertEq(cv.getProposalStakedAmount(1), 0, "StakedAmount");

        assertEq(cv.effectiveSupply_old_totalStaked(), 0, "TotalStaked");

        // registryGardens.setBasisStakedAmount(MINIMUM_STAKE);
        safeHelper(
            address(registryGardens),
            0,
            abi.encodeWithSelector(registryGardens.setBasisStakedAmount.selector, MINIMUM_STAKE)
        );
    }

    function test_allocate_proposalSupport_empty_array() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](2);
        votes[0] = CVStrategy.ProposalSupport(1, 100);
        votes[1];
        bytes memory data = abi.encode(votes);

        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.SupportUnderflow.selector, 0, -100, -100));
        allo().allocate(poolId, data);
        stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(cv.getProposalVoterStake(1, address(this)), 50); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(1), 50);
    }

    function test_1_proposalSupported() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = 80;
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        token.approve(address(registryGardens), registryGardens.getBasisStakedAmount());
        registryGardens.stakeAndregisterMember();

        CVStrategy.ProposalSupport[] memory votes2 = new CVStrategy.ProposalSupport[](1);
        int256 SUPPORT_PCT2 = 100;
        votes2[0] = CVStrategy.ProposalSupport(1, SUPPORT_PCT2);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2) * MINIMUM_STAKE / 100;

        assertEq(cv.getProposalVoterStake(1, address(pool_admin())), STAKED_AMOUNT2); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT + STAKED_AMOUNT2);

        /**
         * ASSERTS
         *
         */
        vm.warp(10 days);

        (
            address submitter,
            address beneficiary,
            address requestedToken,
            uint256 requestedAmount,
            uint256 stakedTokens,
            CVStrategy.ProposalType proposalType,
            CVStrategy.ProposalStatus proposalStatus,
            uint256 blockLast,
            uint256 convictionLast,
            uint256 agreementActionId,
            uint256 threshold
        ) = cv.getProposal(1);

        // console.log("Proposal Status: %s", proposalStatus);
        // console.log("Proposal Type: %s", proposalType);
        // console.log("Requested Token: %s", requestedToken);
        console.log("Requested Amount: %s", requestedAmount);
        console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold: %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        console.log("Block Last: %s", blockLast);
        console.log("Conviction Last: %s", convictionLast);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);
    }

    function test_distribute_native_token() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal(NATIVE);

        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = 100;
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, SUPPORT_PCT); // 0 + 70 = 70% = 35
        // bytes memory data = ;
        allo().allocate(poolId, abi.encode(votes));
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT); // 80% of 50 = 40

        (
            ,
            address beneficiary,
            ,
            uint256 requestedAmount,
            uint256 stakedTokens,
            ,
            ,
            uint256 blockLast,
            uint256 convictionLast,
            ,
            uint256 threshold
        ) = cv.getProposal(1);

        // console.log("Proposal Status: %s", proposalStatus);
        // console.log("Proposal Type: %s", proposalType);
        // console.log("Requested Token: %s", requestedToken);
        console.log("Requested Amount: %s", requestedAmount);
        console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold: %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        console.log("Block Last: %s", blockLast);
        console.log("Conviction Last: %s", convictionLast);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);
        address[] memory recipients = new address[](0);
        // recipients[0] = address(1);
        bytes memory dataProposal = abi.encode(1);

        uint256 amount = getBalance(pool.token, beneficiary);
        // console.log("Beneficienry Before amount: %s", amount);

        assertEq(amount, 0);

        allo().distribute(poolId, recipients, dataProposal);
        amount = getBalance(pool.token, beneficiary);
        // console.log("Beneficienry After amount: %s", amount);
        assertEq(amount, requestedAmount);
    }
}
