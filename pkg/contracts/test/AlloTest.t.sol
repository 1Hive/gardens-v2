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

import {CVMockStrategy} from "./CVMockStrategy.sol";
import {CVStrategy} from "../src/CVStrategy.sol";
import {RegistryGardens} from "../src/RegistryGardens.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";

// @dev Run forge test --mc TestAllo -vvvvv

contract TestAllo is Test, AlloSetup, RegistrySetupFull, Native, Errors, GasHelpers {
    CVStrategy public strategy;
    MockERC20 public token;
    uint256 public mintAmount = 1_000_000 * 10 ** 18;
    uint256 public constant MINIMUM_STAKE = 1000;

    Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"});

    RegistryGardens internal registryGardens;

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

    function _registryGardens() internal returns (RegistryGardens) {
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

    function test_createProposal() public {
        startMeasuringGas("createPool");
        allo().addToCloneableStrategies(address(strategy));

        vm.expectEmit(true, true, false, false);
        emit PoolCreated(1, poolProfile_id(), IStrategy(strategy), NATIVE, 0, metadata);

        vm.startPrank(pool_admin());

        CVStrategy.InitializeParams memory params;
        params.decay = 0.9 ether / 10 ** 11; // alpha
        params.maxRatio = 0.2 ether / 10 ** 11; // beta
        params.weight = 0.002 ether / 10 ** 11; // RHO?
        params.minThresholdStakePercentage = 0.2 ether; // 20%
        params.registryGardens = address(_registryGardens());

        uint256 poolId = allo().createPool(
            poolProfile_id(), address(strategy), abi.encode(params), NATIVE, 0, metadata, pool_managers()
        );

        vm.stopPrank();

        IAllo.Pool memory pool = allo().getPool(poolId);

        vm.deal(address(this), 1 ether);
        allo().fundPool{value: 1 ether}(poolId, 1 ether);

        stopMeasuringGas();

        assertEq(pool.profileId, poolProfile_id());
        assertNotEq(address(pool.strategy), address(strategy));

        startMeasuringGas("createProposal");
        CVStrategy.CreateProposal memory proposal = CVStrategy.CreateProposal(
            1, poolId, pool_admin(), pool_admin(), CVStrategy.ProposalType.Signaling, 0.1 ether, NATIVE
        );
        bytes memory data = abi.encode(proposal);
        allo().registerRecipient(poolId, data);

        stopMeasuringGas();
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        /**
         * ASSERTS
         *
         */
        startMeasuringGas("Support a Proposal");
        CVStrategy.ProposalSupport[] memory votes = new CVStrategy.ProposalSupport[](3);
        votes[0] = CVStrategy.ProposalSupport(1, 70); // 0 + 70 = 70%
        votes[1] = CVStrategy.ProposalSupport(1, 20); // 70 + 20 = 90%
        votes[2] = CVStrategy.ProposalSupport(1, -10); // 90 - 10 = 80%
        data = abi.encode(votes);

        allo().allocate(poolId, data);
        stopMeasuringGas();

        assertEq(cv.getProposalVoterStake(1, address(this)), 40); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        votes[0] = CVStrategy.ProposalSupport(1, 70); // 80 + 70 = 150%
        votes[1] = CVStrategy.ProposalSupport(1, 20); // 150 + 20 = 170%
        votes[2] = CVStrategy.ProposalSupport(1, -100); // 170 - 100 = 70%
        data = abi.encode(votes);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);

        assertEq(cv.getProposalVoterStake(1, address(this)), 35); // 70% of 50 = 35

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
        // console.log("Requested Amount: %s", requestedAmount);
        console.log("Threshold: %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        console.log("Block Last: %s", blockLast);
        console.log("Conviction Last: %s", convictionLast);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);
    }
}
