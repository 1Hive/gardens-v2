// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {CommunityRevenueVault} from "../../src/MarkeeRevenue/CommunityRevenueVault.sol";
import {GardensMarkeeRouter} from "../../src/MarkeeRevenue/GardensMarkeeRouter.sol";
import {SquidBridgeAdapter} from "../../src/MarkeeRevenue/SquidBridgeAdapter.sol";
import {IGardensMarkeeRouter} from "../../src/MarkeeRevenue/interfaces/IGardensMarkeeRouter.sol";
import {IBridgeAdapter, BridgeRequest} from "../../src/MarkeeRevenue/interfaces/IBridgeAdapter.sol";
import {CommunityKeyLib} from "../../src/MarkeeRevenue/libraries/CommunityKeyLib.sol";
import {MockRegistryCommunity} from "./mocks/MockRegistryCommunity.sol";
import {MockETHx} from "./mocks/MockETHx.sol";
import {MockWETH9} from "./mocks/MockWETH9.sol";

/// @dev Test-only bridge adapter that actually forwards funds, so the
/// router's remote-sweep accounting (value forwarded, minAmountOut
/// enforcement) can be exercised without the real (integration-pending)
/// SquidBridgeAdapter.
contract MockBridgeAdapter is IBridgeAdapter {
    address public router;
    uint256 public reportedAmountOut;

    constructor(address _router) {
        router = _router;
    }

    function setReportedAmountOut(uint256 amount) external {
        reportedAmountOut = amount;
    }

    function bridgeETH(BridgeRequest calldata, bytes calldata) external payable returns (bytes32, uint256) {
        require(msg.sender == router, "not router");
        return (keccak256(abi.encode(msg.value)), reportedAmountOut);
    }
}

contract MockSquidRouter {}

contract RejectingReceiver {
    // No receive/fallback: any plain ETH transfer to this contract reverts.

    }

/// @dev A "keeper" contract that reverts on plain ETH transfers, so gas
/// reimbursement failure can be exercised.
contract RejectingKeeper {
    IGardensMarkeeRouter internal router;

    constructor(IGardensMarkeeRouter _router) {
        router = _router;
    }

    function sweep(bytes32 communityKey, bytes calldata quoteData, uint256 minAmountOut, uint256 gasCost) external {
        router.sweep(communityKey, quoteData, minAmountOut, gasCost);
    }
}

contract MockStreamingLeaderboardFactory {
    uint256 public createCount;
    address public lastBeneficiary;
    string public lastPlatformName;
    string public lastPlatformId;
    bool public pilotMode;

    function setPilotMode(bool enabled) external {
        pilotMode = enabled;
    }

    function createLeaderboard(
        address beneficiary,
        string calldata,
        string calldata platformName,
        string calldata platformId
    ) external returns (address leaderboard, address seedMarkee) {
        createCount++;
        lastBeneficiary = beneficiary;
        lastPlatformName = platformName;
        lastPlatformId = platformId;
        leaderboard = pilotMode ? 0x5B9eF23a155Fd97d29fa463af824cFA53C4FAA11 : address(new MockLeaderboard());
        seedMarkee = address(new MockSeedMarkee());
    }
}

contract MockLeaderboard {}

contract MockSeedMarkee {}

contract MockPilotLeaderboard {
    address public beneficiaryAddress;
    address public admin;

    function setup(address beneficiary, address admin_) external {
        beneficiaryAddress = beneficiary;
        admin = admin_;
    }

    function setBeneficiaryAddress(address beneficiary) external {
        require(msg.sender == admin, "only admin");
        beneficiaryAddress = beneficiary;
    }
}

contract MockPilotGenericRouter {
    bytes32 public platformId;
    bytes32 public communityId;
    uint256 public destinationChainId;
    address public vault;
    address public receiver;
    address public bridge;

    function configure(
        bytes32 platform,
        bytes32 community,
        uint256 chainId,
        address vault_,
        address receiver_,
        address bridge_
    ) external {
        platformId = platform;
        communityId = community;
        destinationChainId = chainId;
        vault = vault_;
        receiver = receiver_;
        bridge = bridge_;
    }

    function communities(bytes32) external view returns (bytes32, bytes32, uint256, address) {
        return (platformId, communityId, destinationChainId, vault);
    }

    function receivers(uint256) external view returns (address) {
        return receiver;
    }

    function bridgeAdapters(uint256, bytes32) external view returns (address) {
        return bridge;
    }
}

