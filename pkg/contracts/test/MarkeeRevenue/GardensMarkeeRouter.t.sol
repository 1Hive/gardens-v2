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

contract MockStreamingLeaderboardFactory {
    uint256 public createCount;
    address public lastBeneficiary;
    string public lastPlatformName;
    string public lastPlatformId;

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
        leaderboard = address(new MockLeaderboard());
        seedMarkee = address(new MockSeedMarkee());
    }
}

contract MockLeaderboard {}

contract MockSeedMarkee {}

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

    function test_createCommunityLeaderboard_revertsForNonKeeper() public {
        vm.expectRevert(GardensMarkeeRouter.NotKeeper.selector);
        router.createCommunityLeaderboard(BASE_CHAIN_ID, address(0xC0DE), "Community", "gardens");
    }

    function test_sweep_revertsForUnknownCommunity() public {
        vm.prank(keeper);
        vm.expectRevert(GardensMarkeeRouter.VaultNotFound.selector);
        router.sweep(bytes32(uint256(1)), "", 0);
    }

    function test_sweep_localPaysCouncilSafeDirectly() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(BASE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        vm.prank(keeper);
        router.sweep(key, "", 0);

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
        router.sweep(key, "", 0);

        assertEq(newSafe.balance, 1 ether);
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
        router.sweep(key, "", 0);
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
        router.sweep(key, "", 0);
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
        router.sweep(key, "", 1 ether);

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
        router.sweep{value: 0.01 ether}(key, "", 1 ether);

        assertEq(address(mockAdapter).balance, 1.01 ether);
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
        router.sweep{value: 0.01 ether}(key, "", 0);
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
        router.sweep(key, "", 1 ether);
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
        router.sweep(key, "", 0);
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
}
