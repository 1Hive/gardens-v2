// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import "forge-std/StdJson.sol";
import {RegistryFactory} from "../../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../../src/RegistryCommunity/RegistryCommunity.sol";
import {CVStrategy} from "../../src/CVStrategy/CVStrategy.sol";
import {CommunityPoolFacet} from "../../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CVStrategyRouter, RegistryCommunityRouter} from "../../src/routing/SharedImplementationRouter.sol";
import {IDiamondCut} from "../../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../../src/diamonds/interfaces/IDiamond.sol";

contract ForkStrategyV2 is CVStrategy {
    function upgradeProbe() external pure returns (uint256) {
        return 2;
    }
}

contract ForkCommunityV2 is RegistryCommunity {
    function upgradeProbe() external pure returns (uint256) {
        return 2;
    }
}

contract ForkFacetV2 {
    function facetProbe() external pure returns (uint256) {
        return 2;
    }
}

/// @notice Migrates the configured Base fleet in the staged production order, then releases new code.
contract SharedRoutingMigrationForkTest is Test {
    using stdJson for string;

    bytes32 internal constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    address internal constant FACTORY = 0xc93830dd463516ED5f28f6cd4F837173B87FF389;
    address internal constant EXPECTED_OWNER = 0x00BcC26E792E393217bA895f5e85AE628FC994E9;

    RegistryFactory internal factory;
    CVStrategyRouter internal strategyRouter;
    RegistryCommunityRouter internal communityRouter;
    address[] internal communities;
    address[] internal strategies;
    address[] internal communityOwners;
    address[] internal strategyOwners;
    string internal firstCommunityName;
    address internal firstStrategyCommunity;

    function test_migrateEntireConfiguredFleetThenUpgradeAgain() public {
        vm.createSelectFork(vm.envString("FORK_RPC_URL"));
        assertEq(block.chainid, 8453);
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/pkg/contracts/config/networks.json"));
        communities = json.readAddressArray(".networks[7].PROXIES.REGISTRY_COMMUNITIES");
        strategies = json.readAddressArray(".networks[7].PROXIES.CV_STRATEGIES");
        assertEq(json.readAddress(".networks[7].PROXIES.REGISTRY_FACTORY"), FACTORY);
        factory = RegistryFactory(payable(FACTORY));
        assertEq(factory.owner(), EXPECTED_OWNER);
        assertGt(communities.length, 0);
        assertGt(strategies.length, 0);
        assertEq(factory.nonce(), communities.length);
        _snapshotState();
        _migrate();
        _assertMigration();
        _upgradeAgain();
    }

    function _snapshotState() internal {
        for (uint256 i; i < communities.length; i++) {
            address owner = RegistryCommunity(payable(communities[i])).owner();
            communityOwners.push(owner);
            assertEq(owner, EXPECTED_OWNER);
            assertEq(RegistryCommunity(payable(communities[i])).registryFactory(), FACTORY);
        }
        for (uint256 i; i < strategies.length; i++) {
            address owner = CVStrategy(payable(strategies[i])).owner();
            strategyOwners.push(owner);
            assertEq(owner, EXPECTED_OWNER);
        }
        firstCommunityName = RegistryCommunity(payable(communities[0])).communityName();
        firstStrategyCommunity = address(CVStrategy(payable(strategies[0])).registryCommunity());
    }

    function _migrate() internal {
        vm.startPrank(EXPECTED_OWNER);
        factory.upgradeTo(address(new RegistryFactory()));
        strategyRouter = new CVStrategyRouter(FACTORY);
        communityRouter = new RegistryCommunityRouter(FACTORY);
        _activateRelease();
        factory.setRegistryCommunityTemplate(address(communityRouter));
        assertEq(factory.registryCommunityTemplate(), address(communityRouter));
        for (uint256 i; i < communities.length; i++) {
            RegistryCommunity(payable(communities[i])).upgradeTo(address(communityRouter));
        }
        factory.setStrategyTemplate(address(strategyRouter));
        assertEq(factory.strategyTemplate(), address(strategyRouter));
        for (uint256 i; i < strategies.length; i++) {
            CVStrategy(payable(strategies[i])).upgradeTo(address(strategyRouter));
        }
        vm.stopPrank();
    }

    function _activateRelease() internal {
        (IDiamondCut.FacetCut[] memory strategyCuts,,) = factory.getStrategyFacets();
        (IDiamondCut.FacetCut[] memory communityCuts,,) = factory.getCommunityFacets();
        address poolFacet = address(new CommunityPoolFacet());
        uint256 replaced = 0;
        for (uint256 i; i < communityCuts.length; i++) {
            for (uint256 j; j < communityCuts[i].functionSelectors.length; j++) {
                if (communityCuts[i].functionSelectors[j] == 0xce7e2cd3) {
                    communityCuts[i].facetAddress = poolFacet;
                    replaced++;
                    break;
                }
            }
        }
        assertEq(replaced, 1);
        factory.setCommunityRelease(communityCuts, address(new RegistryCommunity()));
        factory.setStrategyRelease(strategyCuts, address(new CVStrategy()));
    }

    function _assertMigration() internal {
        for (uint256 i; i < communities.length; i++) {
            assertEq(address(uint160(uint256(vm.load(communities[i], IMPLEMENTATION_SLOT)))), address(communityRouter));
            assertEq(RegistryCommunity(payable(communities[i])).owner(), communityOwners[i]);
        }
        for (uint256 i; i < strategies.length; i++) {
            assertEq(address(uint160(uint256(vm.load(strategies[i], IMPLEMENTATION_SLOT)))), address(strategyRouter));
            assertEq(CVStrategy(payable(strategies[i])).owner(), strategyOwners[i]);
        }
        assertEq(RegistryCommunity(payable(communities[0])).communityName(), firstCommunityName);
        assertEq(address(CVStrategy(payable(strategies[0])).registryCommunity()), firstStrategyCommunity);
    }

    function _upgradeAgain() internal {
        (IDiamondCut.FacetCut[] memory strategyCuts,,) = factory.getStrategyFacets();
        (IDiamondCut.FacetCut[] memory communityCuts,,) = factory.getCommunityFacets();
        ForkFacetV2 facet = new ForkFacetV2();
        strategyCuts = _withProbeFacet(strategyCuts, address(facet));
        communityCuts = _withProbeFacet(communityCuts, address(facet));
        vm.startPrank(EXPECTED_OWNER);
        factory.setStrategyRelease(strategyCuts, address(new ForkStrategyV2()));
        factory.setCommunityRelease(communityCuts, address(new ForkCommunityV2()));
        vm.stopPrank();
        for (uint256 i; i < communities.length; i++) {
            assertEq(ForkCommunityV2(payable(communities[i])).upgradeProbe(), 2);
            assertEq(ForkFacetV2(communities[i]).facetProbe(), 2);
        }
        for (uint256 i; i < strategies.length; i++) {
            assertEq(ForkStrategyV2(payable(strategies[i])).upgradeProbe(), 2);
            assertEq(ForkFacetV2(strategies[i]).facetProbe(), 2);
        }
    }

    function _withProbeFacet(IDiamondCut.FacetCut[] memory cuts, address facet)
        internal
        pure
        returns (IDiamondCut.FacetCut[] memory result)
    {
        result = new IDiamondCut.FacetCut[](cuts.length + 1);
        for (uint256 i; i < cuts.length; i++) {
            result[i] = cuts[i];
        }
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = ForkFacetV2.facetProbe.selector;
        result[cuts.length] = IDiamond.FacetCut({
            facetAddress: facet, action: IDiamond.FacetCutAction.Auto, functionSelectors: selectors
        });
    }
}
