// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVStrategy} from "../../src/CVStrategy/CVStrategy.sol";
import {CVStreamingFacet} from "../../src/CVStrategy/facets/CVStreamingFacet.sol";
import {IDiamond} from "../../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../../src/diamonds/interfaces/IDiamondCut.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import {
    IGeneralDistributionAgreementV1
} from
    "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/IGeneralDistributionAgreementV1.sol";
import {
    ISuperfluidPool
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";

contract OptimismStreamingRebalanceForkTest is Test {
    address internal constant STRATEGY = 0x2B1915a2e0293B3a434df58b921d8f7e320da077;
    address internal constant GDA_AGREEMENT = 0x68Ae17fa7a31b86F306c383277552fd4813b0d35;
    uint256 internal constant INVESTIGATED_BLOCK = 150_386_758;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL_OPT"), INVESTIGATED_BLOCK);
    }

    function test_upgrade_streaming_facet_then_rebalance_starts_stream() public {
        CVStrategy strategy = CVStrategy(payable(STRATEGY));
        ISuperToken token = strategy.superfluidToken();
        ISuperfluidPool pool = strategy.superfluidGDA();
        IGeneralDistributionAgreementV1 gda = IGeneralDistributionAgreementV1(GDA_AGREEMENT);

        int96 flowBefore = gda.getFlowRate(token, STRATEGY, pool);
        uint128 totalUnitsBefore = pool.getTotalUnits();

        _upgradeStreamingFacet(strategy);

        vm.warp(block.timestamp + 1 days);
        vm.prank(_resolvedOwner(strategy));
        strategy.rebalance();

        int96 flowAfter = gda.getFlowRate(token, STRATEGY, pool);
        uint128 totalUnitsAfter = pool.getTotalUnits();

        emit log_named_int("flowBefore", flowBefore);
        emit log_named_uint("totalUnitsBefore", totalUnitsBefore);
        emit log_named_int("flowAfter", flowAfter);
        emit log_named_uint("totalUnitsAfter", totalUnitsAfter);

        assertEq(flowBefore, 0, "pre-upgrade fork state should match failed rebalance");
        assertGt(totalUnitsBefore, 0, "pre-upgrade fork state should have proposal units");
        assertGt(flowAfter, 0, "rebalance should start a nonzero GDA flow");
        assertGt(totalUnitsAfter, 0, "rebalance should keep eligible proposal units");
        assertLe(totalUnitsAfter, uint128(uint96(flowAfter)), "units should be bounded by active flow");
    }

    function _upgradeStreamingFacet(CVStrategy strategy) internal {
        CVStreamingFacet streamingFacet = new CVStreamingFacet();
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = CVStreamingFacet.rebalance.selector;
        selectors[1] = CVStreamingFacet.stopEscrowStream.selector;
        selectors[2] = CVStreamingFacet.setAuthorizedRebalanceCaller.selector;
        selectors[3] = CVStreamingFacet.isAuthorizedRebalanceCaller.selector;
        selectors[4] = CVStreamingFacet.wrapIfNeeded.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(streamingFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: selectors
        });

        vm.prank(strategy.owner());
        IDiamondCut(address(strategy)).diamondCut(cuts, address(0), "");
    }

    function _resolvedOwner(CVStrategy strategy) internal view returns (address owner) {
        owner = strategy.owner();
        if (owner.code.length == 0) {
            return owner;
        }

        (bool ok, bytes memory data) = owner.staticcall(abi.encodeWithSignature("owner()"));
        if (ok && data.length >= 32) {
            owner = abi.decode(data, (address));
        }
    }
}
