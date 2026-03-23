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
import {CVSyncPowerFacet} from "../src/CVStrategy/facets/CVSyncPowerFacet.sol";
import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {GoodDollarSybil} from "../src/GoodDollarSybil.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {GlobalPauseController} from "../src/pausing/GlobalPauseController.sol";
import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {StreamingEscrowFactory} from "../src/CVStrategy/StreamingEscrowFactory.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ISuperfluid} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

interface VmContext {
    enum ForgeContext {
        TestGroup,
        Test,
        Coverage,
        Snapshot,
        ScriptGroup,
        ScriptDryRun,
        ScriptBroadcast,
        ScriptResume,
        Unknown
    }

    function isContext(ForgeContext context) external view returns (bool result);
}

contract DeployCoreContracts is BaseMultiChain {
    using stdJson for string;

    enum DeployPhase {
        All,
        Phase1,
        Phase2,
        Phase3
    }

    struct CoreDeployments {
        address proxyOwnerImplementation;
        address registryFactoryImplementation;
        address registryCommunityImplementation;
        address cvStrategyImplementation;
        address collateralVaultImplementation;
        address proxyOwner;
        address registryFactory;
        address pauseControllerImplementation;
        address pauseController;
        address streamingEscrowImplementation;
        address streamingEscrowFactoryImplementation;
        address streamingEscrowFactory;
        address passportScorerImplementation;
        address passportScorer;
        address goodDollarSybilImplementation;
        address goodDollarSybil;
        address safeArbitratorImplementation;
        address safeArbitrator;
    }

    struct CommunityFacetDeployments {
        address loupe;
        address admin;
        address member;
        address pause;
        address pool;
        address power;
        address strategy;
        address init;
    }

    struct StrategyFacetDeployments {
        address loupe;
        address admin;
        address allocation;
        address dispute;
        address pause;
        address power;
        address proposal;
        address syncPower;
        address streaming;
        address init;
    }

    DeployPhase public deployPhase = DeployPhase.All;

    function run(string memory network, string memory phaseName) public {
        deployPhase = _parsePhase(phaseName);
        run(network);
    }

    function runCurrentNetwork(string memory networkJson) public override {
        address superfluidHost = networkJson.readAddress(getKeyNetwork(".ENVS.SUPERFLUID_HOST"));
        require(superfluidHost != address(0), "SUPERFLUID_HOST not set");

        if (_runPhase1()) {
            CoreDeployments memory deployed;
            (deployed.proxyOwner, deployed.proxyOwnerImplementation) = _deployProxyOwner();
            (
                deployed.registryFactory,
                deployed.registryFactoryImplementation,
                deployed.registryCommunityImplementation,
                deployed.cvStrategyImplementation,
                deployed.collateralVaultImplementation
            ) = _deployRegistryFactory();
            if (_shouldPrintDeploymentSummary()) _logPhase1Summary(deployed);
        }

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        if (_runPhase2() || _runPhase3()) {
            require(registryFactoryProxy != address(0), "REGISTRY_FACTORY not set");
        }

        RegistryFactory registryFactory = RegistryFactory(payable(registryFactoryProxy));

        if (_runPhase2()) {
            (IDiamond.FacetCut[] memory communityCuts, CommunityFacetDeployments memory communityFacets) = _deployCommunityFacets();
            (IDiamond.FacetCut[] memory strategyCuts, StrategyFacetDeployments memory strategyFacets) = _deployStrategyFacets();
            registryFactory.setCommunityFacets(
                communityCuts,
                communityFacets.init,
                abi.encodeCall(RegistryCommunityDiamondInit.init, ())
            );
            registryFactory.setStrategyFacets(
                strategyCuts,
                strategyFacets.init,
                abi.encodeCall(CVStrategyDiamondInit.init, ())
            );

            _snapshotCommunityFacetDeployments(communityFacets);
            _snapshotStrategyFacetDeployments(strategyFacets);
            if (_shouldPrintDeploymentSummary()) _logFacetAndInitSummary(communityFacets, strategyFacets);
        }

        if (_runPhase3()) {
            CoreDeployments memory deployed;
            (deployed.pauseController, deployed.pauseControllerImplementation) = _deployPauseController();
            registryFactory.setGlobalPauseController(deployed.pauseController);

            (
                deployed.streamingEscrowFactory,
                deployed.streamingEscrowFactoryImplementation,
                deployed.streamingEscrowImplementation
            ) = _deployStreamingEscrowFactory(superfluidHost);
            registryFactory.setStreamingEscrowFactory(deployed.streamingEscrowFactory);

            (deployed.passportScorer, deployed.passportScorerImplementation) = _deployPassportScorer();
            (deployed.goodDollarSybil, deployed.goodDollarSybilImplementation) = _deployGoodDollarSybil();
            (deployed.safeArbitrator, deployed.safeArbitratorImplementation) = _deploySafeArbitrator();

            registryFactory.registerContract(deployed.safeArbitrator);
            registryFactory.registerContract(deployed.passportScorer);
            registryFactory.registerContract(deployed.goodDollarSybil);
            if (_shouldPrintDeploymentSummary()) _logPhase3Summary(deployed);
        }

        networkJson;
    }

    function _runPhase1() internal view returns (bool) {
        return deployPhase == DeployPhase.All || deployPhase == DeployPhase.Phase1;
    }

    function _runPhase2() internal view returns (bool) {
        return deployPhase == DeployPhase.All || deployPhase == DeployPhase.Phase2;
    }

    function _runPhase3() internal view returns (bool) {
        return deployPhase == DeployPhase.All || deployPhase == DeployPhase.Phase3;
    }

    function _parsePhase(string memory phaseName) internal pure returns (DeployPhase) {
        bytes32 phaseHash = keccak256(bytes(phaseName));
        if (phaseHash == keccak256(bytes("")) || phaseHash == keccak256(bytes("all"))) return DeployPhase.All;
        if (phaseHash == keccak256(bytes("phase1"))) return DeployPhase.Phase1;
        if (phaseHash == keccak256(bytes("phase2"))) return DeployPhase.Phase2;
        if (phaseHash == keccak256(bytes("phase3"))) return DeployPhase.Phase3;
        revert("invalid phase");
    }

    function _shouldPrintDeploymentSummary() internal view returns (bool) {
        try VmContext(address(vm)).isContext(VmContext.ForgeContext.ScriptBroadcast) returns (bool isBroadcast) {
            if (isBroadcast) return true;
        } catch {}

        try VmContext(address(vm)).isContext(VmContext.ForgeContext.ScriptResume) returns (bool isResume) {
            return isResume;
        } catch {}

        return false;
    }

    function _deployProxyOwner() internal returns (address proxyOwner, address implementation) {
        implementation = address(new ProxyOwner());
        proxyOwner = address(
            new ERC1967Proxy(implementation, abi.encodeWithSelector(ProxyOwner.initialize.selector, address(SENDER)))
        );
        _writeNetworkAddress(".ENVS.PROXY_OWNER", proxyOwner);
        _writeNetworkAddress(".IMPLEMENTATIONS.PROXY_OWNER", implementation);
    }

    function _deployRegistryFactory()
        internal
        returns (
            address registryFactoryProxy,
            address registryFactoryImplementation,
            address communityImpl,
            address strategyImpl,
            address collateralVaultImpl
        )
    {
        communityImpl = address(new RegistryCommunity());
        strategyImpl = address(new CVStrategy());
        collateralVaultImpl = address(new CollateralVault());
        registryFactoryImplementation = address(new RegistryFactory());

        registryFactoryProxy = address(
            new ERC1967Proxy(
                registryFactoryImplementation,
                abi.encodeWithSelector(
                    RegistryFactory.initialize.selector,
                    address(SENDER),
                    address(SENDER),
                    communityImpl,
                    strategyImpl,
                    collateralVaultImpl
                )
            )
        );

        _writeNetworkAddress(".PROXIES.REGISTRY_FACTORY", registryFactoryProxy);
        _writeNetworkAddress(".IMPLEMENTATIONS.REGISTRY_FACTORY", registryFactoryImplementation);
        _writeNetworkAddress(".IMPLEMENTATIONS.REGISTRY_COMMUNITY", communityImpl);
        _writeNetworkAddress(".IMPLEMENTATIONS.CV_STRATEGY", strategyImpl);
        _writeNetworkAddress(".IMPLEMENTATIONS.COLLATERAL_VAULT", collateralVaultImpl);
    }

    function _deployPauseController() internal returns (address pauseController, address implementation) {
        implementation = address(new GlobalPauseController());
        pauseController = address(
            new ERC1967Proxy(
                implementation,
                abi.encodeWithSelector(GlobalPauseController.initialize.selector, address(SENDER))
            )
        );
        _writeNetworkAddress(".ENVS.PAUSE_CONTROLLER", pauseController);
        _writeNetworkAddress(".IMPLEMENTATIONS.PAUSE_CONTROLLER", implementation);
    }

    function _deployStreamingEscrowFactory(address superfluidHost)
        internal
        returns (address factoryProxy, address factoryImplementation, address escrowImplementation)
    {
        escrowImplementation = address(new StreamingEscrow());
        factoryImplementation = address(new StreamingEscrowFactory());
        factoryProxy = address(
            new ERC1967Proxy(
                factoryImplementation,
                abi.encodeWithSelector(
                    StreamingEscrowFactory.initialize.selector,
                    address(SENDER),
                    ISuperfluid(superfluidHost),
                    escrowImplementation
                )
            )
        );
        _writeNetworkAddress(".ENVS.STREAMING_ESCROW_FACTORY", factoryProxy);
        _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY", factoryImplementation);
        _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW", escrowImplementation);
    }

    function _deployPassportScorer() internal returns (address passportScorer, address implementation) {
        implementation = address(new PassportScorer());
        passportScorer = address(
            new ERC1967Proxy(
                implementation,
                abi.encodeWithSelector(PassportScorer.initialize.selector, address(SENDER), address(SENDER))
            )
        );
        _writeNetworkAddress(".ENVS.PASSPORT_SCORER", passportScorer);
        _writeNetworkAddress(".IMPLEMENTATIONS.PASSPORT_SCORER", implementation);
    }

    function _deployGoodDollarSybil() internal returns (address goodDollarSybil, address implementation) {
        implementation = address(new GoodDollarSybil());
        goodDollarSybil = address(
            new ERC1967Proxy(
                implementation,
                abi.encodeWithSelector(GoodDollarSybil.initialize.selector, address(SENDER), address(SENDER))
            )
        );
        _writeNetworkAddress(".ENVS.GOOD_DOLLAR_SYBIL", goodDollarSybil);
        _writeNetworkAddress(".IMPLEMENTATIONS.GOOD_DOLLAR_SYBIL", implementation);
    }

    function _deploySafeArbitrator() internal returns (address safeArbitrator, address implementation) {
        implementation = address(new SafeArbitrator());
        safeArbitrator = address(
            new ERC1967Proxy(
                implementation,
                abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.001 ether, address(SENDER))
            )
        );
        _writeNetworkAddress(".ENVS.ARBITRATOR", safeArbitrator);
        _writeNetworkAddress(".IMPLEMENTATIONS.SAFE_ARBITRATOR", implementation);
    }

    function _logPhase1Summary(CoreDeployments memory deployed) internal view {
        console2.log("PROXIES");
        console2.log("  REGISTRY_FACTORY", deployed.registryFactory);

        console2.log("ENVS");
        console2.log("  PROXY_OWNER", deployed.proxyOwner);

        console2.log("IMPLEMENTATIONS");
        console2.log("  PROXY_OWNER", deployed.proxyOwnerImplementation);
        console2.log("  REGISTRY_FACTORY", deployed.registryFactoryImplementation);
        console2.log("  REGISTRY_COMMUNITY", deployed.registryCommunityImplementation);
        console2.log("  CV_STRATEGY", deployed.cvStrategyImplementation);
        console2.log("  COLLATERAL_VAULT", deployed.collateralVaultImplementation);
    }

    function _logPhase3Summary(CoreDeployments memory deployed) internal view {
        console2.log("ENVS");
        console2.log("  PAUSE_CONTROLLER", deployed.pauseController);
        console2.log("  STREAMING_ESCROW_FACTORY", deployed.streamingEscrowFactory);
        console2.log("  PASSPORT_SCORER", deployed.passportScorer);
        console2.log("  GOOD_DOLLAR_SYBIL", deployed.goodDollarSybil);
        console2.log("  ARBITRATOR", deployed.safeArbitrator);

        console2.log("IMPLEMENTATIONS");
        console2.log("  PAUSE_CONTROLLER", deployed.pauseControllerImplementation);
        console2.log("  STREAMING_ESCROW_FACTORY", deployed.streamingEscrowFactoryImplementation);
        console2.log("  STREAMING_ESCROW", deployed.streamingEscrowImplementation);
        console2.log("  PASSPORT_SCORER", deployed.passportScorerImplementation);
        console2.log("  GOOD_DOLLAR_SYBIL", deployed.goodDollarSybilImplementation);
        console2.log("  SAFE_ARBITRATOR", deployed.safeArbitratorImplementation);
    }

    function _deployCommunityFacets()
        internal
        returns (IDiamond.FacetCut[] memory cuts, CommunityFacetDeployments memory deployed)
    {
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
        deployed = CommunityFacetDeployments({
            loupe: address(loupeFacet),
            admin: address(adminFacet),
            member: address(memberFacet),
            pause: address(pauseFacet),
            pool: address(poolFacet),
            power: address(powerFacet),
            strategy: address(strategyFacet),
            init: address(diamondInit)
        });
    }

    function _deployStrategyFacets()
        internal
        returns (IDiamond.FacetCut[] memory cuts, StrategyFacetDeployments memory deployed)
    {
        CVAdminFacet adminFacet = new CVAdminFacet();
        CVAllocationFacet allocationFacet = new CVAllocationFacet();
        CVDisputeFacet disputeFacet = new CVDisputeFacet();
        CVPauseFacet pauseFacet = new CVPauseFacet();
        CVPowerFacet powerFacet = new CVPowerFacet();
        CVProposalFacet proposalFacet = new CVProposalFacet();
        CVSyncPowerFacet syncPowerFacet = new CVSyncPowerFacet();
        CVStreamingFacet streamingFacet = new CVStreamingFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        CVStrategyDiamondInit diamondInit = new CVStrategyDiamondInit();

        cuts = _buildStrategyFacetCuts(
            adminFacet,
            allocationFacet,
            disputeFacet,
            pauseFacet,
            powerFacet,
            proposalFacet,
            syncPowerFacet,
            streamingFacet,
            loupeFacet
        );
        deployed = StrategyFacetDeployments({
            loupe: address(loupeFacet),
            admin: address(adminFacet),
            allocation: address(allocationFacet),
            dispute: address(disputeFacet),
            pause: address(pauseFacet),
            power: address(powerFacet),
            proposal: address(proposalFacet),
            syncPower: address(syncPowerFacet),
            streaming: address(streamingFacet),
            init: address(diamondInit)
        });
    }

    function _snapshotCommunityFacetDeployments(CommunityFacetDeployments memory deployed) internal {
        _writeNetworkAddress(".FACETS.DIAMOND_LOUPE", deployed.loupe);
        _writeNetworkAddress(".FACETS.COMMUNITY_DIAMOND_LOUPE", deployed.loupe);
        _writeNetworkAddress(".FACETS.COMMUNITY_ADMIN", deployed.admin);
        _writeNetworkAddress(".FACETS.COMMUNITY_MEMBER", deployed.member);
        _writeNetworkAddress(".FACETS.COMMUNITY_PAUSE", deployed.pause);
        _writeNetworkAddress(".FACETS.COMMUNITY_POOL", deployed.pool);
        _writeNetworkAddress(".FACETS.COMMUNITY_POWER", deployed.power);
        _writeNetworkAddress(".FACETS.COMMUNITY_STRATEGY", deployed.strategy);
        _writeNetworkAddress(".INITS.REGISTRY_COMMUNITY_DIAMOND_INIT", deployed.init);
    }

    function _snapshotStrategyFacetDeployments(StrategyFacetDeployments memory deployed) internal {
        _writeNetworkAddress(".FACETS.DIAMOND_LOUPE", deployed.loupe);
        _writeNetworkAddress(".FACETS.STRATEGY_DIAMOND_LOUPE", deployed.loupe);
        _writeNetworkAddress(".FACETS.CV_ADMIN", deployed.admin);
        _writeNetworkAddress(".FACETS.CV_ALLOCATION", deployed.allocation);
        _writeNetworkAddress(".FACETS.CV_DISPUTE", deployed.dispute);
        _writeNetworkAddress(".FACETS.CV_PAUSE", deployed.pause);
        _writeNetworkAddress(".FACETS.CV_POWER", deployed.power);
        _writeNetworkAddress(".FACETS.CV_PROPOSAL", deployed.proposal);
        _writeNetworkAddress(".FACETS.CV_SYNC_POWER", deployed.syncPower);
        _writeNetworkAddress(".FACETS.CV_STREAMING", deployed.streaming);
        _writeNetworkAddress(".INITS.CV_STRATEGY_DIAMOND_INIT", deployed.init);
    }

    function _logFacetAndInitSummary(
        CommunityFacetDeployments memory community,
        StrategyFacetDeployments memory strategy
    ) internal view {
        console2.log("FACETS");
        console2.log("  COMMUNITY_DIAMOND_LOUPE", community.loupe);
        console2.log("  COMMUNITY_ADMIN", community.admin);
        console2.log("  COMMUNITY_MEMBER", community.member);
        console2.log("  COMMUNITY_PAUSE", community.pause);
        console2.log("  COMMUNITY_POOL", community.pool);
        console2.log("  COMMUNITY_POWER", community.power);
        console2.log("  COMMUNITY_STRATEGY", community.strategy);
        console2.log("  STRATEGY_DIAMOND_LOUPE", strategy.loupe);
        console2.log("  CV_ADMIN", strategy.admin);
        console2.log("  CV_ALLOCATION", strategy.allocation);
        console2.log("  CV_DISPUTE", strategy.dispute);
        console2.log("  CV_PAUSE", strategy.pause);
        console2.log("  CV_POWER", strategy.power);
        console2.log("  CV_PROPOSAL", strategy.proposal);
        console2.log("  CV_SYNC_POWER", strategy.syncPower);
        console2.log("  CV_STREAMING", strategy.streaming);

        console2.log("INITS");
        console2.log("  REGISTRY_COMMUNITY_DIAMOND_INIT", community.init);
        console2.log("  CV_STRATEGY_DIAMOND_INIT", strategy.init);
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

        bytes4[] memory memberSelectors = new bytes4[](7);
        memberSelectors[0] = CommunityMemberFacet.stakeAndRegisterMember.selector;
        memberSelectors[1] = CommunityMemberFacet.unregisterMember.selector;
        memberSelectors[2] = CommunityMemberFacet.kickMember.selector;
        memberSelectors[3] = CommunityMemberFacet.isMember.selector;
        memberSelectors[4] = CommunityMemberFacet.getBasisStakedAmount.selector;
        memberSelectors[5] = CommunityMemberFacet.getStakeAmountWithFees.selector;
        memberSelectors[6] = CommunityMemberFacet.registerMember.selector;
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
                "createPool(address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        poolSelectors[1] = bytes4(
            keccak256(
                "createPool(address,address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        baseCuts[3] = IDiamond.FacetCut({
            facetAddress: address(poolFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: poolSelectors
        });

        bytes4[] memory powerSelectors = new bytes4[](8);
        powerSelectors[0] = CommunityPowerFacet.activateMemberInStrategy.selector;
        powerSelectors[1] = CommunityPowerFacet.deactivateMemberInStrategy.selector;
        powerSelectors[2] = CommunityPowerFacet.increasePower.selector;
        powerSelectors[3] = CommunityPowerFacet.decreasePower.selector;
        powerSelectors[4] = CommunityPowerFacet.getMemberPowerInStrategy.selector;
        powerSelectors[5] = CommunityPowerFacet.getMemberStakedAmount.selector;
        powerSelectors[6] = CommunityPowerFacet.ercAddress.selector;
        powerSelectors[7] = CommunityPowerFacet.isRegisteredMember.selector;
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
        CVSyncPowerFacet syncPowerFacet,
        CVStreamingFacet streamingFacet,
        DiamondLoupeFacet loupeFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = new IDiamond.FacetCut[](8);

        bytes4[] memory adminSelectors = new bytes4[](4);
        adminSelectors[0] = bytes4(
            keccak256(
                "setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address)"
            )
        );
        adminSelectors[1] = CVAdminFacet.connectSuperfluidGDA.selector;
        adminSelectors[2] = CVAdminFacet.disconnectSuperfluidGDA.selector;
        adminSelectors[3] = CVAdminFacet.setVotingPowerRegistry.selector;
        baseCuts[0] = IDiamond.FacetCut({
            facetAddress: address(adminFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: adminSelectors
        });

        bytes4[] memory allocationSelectors = new bytes4[](3);
        allocationSelectors[0] = CVAllocationFacet.allocate.selector;
        allocationSelectors[1] = CVAllocationFacet.distribute.selector;
        allocationSelectors[2] = CVAllocationFacet.getPoolAmount.selector;
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

        bytes4[] memory syncSelectors = new bytes4[](4);
        syncSelectors[0] = CVSyncPowerFacet.setAuthorizedSyncCaller.selector;
        syncSelectors[1] = CVSyncPowerFacet.isAuthorizedSyncCaller.selector;
        syncSelectors[2] = CVSyncPowerFacet.syncPower.selector;
        syncSelectors[3] = CVSyncPowerFacet.batchSyncPower.selector;
        baseCuts[6] = IDiamond.FacetCut({
            facetAddress: address(syncPowerFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: syncSelectors
        });

        bytes4[] memory streamingSelectors = new bytes4[](5);
        streamingSelectors[0] = CVStreamingFacet.rebalance.selector;
        streamingSelectors[1] = CVStreamingFacet.stopEscrowStream.selector;
        streamingSelectors[2] = CVStreamingFacet.setAuthorizedRebalanceCaller.selector;
        streamingSelectors[3] = CVStreamingFacet.isAuthorizedRebalanceCaller.selector;
        streamingSelectors[4] = CVStreamingFacet.wrapIfNeeded.selector;
        baseCuts[7] = IDiamond.FacetCut({
            facetAddress: address(streamingFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: streamingSelectors
        });

        cuts = new IDiamond.FacetCut[](9);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 8; i++) {
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