contract MockPilotGenericVault {
    address public router;
    bytes32 public communityKey;

    constructor(address router_, bytes32 key) {
        router = router_;
        communityKey = key;
    }
}

/// @notice Opt-in fork simulation. It deploys mocks and upgrades the proxy only
/// inside Foundry's ephemeral fork; no live transaction or signing is involved.
contract GardensMarkeePilotForkTest is Test {
    function testForkMigratesDocumentedLiveBoardWithoutChangingOldVault() public {
        string memory rpc = vm.envOr("MARKEE_PILOT_BASE_FORK_RPC", string(""));
        vm.skip(bytes(rpc).length == 0);
        vm.createSelectFork(rpc, vm.envOr("MARKEE_PILOT_BASE_FORK_BLOCK", uint256(58464687)));
        GardensMarkeeRouter router = GardensMarkeeRouter(payable(0xa9d9b3a9CE7edA7000A4baD8Af0863F716eA9d30));
        address owner = router.owner();
        address board = 0x5B9eF23a155Fd97d29fa463af824cFA53C4FAA11;
        address community = 0xE2396fe2169ca026962971d3B2E373Ba925B6257;
        bytes32 legacyKey = CommunityKeyLib.communityKey(100, community);
        address oldVault = router.communityVault(legacyKey);
        uint256 oldBalance = oldVault.balance;
        address implementation = address(new GardensMarkeeRouter());
        vm.prank(owner);
        router.upgradeTo(implementation);
        bytes32 platform = keccak256("gardens");
        bytes32 id = bytes32(uint256(uint160(community)));
        bytes32 key = keccak256(abi.encode(platform, uint256(100), id));
        MockPilotGenericRouter generic = new MockPilotGenericRouter();
        MockPilotGenericVault newVault = new MockPilotGenericVault(address(generic), key);
        generic.configure(platform, id, 100, address(newVault), address(0xBEEF), address(0xCAFE));
        vm.prank(owner);
        router.migrateGnosisPilotBeneficiary(address(newVault), address(generic));
        assertEq(MockPilotLeaderboard(board).beneficiaryAddress(), address(newVault));
        assertEq(router.communityVault(legacyKey), oldVault);
        assertEq(oldVault.balance, oldBalance);
    }
}

