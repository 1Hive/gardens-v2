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

contract GardensMarkeeRouterTest is Test {
    GardensMarkeeRouter internal router;
    SquidBridgeAdapter internal adapter;
    address internal vaultImplementation;
    address internal ethx;
    address internal weth;
    address internal proxyOwner = address(0xA11CE);
    address internal keeper = address(0xBEEF);

    uint256 internal constant BASE_CHAIN_ID = 8453;
    uint256 internal constant REMOTE_CHAIN_ID = 100;

    function setUp() public {
        vm.chainId(BASE_CHAIN_ID);

        vaultImplementation = address(new CommunityRevenueVault());
        adapter = new SquidBridgeAdapter(address(0));
        ethx = address(new MockETHx());
        weth = address(new MockWETH9());

        address routerImplementation = address(new GardensMarkeeRouter());
        address proxy = address(
            new ERC1967Proxy(
                routerImplementation,
                abi.encodeWithSelector(
                    GardensMarkeeRouter.initialize.selector,
                    proxyOwner,
                    vaultImplementation,
                    address(adapter),
                    ethx,
                    weth
                )
            )
        );
        router = GardensMarkeeRouter(payable(proxy));

        adapter.setRouter(address(router));
        adapter.transferOwnership(proxyOwner);

        vm.prank(proxyOwner);
        router.setKeeper(keeper, true);
    }

    function test_initialize_revertsOnZeroAddresses() public {
        address routerImplementation = address(new GardensMarkeeRouter());
        vm.expectRevert(GardensMarkeeRouter.ZeroAddress.selector);
        new ERC1967Proxy(
            routerImplementation,
            abi.encodeWithSelector(
                GardensMarkeeRouter.initialize.selector, address(0), vaultImplementation, address(adapter), ethx, weth
            )
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

    function test_sweep_remoteRevertsWithoutBridgeAdapter() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(REMOTE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        router.ensureCommunityVault(REMOTE_CHAIN_ID, address(registryCommunity));

        vm.prank(proxyOwner);
        router.setBridgeAdapter(address(0xDEAD));
        vm.prank(proxyOwner);
        router.setBridgeAdapter(address(adapter)); // restore, exercised for coverage above

        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(GardensMarkeeRouter.RemoteReceiverNotConfigured.selector, REMOTE_CHAIN_ID)
        );
        router.sweep(key, "", 0);
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
        router.setBridgeAdapter(address(mockAdapter));
        router.setRemoteReceiver(REMOTE_CHAIN_ID, remoteReceiver);
        vm.stopPrank();

        vm.prank(keeper);
        router.sweep(key, "", 1 ether);

        assertEq(address(mockAdapter).balance, 1 ether);
        assertEq(vault.balance, 0);
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
        router.setBridgeAdapter(address(mockAdapter));
        router.setRemoteReceiver(REMOTE_CHAIN_ID, remoteReceiver);
        vm.stopPrank();

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(GardensMarkeeRouter.InsufficientOutput.selector, 0.9 ether, 1 ether));
        router.sweep(key, "", 1 ether);
    }

    function test_sweep_remoteRevertsOnUnimplementedSquidAdapter() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0xC0117));
        bytes32 key = CommunityKeyLib.communityKey(REMOTE_CHAIN_ID, address(registryCommunity));

        vm.prank(keeper);
        address vault = router.ensureCommunityVault(REMOTE_CHAIN_ID, address(registryCommunity));
        vm.deal(vault, 1 ether);

        vm.prank(proxyOwner);
        router.setRemoteReceiver(REMOTE_CHAIN_ID, address(0x2EC317E7));

        vm.prank(keeper);
        vm.expectRevert(SquidBridgeAdapter.SquidIntegrationPending.selector);
        router.sweep(key, "", 0);
    }

    function test_adminSetters_revertForNonOwner() public {
        vm.expectRevert();
        router.setKeeper(keeper, false);

        vm.expectRevert();
        router.setBridgeAdapter(address(adapter));

        vm.expectRevert();
        router.setVaultImplementation(vaultImplementation);

        vm.expectRevert();
        router.setRemoteReceiver(REMOTE_CHAIN_ID, address(0xDEAD));

        vm.expectRevert();
        router.setTokens(ethx, weth);
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
