// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {GV2ERC20} from "../script/GV2ERC20.sol";
import {CVStrategyBaseFacet} from "../src/CVStrategy/CVStrategyBaseFacet.sol";

import {
    CVStrategyBaseFacetHarness,
    MockAlloWithPool,
    MockRegistryCommunity,
    MockSybilScorer
} from "./helpers/CVStrategyHelpers.sol";

contract CVStrategyBaseFacetTest is Test {
    CVStrategyBaseFacetHarness internal facet;
    MockAlloWithPool internal allo;
    MockRegistryCommunity internal registryCommunity;
    MockSybilScorer internal sybil;
    GV2ERC20 internal baseToken;
    GV2ERC20 internal superToken;

    address internal councilSafe = makeAddr("councilSafe");
    address internal owner = makeAddr("owner");
    address internal member = makeAddr("member");
    address internal other = makeAddr("other");

    function setUp() public {
        facet = new CVStrategyBaseFacetHarness();
        allo = new MockAlloWithPool();
        registryCommunity = new MockRegistryCommunity();
        sybil = new MockSybilScorer();
        baseToken = new GV2ERC20("Base", "B", 6);
        superToken = new GV2ERC20("Super", "S", 18);

        facet.setAllo(address(allo));
        facet.setPoolId(1);
        facet.setRegistryCommunity(address(registryCommunity));
        registryCommunity.setCouncilSafe(councilSafe);
        facet.setContractOwner(owner);

        allo.setPoolToken(1, address(baseToken));
    }

    function test_onlyAllo_onlyInitialized_onlyRegistryCommunity() public {
        vm.expectRevert(abi.encodeWithSelector(CVStrategyBaseFacet.OnlyAllo.selector, address(this), address(allo)));
        facet.exposedOnlyAllo();

        vm.prank(address(allo));
        facet.exposedOnlyAllo();

        facet.setPoolId(0);
        vm.expectRevert(abi.encodeWithSelector(CVStrategyBaseFacet.OnlyInitialized.selector, 0));
        facet.exposedOnlyInitialized();

        facet.setPoolId(1);
        facet.exposedOnlyInitialized();

        vm.expectRevert(
            abi.encodeWithSelector(
                CVStrategyBaseFacet.OnlyRegistryCommunity.selector, address(this), address(registryCommunity)
            )
        );
        facet.exposedOnlyRegistryCommunity();

        vm.prank(address(registryCommunity));
        facet.exposedOnlyRegistryCommunity();
    }

    function test_checkSenderIsMember_and_onlyCouncilSafe() public {
        registryCommunity.setMember(member, true);
        facet.exposedCheckSenderIsMember(member);

        registryCommunity.setMember(member, false);
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.OnlyMember.selector, member, address(registryCommunity))
        );
        facet.exposedCheckSenderIsMember(member);

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.OnlyCouncilSafe.selector, address(this), councilSafe, owner)
        );
        facet.exposedOnlyCouncilSafe();

        vm.prank(councilSafe);
        facet.exposedOnlyCouncilSafe();

        vm.prank(owner);
        facet.exposedOnlyCouncilSafe();
    }

    function test_onlyCouncilSafeOrMember_allowlistPaths() public {
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.OnlyCouncilSafeOrMember.selector, address(this), councilSafe)
        );
        facet.exposedOnlyCouncilSafeOrMember();

        registryCommunity.setRole(role, address(0), true);
        facet.exposedOnlyCouncilSafeOrMember();

        registryCommunity.setRole(role, address(0), false);
        registryCommunity.setRole(role, other, true);
        vm.prank(other);
        facet.exposedOnlyCouncilSafeOrMember();
    }

    function test_canExecuteAction_sybilScorer() public {
        facet.setSybilScorer(address(sybil));
        sybil.setCanExecute(other, false);
        assertFalse(facet.exposedCanExecuteAction(other));

        sybil.setCanExecute(other, true);
        assertTrue(facet.exposedCanExecuteAction(other));
    }

    function test_proposalExists_and_conviction() public {
        assertFalse(facet.exposedProposalExists(1));

        facet.setProposal(1, member, block.number, 0);
        assertTrue(facet.exposedProposalExists(1));

        facet.exposedCalculateAndSetConviction(1, 100);
        (uint256 conviction, uint256 blockNumber) = facet.exposedCheckBlockAndCalculateConviction(1, 100);
        assertEq(conviction, 0);
        assertEq(blockNumber, 0);

        vm.roll(block.number + 1);
        (conviction, blockNumber) = facet.exposedCheckBlockAndCalculateConviction(1, 100);
        assertGt(blockNumber, 0);
    }

    function test_getPoolAmount_scaling() public {
        baseToken.mint(address(facet), 1000);
        superToken.mint(address(facet), 2 ether);
        facet.setSuperfluidToken(address(superToken));

        uint256 amount = facet.exposedGetPoolAmount();
        assertGt(amount, 0);

        allo.setPoolToken(1, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
        vm.deal(address(facet), 5 ether);
        amount = facet.exposedGetPoolAmount();
        assertEq(amount, 5 ether);
    }
}