contract GardensMarkeeRouterTest is Test {
    GardensMarkeeRouter internal router;
    SquidBridgeAdapter internal adapter;
    address internal vaultImplementation;
    address internal ethx;
    address internal weth;
    address internal proxyOwner = address(0xA11CE);
    address internal keeper = address(0xBEEF);
    MockStreamingLeaderboardFactory internal leaderboardFactory;

    uint256 internal constant BASE_CHAIN_ID = 8453;
    uint256 internal constant REMOTE_CHAIN_ID = 100;

    function setUp() public {
        vm.chainId(BASE_CHAIN_ID);

        vaultImplementation = address(new CommunityRevenueVault());
        adapter = new SquidBridgeAdapter(address(0), address(new MockSquidRouter()));
        ethx = address(new MockETHx());
        weth = address(new MockWETH9());

        address routerImplementation = address(new GardensMarkeeRouter());
        address proxy = address(
            new ERC1967Proxy(
                routerImplementation,
                abi.encodeWithSelector(
                    GardensMarkeeRouter.initialize.selector, proxyOwner, vaultImplementation, ethx, weth
                )
            )
        );
        router = GardensMarkeeRouter(payable(proxy));

        adapter.setRouter(address(router));
        adapter.transferOwnership(proxyOwner);

        vm.prank(proxyOwner);
        router.setKeeper(keeper, true);
        vm.prank(proxyOwner);
        router.setBridgeConfiguration(REMOTE_CHAIN_ID, address(adapter), IGardensMarkeeRouter.BridgeProtocol.Squid);

        leaderboardFactory = new MockStreamingLeaderboardFactory();
        vm.prank(proxyOwner);
        router.setStreamingLeaderboardFactory(address(leaderboardFactory));
    }

    function test_initialize_revertsOnZeroAddresses() public {
        address routerImplementation = address(new GardensMarkeeRouter());
        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        new ERC1967Proxy(
            routerImplementation,
            abi.encodeWithSelector(GardensMarkeeRouter.initialize.selector, address(0), vaultImplementation, ethx, weth)
        );
    }

    function test_ensureCommunityVault_revertsForNonKeeper() public {
        vm.expectRevert(GardensMarkeeRouter.NotKeeper.selector);
        router.ensureCommunityVault(BASE_CHAIN_ID, address(0xC0DE));
    }

    function test_ensureCommunityVault_deploysDeterministicVault() public {
        address registryCommunity = address(0xC0DE);
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, registryCommunity);

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, registryCommunity);

        assertEq(vault, router.predictVaultAddress(key));
        assertEq(router.communityVault(key), vault);
        assertEq(CommunityRevenueVault(payable(vault)).router(), address(router));
    }

    function test_ensureCommunityVault_isIdempotent() public {
        address registryCommunity = address(0xC0DE);

        vm.prank(keeper);
        address first = router.ensureCommunityVault(BASE_CHAIN_ID, registryCommunity);

        vm.prank(keeper);
        address second = router.ensureCommunityVault(BASE_CHAIN_ID, registryCommunity);

        assertEq(first, second);
    }

    function test_createCommunityLeaderboard_deploysAndRegistersIntegration() public {
        address registryCommunity = address(0xC0DE);
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, registryCommunity);

        vm.prank(keeper);
        (address vault, address leaderboard, address seedMarkee) =
            router.createCommunityLeaderboard(BASE_CHAIN_ID, registryCommunity, "Community", "gardens");

        IGardensMarkeeRouter.CommunityIntegration memory integration = router.communityIntegration(key);
        assertEq(integration.communityChainId, BASE_CHAIN_ID);
        assertEq(integration.registryCommunity, registryCommunity);
        assertEq(integration.vault, vault);
        assertEq(integration.factory, address(leaderboardFactory));
        assertEq(integration.leaderboard, leaderboard);
        assertEq(integration.seedMarkee, seedMarkee);
        assertEq(leaderboardFactory.lastBeneficiary(), vault);
        assertEq(leaderboardFactory.lastPlatformName(), "Gardens");
        assertEq(leaderboardFactory.lastPlatformId(), "gardens");
    }

    function test_createCommunityLeaderboard_isIdempotent() public {
        address registryCommunity = address(0xC0DE);

        vm.startPrank(keeper);
        (address firstVault, address firstLeaderboard, address firstSeedMarkee) =
            router.createCommunityLeaderboard(BASE_CHAIN_ID, registryCommunity, "Community", "gardens");
        (address secondVault, address secondLeaderboard, address secondSeedMarkee) =
            router.createCommunityLeaderboard(BASE_CHAIN_ID, registryCommunity, "Community", "gardens");
        vm.stopPrank();

        assertEq(firstVault, secondVault);
        assertEq(firstLeaderboard, secondLeaderboard);
        assertEq(firstSeedMarkee, secondSeedMarkee);
        assertEq(leaderboardFactory.createCount(), 1);
    }

    function test_gnosisPilotMigrationRequiresReadyRouteAndRunsOnlyOnce() public {
        address community = 0xE2396fe2169ca026962971d3B2E373Ba925B6257;
        address board = 0x5B9eF23a155Fd97d29fa463af824cFA53C4FAA11;
        MockPilotLeaderboard template = new MockPilotLeaderboard();
        vm.etch(board, address(template).code);
        leaderboardFactory.setPilotMode(true);
        vm.prank(keeper);
        (address legacyVault,,) = router.createCommunityLeaderboard(100, community, "Pilot", "gardens");
        MockPilotLeaderboard(board).setup(legacyVault, address(router));

        bytes32 platform = keccak256("gardens");
        bytes32 id = bytes32(uint256(uint160(community)));
        bytes32 key = keccak256(abi.encode(platform, uint256(100), id));
        MockPilotGenericRouter generic = new MockPilotGenericRouter();
        MockPilotGenericVault newVault = new MockPilotGenericVault(address(generic), key);
        generic.configure(platform, id, 100, address(newVault), address(0xBEEF), address(0));
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouter.InvalidPilotMigration.selector);
        router.migrateGnosisPilotBeneficiary(address(newVault), address(generic));
        generic.configure(platform, id, 100, address(newVault), address(0xBEEF), address(0xCAFE));
        vm.prank(address(0xBAD));
        vm.expectRevert();
        router.migrateGnosisPilotBeneficiary(address(newVault), address(generic));
        vm.prank(proxyOwner);
        router.migrateGnosisPilotBeneficiary(address(newVault), address(generic));
        assertEq(MockPilotLeaderboard(board).beneficiaryAddress(), address(newVault));
        assertEq(router.communityVault(CommunityKeyLib.communityKey(100, community)), legacyVault);
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouter.InvalidPilotMigration.selector);
        router.migrateGnosisPilotBeneficiary(address(newVault), address(generic));
    }

    function test_createCommunityLeaderboard_revertsForNonKeeper() public {
        vm.expectRevert(GardensMarkeeRouter.NotKeeper.selector);
        router.createCommunityLeaderboard(BASE_CHAIN_ID, address(0xC0DE), "Community", "gardens");
    }

    function test_sweep_revertsForUnknownCommunity() public {
        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.VaultNotFound.selector);
        router.sweep(bytes32(uint256(1)), "", 0, 0);
    }

    function test_sweep_localPaysCouncilSafeDirectly() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        vm.prank(keeper);
        router.sweep(key, "", 0, 0);

        assertEq(registryCommunity.councilSafe().balance, 1 ether);
        assertEq(vault.balance, 0);
    }

    function test_sweep_localFollowsSafeRotation() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        address newSafe = address(0x5AFE2);
        registryCommunity.setCouncilSafe(newSafe);

        vm.prank(keeper);
        router.sweep(key, "", 0, 0);

        assertEq(newSafe.balance, 1 ether);
    }

    function test_sweep_localReimbursesKeeperGasFromRevenue() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        vm.prank(keeper);
        router.sweep(key, "", 0, 0.1 ether);

        assertEq(keeper.balance, 0.1 ether);
        assertEq(registryCommunity.councilSafe().balance, 0.9 ether);
        assertEq(vault.balance, 0);
    }

    function test_sweep_revertsWhenGasCostConsumesRevenue() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(GardensMarkeeRouter.GasCostExceedsRevenue.selector, 1 ether, 1 ether));
        router.sweep(key, "", 0, 1 ether);

        assertEq(vault.balance, 1 ether);
        assertEq(keeper.balance, 0);
    }

    function test_sweep_remoteRevertsWithoutReceiver() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(REMOTE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        router.ensureCommunityVault(REMOTE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(GardensMarkeeRouter.RemoteReceiverNotConfigured.selector, REMOTE_CHAIN_ID)
        );
        router.sweep(key, "", 0, 0);
    }

    function test_sweep_remoteRevertsWithoutChainBridgeConfiguration() public {
        uint256 unconfiguredChainId = 10;
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(unconfiguredChainId, address(registryCommunity));

        vm.prank(keeper);
        router.ensureCommunityVault(unconfiguredChainId, address(registryCommunity));
        vm.prank(proxyOwner);
        router.setRemoteReceiver(unconfiguredChainId, address(0x2EC317E7));

        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.BridgeAdapterNotConfigured.selector);
        router.sweep(key, "", 0, 0);
    }

    function test_bridgeConfiguration_isIndependentPerDestinationChain() public {
        uint256 secondChainId = 10;
        MockBridgeAdapter secondAdapter = new MockBridgeAdapter(address(router));

        vm.prank(proxyOwner);
        router.setBridgeConfiguration(secondChainId, address(secondAdapter), IGardensMarkeeRouter.BridgeProtocol.Across);

        (address gnosisAdapter, IGardensMarkeeRouter.BridgeProtocol gnosisProtocol) =
            router.bridgeConfiguration(REMOTE_CHAIN_ID);
        (address optimismAdapter, IGardensMarkeeRouter.BridgeProtocol optimismProtocol) =
            router.bridgeConfiguration(secondChainId);

        assertEq(gnosisAdapter, address(adapter));
        assertEq(uint8(gnosisProtocol), uint8(IGardensMarkeeRouter.BridgeProtocol.Squid));
        assertEq(optimismAdapter, address(secondAdapter));
        assertEq(uint8(optimismProtocol), uint8(IGardensMarkeeRouter.BridgeProtocol.Across));
    }

    function test_clearBridgeConfiguration_disablesDestination() public {
        vm.prank(proxyOwner);
        router.clearBridgeConfiguration(REMOTE_CHAIN_ID);

        (address configuredAdapter, IGardensMarkeeRouter.BridgeProtocol protocol) =
            router.bridgeConfiguration(REMOTE_CHAIN_ID);
        assertEq(configuredAdapter, address(0));
        assertEq(uint8(protocol), uint8(IGardensMarkeeRouter.BridgeProtocol.None));
    }

    function test_setBridgeConfiguration_rejectsNoneProtocol() public {
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouter.InvalidBridgeProtocol.selector);
        router.setBridgeConfiguration(REMOTE_CHAIN_ID, address(adapter), IGardensMarkeeRouter.BridgeProtocol.None);
    }

    function test_sweep_remoteForwardsToBridgeAdapter() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(REMOTE_CHAIN_ID, address(registryCommunity));
        address remoteReceiver = address(0x2EC317E7);

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(REMOTE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        MockBridgeAdapter mockAdapter = new MockBridgeAdapter(address(router));
        mockAdapter.setReportedAmountOut(1 ether);

        vm.startPrank(proxyOwner);
        router.setBridgeConfiguration(REMOTE_CHAIN_ID, address(mockAdapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setRemoteReceiver(REMOTE_CHAIN_ID, remoteReceiver);
        vm.stopPrank();

        vm.prank(keeper);
        router.sweep(key, "", 1 ether, 0);

        assertEq(address(mockAdapter).balance, 1 ether);
        assertEq(vault.balance, 0);
    }

    function test_sweep_remoteAddsKeeperBridgeExecutionFee() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(REMOTE_CHAIN_ID, address(registryCommunity));
        address remoteReceiver = address(0x2EC317E7);

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(REMOTE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        MockBridgeAdapter mockAdapter = new MockBridgeAdapter(address(router));
        mockAdapter.setReportedAmountOut(1 ether);

        vm.startPrank(proxyOwner);
        router.setBridgeConfiguration(REMOTE_CHAIN_ID, address(mockAdapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setRemoteReceiver(REMOTE_CHAIN_ID, remoteReceiver);
        vm.stopPrank();

        vm.deal(keeper, 0.01 ether);
        vm.prank(keeper);
        router.sweep{value: 0.01 ether}(key, "", 1 ether, 0);

        assertEq(address(mockAdapter).balance, 1.01 ether);
        assertEq(vault.balance, 0);
    }

    function test_sweep_remoteReimbursesKeeperBeforeBridgingNetRevenue() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(REMOTE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(REMOTE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        MockBridgeAdapter mockAdapter = new MockBridgeAdapter(address(router));
        mockAdapter.setReportedAmountOut(0.9 ether);

        vm.startPrank(proxyOwner);
        router.setBridgeConfiguration(REMOTE_CHAIN_ID, address(mockAdapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setRemoteReceiver(REMOTE_CHAIN_ID, address(0x2EC317E7));
        vm.stopPrank();

        vm.prank(keeper);
        router.sweep(key, "", 0.9 ether, 0.1 ether);

        assertEq(keeper.balance, 0.1 ether);
        assertEq(address(mockAdapter).balance, 0.9 ether);
        assertEq(vault.balance, 0);
    }

    function test_sweep_localRejectsBridgeExecutionFee() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);
        vm.deal(keeper, 0.01 ether);

        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.UnexpectedValue.selector);
        router.sweep{value: 0.01 ether}(key, "", 0, 0);
    }

    function test_sweep_remoteRevertsBelowMinAmountOut() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(REMOTE_CHAIN_ID, address(registryCommunity));
        address remoteReceiver = address(0x2EC317E7);

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(REMOTE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        MockBridgeAdapter mockAdapter = new MockBridgeAdapter(address(router));
        mockAdapter.setReportedAmountOut(0.9 ether);

        vm.startPrank(proxyOwner);
        router.setBridgeConfiguration(REMOTE_CHAIN_ID, address(mockAdapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setRemoteReceiver(REMOTE_CHAIN_ID, remoteReceiver);
        vm.stopPrank();

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(GardensMarkeeRouter.InsufficientOutput.selector, 0.9 ether, 1 ether));
        router.sweep(key, "", 1 ether, 0);
    }

    function test_sweep_remoteRejectsEmptySquidQuote() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(REMOTE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(REMOTE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        vm.prank(proxyOwner);
        router.setRemoteReceiver(REMOTE_CHAIN_ID, address(0x2EC317E7));

        vm.prank(keeper);
        vm.expectRevert();
        router.sweep(key, "", 0, 0);
    }

    function test_adminSetters_revertForNonOwner() public {
        vm.expectRevert();
        router.setKeeper(keeper, false);

        vm.expectRevert();
        router.setBridgeConfiguration(REMOTE_CHAIN_ID, address(adapter), IGardensMarkeeRouter.BridgeProtocol.Squid);

        vm.expectRevert();
        router.clearBridgeConfiguration(REMOTE_CHAIN_ID);

        vm.expectRevert();
        router.setVaultImplementation(vaultImplementation);

        vm.expectRevert();
        router.setRemoteReceiver(REMOTE_CHAIN_ID, address(0xDEAD));

        vm.expectRevert();
        router.setTokens(ethx, weth);

        vm.expectRevert();
        router.setStreamingLeaderboardFactory(address(leaderboardFactory));
    }

    function test_setTokens_updatesConfigForFutureVaults() public {
        address newEthx = address(new MockETHx());
        address newWeth = address(new MockWETH9());

        vm.prank(proxyOwner);
        router.setTokens(newEthx, newWeth);

        assertEq(router.ethx(), newEthx);
        assertEq(router.weth(), newWeth);
    }

    function test_setTokens_revertsOnZeroAddress() public {
        vm.startPrank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        router.setTokens(address(0), weth);

        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        router.setTokens(ethx, address(0));
        vm.stopPrank();
    }

    function test_ensureCommunityVault_revertsOnZeroRegistryCommunity() public {
        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        router.ensureCommunityVault(BASE_CHAIN_ID, address(0));
    }

    function test_createCommunityLeaderboard_revertsOnZeroRegistryCommunity() public {
        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        router.createCommunityLeaderboard(BASE_CHAIN_ID, address(0), "Community", "gardens");
    }

    function test_createCommunityLeaderboard_revertsWhenFactoryNotConfigured() public {
        address routerImplementation = address(new GardensMarkeeRouter());
        address proxy = address(
            new ERC1967Proxy(
                routerImplementation,
                abi.encodeWithSelector(
                    GardensMarkeeRouter.initialize.selector, proxyOwner, vaultImplementation, ethx, weth
                )
            )
        );
        GardensMarkeeRouter freshRouter = GardensMarkeeRouter(payable(proxy));
        vm.prank(proxyOwner);
        freshRouter.setKeeper(keeper, true);

        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.StreamingLeaderboardFactoryNotConfigured.selector);
        freshRouter.createCommunityLeaderboard(BASE_CHAIN_ID, address(0xC0DE), "Community", "gardens");
    }

    function test_sweep_localRevertsOnZeroCouncilSafe() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        router.sweep(key, "", 0, 0);
    }

    function test_sweep_localRevertsOnRevenueTransferFailure() public {
        RejectingReceiver badSafe = new RejectingReceiver();
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(badSafe));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.RevenueTransferFailed.selector);
        router.sweep(key, "", 0, 0);
    }

    function test_sweep_revertsOnKeeperReimbursementFailure() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        RejectingKeeper badKeeper = new RejectingKeeper(IGardensMarkeeRouter(address(router)));
        vm.prank(proxyOwner);
        router.setKeeper(address(badKeeper), true);

        vm.expectRevert(GardensMarkeeRouter.KeeperReimbursementFailed.selector);
        badKeeper.sweep(key, "", 0, 0.1 ether);
    }

    function test_setStreamingLeaderboardFactory_revertsOnZeroAddress() public {
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        router.setStreamingLeaderboardFactory(address(0));
    }

    function test_setBridgeConfiguration_revertsOnZeroDestinationChain() public {
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouter.InvalidDestinationChain.selector);
        router.setBridgeConfiguration(0, address(adapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
    }

    function test_setBridgeConfiguration_revertsOnZeroAdapter() public {
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        router.setBridgeConfiguration(REMOTE_CHAIN_ID, address(0), IGardensMarkeeRouter.BridgeProtocol.Squid);
    }

    function test_clearBridgeConfiguration_revertsOnZeroDestinationChain() public {
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouter.InvalidDestinationChain.selector);
        router.clearBridgeConfiguration(0);
    }

    function test_setVaultImplementation_updatesImplementationAndRevertsOnZeroAddress() public {
        address newImplementation = address(new CommunityRevenueVault());

        vm.startPrank(proxyOwner);
        router.setVaultImplementation(newImplementation);
        assertEq(router.vaultImplementation(), newImplementation);

        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        router.setVaultImplementation(address(0));
        vm.stopPrank();
    }
}
