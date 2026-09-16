// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {CommunityRevenueVault} from "../../src/MarkeeRevenue/CommunityRevenueVault.sol";
import {GardensMarkeeRouterRevenueRecovery} from "../../src/MarkeeRevenue/GardensMarkeeRouterRevenueRecovery.sol";
import {ICommunityRevenueVault} from "../../src/MarkeeRevenue/interfaces/ICommunityRevenueVault.sol";
import {CommunityKeyLib} from "../../src/MarkeeRevenue/libraries/CommunityKeyLib.sol";
import {MockRegistryCommunity} from "./mocks/MockRegistryCommunity.sol";
import {MockETHx} from "./mocks/MockETHx.sol";
import {MockWETH9} from "./mocks/MockWETH9.sol";

/// @dev `GardensMarkeeRouterRevenueRecovery`'s storage intentionally matches
/// a *retired* production `GardensMarkeeRouter` layout (see its docstring),
/// which predates the current `GardensMarkeeRouter.sol` in this repo (it
/// still has a single `bridgeAdapter` slot instead of the current
/// `streamingLeaderboardFactory` / per-destination `BridgeConfiguration`
/// mapping). `forge inspect ... storageLayout` confirms its `vaults`
/// mapping sits at slot 156 — one slot later than it would in the current
/// router. So this suite cannot deploy today's `GardensMarkeeRouter` and
/// upgrade it in place (the slots wouldn't line up); instead it deploys the
/// recovery contract as its own implementation and populates `vaults` via
/// `vm.store` at the slot `forge inspect` reports, mirroring exactly what a
/// real upgrade-from-the-legacy-router would leave in that slot.
contract GardensMarkeeRouterRevenueRecoveryTest is Test {
    uint256 internal constant BASE_CHAIN_ID = 8453;
    uint256 internal constant VAULTS_SLOT = 156;

    address internal proxyOwner = address(0xA11CE);
    address internal ethx;
    address internal weth;
    GardensMarkeeRouterRevenueRecovery internal recovery;
    address internal vault;
    bytes32 internal communityKey;
    MockRegistryCommunity internal registryCommunity;

    function setUp() public {
        vm.chainId(BASE_CHAIN_ID);

        ethx = address(new MockETHx());
        weth = address(new MockWETH9());

        address implementation = address(new GardensMarkeeRouterRevenueRecovery());
        address proxy =
            address(new ERC1967Proxy(implementation, abi.encodeWithSignature("initialize(address)", proxyOwner)));
        recovery = GardensMarkeeRouterRevenueRecovery(payable(proxy));

        registryCommunity = new MockRegistryCommunity(address(0xC0117));
        communityKey = CommunityKeyLib.communityKey(BASE_CHAIN_ID, address(registryCommunity));

        address vaultImplementation = address(new CommunityRevenueVault());
        vault = Clones.clone(vaultImplementation);
        vm.prank(proxy);
        ICommunityRevenueVault(vault).initialize(communityKey, BASE_CHAIN_ID, address(registryCommunity), ethx, weth);
        vm.deal(vault, 1 ether);

        bytes32 slot = keccak256(abi.encode(communityKey, VAULTS_SLOT));
        vm.store(proxy, slot, bytes32(uint256(uint160(vault))));
    }

    function test_recoverCommunityRevenue_sendsVaultBalanceToRecipient() public {
        address recipient = address(0xFEE);
        vm.prank(proxyOwner);
        uint256 amount = recovery.recoverCommunityRevenue(communityKey, payable(recipient));

        assertEq(amount, 1 ether);
        assertEq(recipient.balance, 1 ether);
        assertEq(vault.balance, 0);
    }

    function test_recoverCommunityRevenue_revertsForNonOwner() public {
        vm.expectRevert();
        recovery.recoverCommunityRevenue(communityKey, payable(address(0xFEE)));
    }

    function test_recoverCommunityRevenue_revertsOnZeroRecipient() public {
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouterRevenueRecovery.ZeroAddress.selector);
        recovery.recoverCommunityRevenue(communityKey, payable(address(0)));
    }

    function test_recoverCommunityRevenue_revertsForUnknownVault() public {
        vm.prank(proxyOwner);
        vm.expectRevert(GardensMarkeeRouterRevenueRecovery.VaultNotFound.selector);
        recovery.recoverCommunityRevenue(bytes32(uint256(999)), payable(address(0xFEE)));
    }
}
