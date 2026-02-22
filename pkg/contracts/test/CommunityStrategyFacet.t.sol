// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
import {FAllo} from "../src/interfaces/FAllo.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockAllo is FAllo {
    mapping(uint256 => address) public poolStrategies;

    function setPoolStrategy(uint256 poolId, address strategy) external {
        poolStrategies[poolId] = strategy;
    }

    function createPoolWithCustomStrategy(
        bytes32,
        address,
        bytes memory,
        address,
        uint256,
        Metadata memory,
        address[] memory
    ) external payable returns (uint256) {
        return 0;
    }

    function getRegistry() external view returns (address) {
        return address(0);
    }

    function getPool(uint256 poolId) external view returns (IAllo.Pool memory pool) {
        pool.strategy = IStrategy(poolStrategies[poolId]);
    }
}

contract MockSybilScorer is ISybilScorer {
    address public lastStrategy;

    function canExecuteAction(address, address) external pure returns (bool) {
        return true;
    }

    function modifyThreshold(address, uint256) external {}

    function addStrategy(address, uint256, address) external {}

    function activateStrategy(address strategy) external {
        lastStrategy = strategy;
    }
}

contract MockCVStrategy {
    ISybilScorer public sybilScorer;

    constructor(ISybilScorer scorer) {
        sybilScorer = scorer;
    }
}

contract CommunityStrategyFacetHarness is CommunityStrategyFacet {
    function initOwner(address owner_) external {
        super.initialize(owner_);
    }

    function grantCouncil(address council) external {
        _grantRole(COUNCIL_MEMBER, council);
    }

    function setAllo(address allo_) external {
        allo = FAllo(allo_);
    }
}

contract CommunityStrategyFacetTest is Test {
    CommunityStrategyFacetHarness internal facet;
    MockAllo internal allo;
    MockSybilScorer internal sybil;
    address internal council = makeAddr("council");

    function setUp() public {
        CommunityStrategyFacetHarness impl = new CommunityStrategyFacetHarness();
        facet = CommunityStrategyFacetHarness(
            payable(
                address(new ERC1967Proxy(address(impl), abi.encodeWithSelector(impl.initOwner.selector, makeAddr("owner"))))
            )
        );
        allo = new MockAllo();
        sybil = new MockSybilScorer();

        facet.grantCouncil(council);
        facet.setAllo(address(allo));
    }

    function test_addStrategy_requires_council_and_unique() public {
        address strategy = address(new MockCVStrategy(sybil));

        vm.expectRevert(abi.encodeWithSelector(CommunityStrategyFacet.UserNotInCouncil.selector, address(this)));
        facet.addStrategy(strategy);

        vm.prank(council);
        facet.addStrategy(strategy);
        assertTrue(facet.enabledStrategies(strategy));
        assertEq(sybil.lastStrategy(), strategy);

        vm.prank(council);
        vm.expectRevert(CommunityStrategyFacet.StrategyExists.selector);
        facet.addStrategy(strategy);
    }

    function test_addStrategy_reverts_zero_address() public {
        vm.prank(council);
        vm.expectRevert(CommunityStrategyFacet.ValueCannotBeZero.selector);
        facet.addStrategy(address(0));
    }

    function test_addStrategyByPoolId_and_remove() public {
        address strategy = address(new MockCVStrategy(ISybilScorer(address(0))));
        allo.setPoolStrategy(1, strategy);

        vm.prank(council);
        facet.addStrategyByPoolId(1);
        assertTrue(facet.enabledStrategies(strategy));

        vm.prank(council);
        facet.removeStrategyByPoolId(1);
        assertFalse(facet.enabledStrategies(strategy));
    }

    function test_addStrategyByPoolId_requires_council() public {
        vm.expectRevert(abi.encodeWithSelector(CommunityStrategyFacet.UserNotInCouncil.selector, address(this)));
        facet.addStrategyByPoolId(1);
    }

    function test_removeStrategy_reverts_when_not_enabled() public {
        vm.prank(council);
        vm.expectRevert(CommunityStrategyFacet.StrategyNotEnabled.selector);
        facet.removeStrategy(address(0xBEEF));
    }

    function test_removeStrategy_reverts_zero_address() public {
        vm.prank(council);
        vm.expectRevert(CommunityStrategyFacet.ValueCannotBeZero.selector);
        facet.removeStrategy(address(0));
    }

    function test_removeStrategyByPoolId_reverts_zero_strategy() public {
        vm.prank(council);
        vm.expectRevert(CommunityStrategyFacet.ValueCannotBeZero.selector);
        facet.removeStrategyByPoolId(999);
    }

    function test_removeStrategyByPoolId_requires_council() public {
        vm.expectRevert(abi.encodeWithSelector(CommunityStrategyFacet.UserNotInCouncil.selector, address(this)));
        facet.removeStrategyByPoolId(1);
    }

    function test_rejectPool_requires_council() public {
        vm.expectRevert(abi.encodeWithSelector(CommunityStrategyFacet.UserNotInCouncil.selector, address(this)));
        facet.rejectPool(address(0xBEEF));
    }

    function test_rejectPool_branches() public {
        address strategy = address(new MockCVStrategy(ISybilScorer(address(0))));

        vm.prank(council);
        facet.rejectPool(strategy);
        assertFalse(facet.enabledStrategies(strategy));

        vm.prank(council);
        facet.addStrategy(strategy);
        assertTrue(facet.enabledStrategies(strategy));

        vm.prank(council);
        facet.rejectPool(strategy);
        assertFalse(facet.enabledStrategies(strategy));
    }
}
