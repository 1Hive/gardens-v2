// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {CommunityRevenueVault} from "../src/MarkeeRevenue/CommunityRevenueVault.sol";
import {GardensMarkeeRouter} from "../src/MarkeeRevenue/GardensMarkeeRouter.sol";
import {SquidBridgeAdapter} from "../src/MarkeeRevenue/SquidBridgeAdapter.sol";

// Canonical Base ETHx and WETH, per the locked V1 decisions.
address constant CANONICAL_BASE_ETHX = 0x46fd5cfB4c12D87acD3a13e92BAa53240C661D93;
address constant CANONICAL_BASE_WETH = 0x4200000000000000000000000000000000000006;

/// @notice Deploys the Base singleton `GardensMarkeeRouter` (behind an
/// `ERC1967Proxy`, owned by the network's `PROXY_OWNER`), its
/// `CommunityRevenueVault` clone implementation, and a `SquidBridgeAdapter`.
///
/// The router requires a non-zero adapter at `initialize`, but the adapter's
/// `onlyRouter` gate requires knowing the router's proxy address — to break
/// that cycle, the adapter is first constructed with `router = address(0)`
/// (safe by default: nothing can call it) and wired to the real router proxy
/// with `setRouter` right after.
///
/// Deployer keeps adapter ownership only long enough to call `setRouter`,
/// then hands it to `PROXY_OWNER` so on-chain governance matches every other
/// singleton in this repo. `PROXY_OWNER` must separately call
/// `router.setKeeper(...)` to authorize the Gardens keeper before any vault
/// can be created or swept.
contract DeployGardensMarkeeRouter is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "proxy owner is zero");

        address vaultImplementation = address(new CommunityRevenueVault());
        SquidBridgeAdapter adapter = new SquidBridgeAdapter(address(0));
        address routerImplementation = address(new GardensMarkeeRouter());

        address routerProxy = address(
            new ERC1967Proxy(
                routerImplementation,
                abi.encodeWithSelector(
                    GardensMarkeeRouter.initialize.selector,
                    proxyOwner,
                    vaultImplementation,
                    address(adapter),
                    CANONICAL_BASE_ETHX,
                    CANONICAL_BASE_WETH
                )
            )
        );

        adapter.setRouter(routerProxy);
        adapter.transferOwnership(proxyOwner);

        console2.log("Proxy owner", proxyOwner);
        console2.log("CommunityRevenueVault impl", vaultImplementation);
        console2.log("SquidBridgeAdapter", address(adapter));
        console2.log("GardensMarkeeRouter impl", routerImplementation);
        console2.log("GardensMarkeeRouter proxy", routerProxy);
        console2.log("NOTE: PROXY_OWNER must call router.setKeeper(keeper, true) before use");
    }
}
