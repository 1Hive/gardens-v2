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
import {GasHelpers} from "allo-v2-test/utils/GasHelpers.sol";

import {CVStrategy} from "../src/CVStrategy.sol";
import {RegistryGardens} from "../src/RegistryGardens.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";

/* @dev Run 
* forge test --mc CVStrategyTest -vvvvv
* forge test --mt testRevert -vvvv
* forge test --mc CVStrategyTest --mt test -vv 
*/
contract CVStrategyTest is Test, AlloSetup, RegistrySetupFull, Native, Errors, GasHelpers {
    CVStrategy public strategy;
    MockERC20 public token;
    uint256 public mintAmount = 1_000_000 * 10 ** 18;
    uint256 public constant MINIMUM_STAKE = 50;

    Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"});

    RegistryGardens internal registryGardens;
    uint256 internal constant TWO_127 = 2 ** 127;
    uint256 internal constant TWO_128 = 2 ** 128;
    uint256 internal constant D = 10 ** 7;


    function setUp() public {
        __RegistrySetupFull();
        __AlloSetup(address(registry()));

        vm.startPrank(allo_owner());
        allo().updateBaseFee(0);
        allo().updatePercentFee(0);
        vm.stopPrank();

        token = new MockERC20();
        token.mint(local(), mintAmount);
        token.mint(allo_owner(), mintAmount);
        token.mint(pool_admin(), mintAmount);
        token.approve(address(allo()), mintAmount);

        vm.prank(pool_admin());
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
        registryGardens = RegistryGardens(registryFactory.createRegistry(params));
    }

    function _registryGardens() internal view returns (RegistryGardens) {
        return registryGardens;
    }

    event PoolCreated(
        uint256 indexed poolId,
        bytes32 indexed profileId,
        IStrategy strategy,
        address token,
        uint256 amount,
        Metadata metadata
    );

    //        bytes data;

    function testRevert_allocate_ProposalIdDuplicated() public {
        ( /*IAllo.Pool memory pool*/ , uint256 poolId) = _createProposal();

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

    function _createProposal() public returns (IAllo.Pool memory pool, uint256 poolId) {
        startMeasuringGas("createProposal");
        allo().addToCloneableStrategies(address(strategy));

        vm.expectEmit(true, true, false, false);
        emit PoolCreated(1, poolProfile_id(), IStrategy(strategy), NATIVE, 0, metadata);

        vm.startPrank(pool_admin());

        CVStrategy.InitializeParams memory params;
        params.decay = _etherToFloat(0.9 ether); // alpha = decay
        params.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        params.weight = _etherToFloat(0.002 ether); // RHO = p  = weight
        params.minThresholdStakePercentage = 0.2 ether; // 20%
        params.registryGardens = address(_registryGardens());

        poolId = allo().createPool(
            poolProfile_id(), address(strategy), abi.encode(params), NATIVE, 0, metadata, pool_managers()
        );

        vm.stopPrank();

        pool = allo().getPool(poolId);

        vm.deal(address(this), 1 ether);
        allo().fundPool{value: 1 ether}(poolId, 1 ether);

        assertEq(pool.profileId, poolProfile_id());
        assertNotEq(address(pool.strategy), address(strategy));

        startMeasuringGas("createProposal");
        CVStrategy.CreateProposal memory proposal = CVStrategy.CreateProposal(
            1, poolId, pool_admin(), pool_admin(), CVStrategy.ProposalType.Signaling, 0.1 ether, NATIVE
        );
        bytes memory data = abi.encode(proposal);
        allo().registerRecipient(poolId, data);

        stopMeasuringGas();
    }

    // function test_proposalSupported() public {
    //     (IAllo.Pool memory pool, uint256 poolId) = _createProposal();

    //     /**
    //      * ASSERTS
    //      *
    //      */
    //     startMeasuringGas("Support a Proposal");
    //     CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
    //     votes[0] = CVStrategy.ProposalSupport(1, 80); // 0 + 70 = 70% = 35
    //     bytes memory data = abi.encode(votes);
    //     allo().allocate(poolId, data);
    //     stopMeasuringGas();

    //     CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
    //     assertEq(cv.getProposalVoterStake(1, address(this)), 40); // 80% of 50 = 40
    //     assertEq(cv.getProposalStakedAmount(1), 40); // 80% of 50 = 40

    //     /**
    //      * ASSERTS
    //      *
    //      */
    //     vm.startPrank(pool_admin());
    //     CVStrategy.ProposalSupport[] memory votes2 = new CVStrategy.ProposalSupport[](1);
    //     votes2[0] = CVStrategy.ProposalSupport(1, 100);
    //     data = abi.encode(votes2);
    //     // vm.expectEmit(true, true, true, false);
    //     allo().allocate(poolId, data);
    //     vm.stopPrank();

    //     assertEq(cv.getProposalVoterStake(1, address(pool_admin())), 50); // 100% of 50 = 50
    //     assertEq(cv.getProposalStakedAmount(1), 40 + 50);

    //     /**
    //      * ASSERTS
    //      *
    //      */

    //     vm.warp(10 days);

    //     (
    //         address submitter,
    //         address beneficiary,
    //         address requestedToken,
    //         uint256 requestedAmount,
    //         uint256 stakedTokens,
    //         CVStrategy.ProposalType proposalType,
    //         CVStrategy.ProposalStatus proposalStatus,
    //         uint256 blockLast,
    //         uint256 convictionLast,
    //         uint256 agreementActionId,
    //         uint256 threshold
    //     ) = cv.getProposal(1);

    //     // console.log("Proposal Status: %s", proposalStatus);
    //     // console.log("Proposal Type: %s", proposalType);
    //     // console.log("Requested Token: %s", requestedToken);
    //     // console.log("Requested Amount: %s", requestedAmount);
    //     console.log("Staked Tokens: %s", stakedTokens);
    //     console.log("Threshold: %s", threshold);
    //     // console.log("Agreement Action Id: %s", agreementActionId);
    //     console.log("Block Last: %s", blockLast);
    //     console.log("Conviction Last: %s", convictionLast);
    //     // console.log("Beneficiary: %s", beneficiary);
    //     // console.log("Submitter: %s", submitter);
    // }

    function _etherToFloat(uint256 _amount) internal pure returns (uint256) {
        return _amount / 10 ** 11;
    }

    function _mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a <= TWO_128, "_a should be less than or equal to 2^128");
        require(_b < TWO_128, "_b should be less than 2^128");
        return ((_a * _b) + TWO_127) >> 128;
    }

    function _pow(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a < TWO_128, "_a should be less than 2^128");
        uint256 a = _a;
        uint256 b = _b;
        _result = TWO_128;
        while (b > 0) {
            if (b & 1 == 0) {
                a = _mul(a, a);
                b >>= 1;
            } else {
                _result = _mul(_result, a);
                b -= 1;
            }
        }
    }
    function _calculateConviction(uint256 _timePassed, uint256 _lastConv, uint256 _oldAmount, uint256 decay)
        public
        pure
        returns (uint256)
    {
        uint256 t = _timePassed;
        uint256 atTWO_128 = _pow((decay << 128) / D,t);
        return (((atTWO_128 * _lastConv) + (_oldAmount * D * (TWO_128 - atTWO_128) / (D - decay))) + TWO_127) >> 128;
    }
    function test_proposalSupported_2_times() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal();

        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, 80); // 0 + 70 = 70% = 35
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
        CVStrategy.ProposalSupport[] memory votes2 = new CVStrategy.ProposalSupport[](1);
        votes2[0] = CVStrategy.ProposalSupport(1, 100);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        assertEq(cv.getProposalVoterStake(1, address(pool_admin())), 50); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(1), 40 + 50);
    }

    function test_proposalSupported_conviction_check() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal();

        /**
         * ASSERTS
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](1);
        votes[0] = CVStrategy.ProposalSupport(1, 80); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 AMOUNT_STAKED = 40;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), AMOUNT_STAKED); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(1), AMOUNT_STAKED); // 80% of 50 = 40

        uint256 cv_amount = cv.calculateConviction(10, 0, AMOUNT_STAKED);
        console.log("cv_amount: %s", cv_amount);
        uint256 cv_cmp = _calculateConviction(10, 0, AMOUNT_STAKED, 0.9 ether / 10 ** 11);
        console.log("cv_cmp: %s", cv_cmp);
        assertEq(cv_amount, cv_cmp);
     
    }

    function testRevert_allocate_removeSupport_wo_support_before_SUPPORT_UNDERFLOW() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal();

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

    function test_allocate_proposalSupport_empty_array() public {
        (IAllo.Pool memory pool, uint256 poolId) = _createProposal();

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
}
