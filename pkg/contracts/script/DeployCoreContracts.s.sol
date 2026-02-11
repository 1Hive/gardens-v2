// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/Script.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {GoodDollarSybil} from "../src/GoodDollarSybil.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract DeployCoreContracts is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = address(
            new ERC1967Proxy(
                address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, address(SENDER))
            )
        );
        console2.log("ProxyOwner (upgrade admin): %s", proxyOwner);
        _writeNetworkAddress(".ENVS.PROXY_OWNER", proxyOwner);

        address communityImpl = address(new RegistryCommunity());
        address strategyImpl = address(new CVStrategy());
        address collateralVaultImpl = address(new CollateralVault());

        address registryFactoryProxy = address(
            new ERC1967Proxy(
                address(new RegistryFactory()),
                abi.encodeWithSelector(
                    RegistryFactory.initialize.selector,
                    proxyOwner,
                    address(SENDER),
                    communityImpl,
                    strategyImpl,
                    collateralVaultImpl
                )
            )
        );
        console2.log("RegistryFactory: %s", registryFactoryProxy);
        _writeNetworkAddress(".PROXIES.REGISTRY_FACTORY", registryFactoryProxy);
        _writeNetworkAddress(".IMPLEMENTATIONS.REGISTRY_COMMUNITY", communityImpl);
        _writeNetworkAddress(".IMPLEMENTATIONS.CV_STRATEGY", strategyImpl);
        _writeNetworkAddress(".IMPLEMENTATIONS.COLLATERAL_VAULT", collateralVaultImpl);

        (IDiamond.FacetCut[] memory communityCuts, address communityInit) = _deployCommunityFacets();
        (IDiamond.FacetCut[] memory strategyCuts, address strategyInit) = _deployStrategyFacets();
        try RegistryFactory(payable(registryFactoryProxy)).initializeV2(
            communityCuts,
            communityInit,
            abi.encodeCall(RegistryCommunityDiamondInit.init, ()),
            strategyCuts,
            strategyInit,
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        ) {
            console2.log("RegistryFactory facet cuts initialized");
        } catch {
            console2.log("RegistryFactory facet cuts already set (skipping)");
        }

        address listManager = address(SENDER);

        address passportScorer = address(
            new ERC1967Proxy(
                address(new PassportScorer()),
                abi.encodeWithSelector(PassportScorer.initialize.selector, listManager, proxyOwner)
            )
        );
        console2.log("PassportScorer: %s", passportScorer);
        _writeNetworkAddress(".ENVS.PASSPORT_SCORER", passportScorer);

        address goodDollarSybil = address(
            new ERC1967Proxy(
                address(new GoodDollarSybil()),
                abi.encodeWithSelector(GoodDollarSybil.initialize.selector, listManager, proxyOwner)
            )
        );
        console2.log("GoodDollarSybil: %s", goodDollarSybil);
        _writeNetworkAddress(".ENVS.GOOD_DOLLAR_SYBIL", goodDollarSybil);

        address safeArbitrator = address(
            new ERC1967Proxy(
                address(new SafeArbitrator()),
                abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.001 ether, proxyOwner)
            )
        );
        console2.log("SafeArbitrator: %s", safeArbitrator);
        _writeNetworkAddress(".ENVS.ARBITRATOR", safeArbitrator);

        networkJson;
    }

    function _writeNetworkAddress(string memory key, address value) internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory tmpPath = string.concat(root, "/pkg/contracts/config/.networks.tmp.json");
        string memory command = string.concat(
            "jq '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            ") = \"",
            _addressToString(value),
            "\"' ",
            path,
            " > ",
            tmpPath,
            " && mv ",
            tmpPath,
            " ",
            path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        vm.ffi(inputs);
        console2.log("  Cached deployment in networks.json:", key);
    }

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    function _deployCommunityFacets() internal returns (IDiamond.FacetCut[] memory cuts, address init) {
        CommunityAdminFacet adminFacet = new CommunityAdminFacet();
        CommunityMemberFacet memberFacet = new CommunityMemberFacet();
        CommunityPauseFacet pauseFacet = new CommunityPauseFacet();
        CommunityPoolFacet poolFacet = new CommunityPoolFacet();
        CommunityPowerFacet powerFacet = new CommunityPowerFacet();
        CommunityStrategyFacet strategyFacet = new CommunityStrategyFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        RegistryCommunityDiamondInit diamondInit = new RegistryCommunityDiamondInit();

        cuts = _buildCommunityFacetCuts(
            adminFacet, memberFacet, pauseFacet, poolFacet, powerFacet, strategyFacet, loupeFacet
        );
        init = address(diamondInit);
    }

    function _deployStrategyFacets() internal returns (IDiamond.FacetCut[] memory cuts, address init) {
        CVAdminFacet adminFacet = new CVAdminFacet();
        CVAllocationFacet allocationFacet = new CVAllocationFacet();
        CVDisputeFacet disputeFacet = new CVDisputeFacet();
        CVPauseFacet pauseFacet = new CVPauseFacet();
        CVPowerFacet powerFacet = new CVPowerFacet();
        CVProposalFacet proposalFacet = new CVProposalFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        CVStrategyDiamondInit diamondInit = new CVStrategyDiamondInit();

        cuts = _buildStrategyFacetCuts(
            adminFacet, allocationFacet, disputeFacet, pauseFacet, powerFacet, proposalFacet, loupeFacet
        );
        init = address(diamondInit);
    }

    function _buildCommunityFacetCuts(
        CommunityAdminFacet adminFacet,
        CommunityMemberFacet memberFacet,
        CommunityPauseFacet pauseFacet,
        CommunityPoolFacet poolFacet,
        CommunityPowerFacet powerFacet,
        CommunityStrategyFacet strategyFacet,
        DiamondLoupeFacet loupeFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = new IDiamond.FacetCut[](6);

        bytes4[] memory adminSelectors = new bytes4[](9);
        adminSelectors[0] = CommunityAdminFacet.setStrategyTemplate.selector;
        adminSelectors[1] = CommunityAdminFacet.setCollateralVaultTemplate.selector;
        adminSelectors[2] = CommunityAdminFacet.setArchived.selector;
        adminSelectors[3] = CommunityAdminFacet.setBasisStakedAmount.selector;
        adminSelectors[4] = CommunityAdminFacet.setCommunityFee.selector;
        adminSelectors[5] = CommunityAdminFacet.setCouncilSafe.selector;
        adminSelectors[6] = CommunityAdminFacet.acceptCouncilSafe.selector;
        adminSelectors[7] = CommunityAdminFacet.setCommunityParams.selector;
        adminSelectors[8] = CommunityAdminFacet.isCouncilMember.selector;
        baseCuts[0] = IDiamond.FacetCut({
            facetAddress: address(adminFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: adminSelectors
        });

        bytes4[] memory memberSelectors = new bytes4[](6);
        memberSelectors[0] = CommunityMemberFacet.stakeAndRegisterMember.selector;
        memberSelectors[1] = CommunityMemberFacet.unregisterMember.selector;
        memberSelectors[2] = CommunityMemberFacet.kickMember.selector;
        memberSelectors[3] = CommunityMemberFacet.isMember.selector;
        memberSelectors[4] = CommunityMemberFacet.getBasisStakedAmount.selector;
        memberSelectors[5] = CommunityMemberFacet.getStakeAmountWithFees.selector;
        baseCuts[1] = IDiamond.FacetCut({
            facetAddress: address(memberFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: memberSelectors
        });

        bytes4[] memory pauseSelectors = new bytes4[](12);
        pauseSelectors[0] = bytes4(keccak256("setPauseController(address)"));
        pauseSelectors[1] = bytes4(keccak256("setPauseFacet(address)"));
        pauseSelectors[2] = bytes4(keccak256("pauseFacet()"));
        pauseSelectors[3] = bytes4(keccak256("pauseController()"));
        pauseSelectors[4] = bytes4(keccak256("pause(uint256)"));
        pauseSelectors[5] = bytes4(keccak256("pause(bytes4,uint256)"));
        pauseSelectors[6] = bytes4(keccak256("unpause()"));
        pauseSelectors[7] = bytes4(keccak256("unpause(bytes4)"));
        pauseSelectors[8] = bytes4(keccak256("isPaused()"));
        pauseSelectors[9] = bytes4(keccak256("isPaused(bytes4)"));
        pauseSelectors[10] = bytes4(keccak256("pausedUntil()"));
        pauseSelectors[11] = bytes4(keccak256("pausedSelectorUntil(bytes4)"));
        baseCuts[2] = IDiamond.FacetCut({
            facetAddress: address(pauseFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: pauseSelectors
        });

        bytes4[] memory poolSelectors = new bytes4[](2);
        poolSelectors[0] = bytes4(
            keccak256(
                "createPool(address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        poolSelectors[1] = bytes4(
            keccak256(
                "createPool(address,address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        baseCuts[3] = IDiamond.FacetCut({
            facetAddress: address(poolFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: poolSelectors
        });

        bytes4[] memory powerSelectors = new bytes4[](7);
        powerSelectors[0] = CommunityPowerFacet.activateMemberInStrategy.selector;
        powerSelectors[1] = CommunityPowerFacet.deactivateMemberInStrategy.selector;
        powerSelectors[2] = CommunityPowerFacet.increasePower.selector;
        powerSelectors[3] = CommunityPowerFacet.decreasePower.selector;
        powerSelectors[4] = CommunityPowerFacet.getMemberPowerInStrategy.selector;
        powerSelectors[5] = CommunityPowerFacet.getMemberStakedAmount.selector;
        powerSelectors[6] = CommunityPowerFacet.ercAddress.selector;
        baseCuts[4] = IDiamond.FacetCut({
            facetAddress: address(powerFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: powerSelectors
        });

        bytes4[] memory strategySelectors = new bytes4[](5);
        strategySelectors[0] = CommunityStrategyFacet.addStrategyByPoolId.selector;
        strategySelectors[1] = CommunityStrategyFacet.addStrategy.selector;
        strategySelectors[2] = CommunityStrategyFacet.removeStrategyByPoolId.selector;
        strategySelectors[3] = CommunityStrategyFacet.removeStrategy.selector;
        strategySelectors[4] = CommunityStrategyFacet.rejectPool.selector;
        baseCuts[5] = IDiamond.FacetCut({
            facetAddress: address(strategyFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: strategySelectors
        });

        cuts = new IDiamond.FacetCut[](7);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 6; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    function _buildStrategyFacetCuts(
        CVAdminFacet adminFacet,
        CVAllocationFacet allocationFacet,
        CVDisputeFacet disputeFacet,
        CVPauseFacet pauseFacet,
        CVPowerFacet powerFacet,
        CVProposalFacet proposalFacet,
        DiamondLoupeFacet loupeFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = new IDiamond.FacetCut[](6);

        bytes4[] memory adminSelectors = new bytes4[](3);
        adminSelectors[0] = CVAdminFacet.setPoolParams.selector;
        adminSelectors[1] = CVAdminFacet.connectSuperfluidGDA.selector;
        adminSelectors[2] = CVAdminFacet.disconnectSuperfluidGDA.selector;
        baseCuts[0] = IDiamond.FacetCut({
            facetAddress: address(adminFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: adminSelectors
        });

        bytes4[] memory allocationSelectors = new bytes4[](2);
        allocationSelectors[0] = CVAllocationFacet.allocate.selector;
        allocationSelectors[1] = CVAllocationFacet.distribute.selector;
        baseCuts[1] = IDiamond.FacetCut({
            facetAddress: address(allocationFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: allocationSelectors
        });

        bytes4[] memory disputeSelectors = new bytes4[](2);
        disputeSelectors[0] = CVDisputeFacet.disputeProposal.selector;
        disputeSelectors[1] = CVDisputeFacet.rule.selector;
        baseCuts[2] = IDiamond.FacetCut({
            facetAddress: address(disputeFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: disputeSelectors
        });

        bytes4[] memory pauseSelectors = new bytes4[](12);
        pauseSelectors[0] = bytes4(keccak256("setPauseController(address)"));
        pauseSelectors[1] = bytes4(keccak256("setPauseFacet(address)"));
        pauseSelectors[2] = bytes4(keccak256("pauseFacet()"));
        pauseSelectors[3] = bytes4(keccak256("pauseController()"));
        pauseSelectors[4] = bytes4(keccak256("pause(uint256)"));
        pauseSelectors[5] = bytes4(keccak256("pause(bytes4,uint256)"));
        pauseSelectors[6] = bytes4(keccak256("unpause()"));
        pauseSelectors[7] = bytes4(keccak256("unpause(bytes4)"));
        pauseSelectors[8] = bytes4(keccak256("isPaused()"));
        pauseSelectors[9] = bytes4(keccak256("isPaused(bytes4)"));
        pauseSelectors[10] = bytes4(keccak256("pausedUntil()"));
        pauseSelectors[11] = bytes4(keccak256("pausedSelectorUntil(bytes4)"));
        baseCuts[3] = IDiamond.FacetCut({
            facetAddress: address(pauseFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: pauseSelectors
        });

        bytes4[] memory powerSelectors = new bytes4[](5);
        powerSelectors[0] = CVPowerFacet.activatePoints.selector;
        powerSelectors[1] = CVPowerFacet.increasePower.selector;
        powerSelectors[2] = CVPowerFacet.decreasePower.selector;
        powerSelectors[3] = bytes4(keccak256("deactivatePoints()"));
        powerSelectors[4] = bytes4(keccak256("deactivatePoints(address)"));
        baseCuts[4] = IDiamond.FacetCut({
            facetAddress: address(powerFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: powerSelectors
        });

        bytes4[] memory proposalSelectors = new bytes4[](3);
        proposalSelectors[0] = CVProposalFacet.registerRecipient.selector;
        proposalSelectors[1] = CVProposalFacet.cancelProposal.selector;
        proposalSelectors[2] = CVProposalFacet.editProposal.selector;
        baseCuts[5] = IDiamond.FacetCut({
            facetAddress: address(proposalFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: proposalSelectors
        });

        cuts = new IDiamond.FacetCut[](7);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 6; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    function _buildLoupeFacetCut(DiamondLoupeFacet loupeFacet)
        internal
        pure
        returns (IDiamond.FacetCut memory)
    {
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        return IDiamond.FacetCut({
            facetAddress: address(loupeFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: loupeSelectors
        });
    }
}
