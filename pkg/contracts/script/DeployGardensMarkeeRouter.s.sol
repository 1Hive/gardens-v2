// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {CommunityRevenueVault} from "../src/MarkeeRevenue/CommunityRevenueVault.sol";
import {GardensMarkeeRouter} from "../src/MarkeeRevenue/GardensMarkeeRouter.sol";
import {SquidBridgeAdapter} from "../src/MarkeeRevenue/SquidBridgeAdapter.sol";
import {IGardensMarkeeRouter} from "../src/MarkeeRevenue/interfaces/IGardensMarkeeRouter.sol";

// Canonical Base ETHx and WETH, per the locked V1 decisions.
address constant CANONICAL_BASE_ETHX = 0x46fd5cfB4c12D87acD3a13e92BAa53240C661D93;
address constant CANONICAL_BASE_WETH = 0x4200000000000000000000000000000000000006;
address constant SQUID_ROUTER = 0xce16F69375520ab01377ce7B88f5BA8C48F8D666;
address constant STREAMING_LEADERBOARD_FACTORY = 0x37f420fdE5c98e611EB7cb9b74ef579D84697039;
address constant MARKEE_KEEPER = 0xb5f2B971878dD2Bc8A0c53635f33280F34C41F2A;

/// @notice Deploys the Base singleton `GardensMarkeeRouter` (behind an
/// `ERC1967Proxy`, owned by the network's `PROXY_OWNER`), its
/// `CommunityRevenueVault` clone implementation, and a `SquidBridgeAdapter`.
///
/// The adapter is first constructed with `router = address(0)` because its
/// `onlyRouter` gate needs the proxy address. Once the proxy exists, the
/// deployer wires the adapter and assigns it explicitly to every Squid-enabled
/// destination chain. Gnosis remains disabled until its LI.FI adapter is set.
///
/// The deployer configures the factory, keeper, per-chain bridge protocols,
/// and remote receiver singletons atomically before handing ownership to the
/// Base `PROXY_OWNER`.
contract DeployGardensMarkeeRouter is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        uint256 currentChainId = networkJson.readUint(getKeyNetwork(".chainId"));
        require(currentChainId == 8453, "Gardens Markee router must deploy on Base");

        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "proxy owner is zero");

        address ethereumReceiver = vm.envAddress("MARKEE_RECEIVER_ETHEREUM");
        address optimismReceiver = vm.envAddress("MARKEE_RECEIVER_OPTIMISM");
        address arbitrumReceiver = vm.envAddress("MARKEE_RECEIVER_ARBITRUM");
        address polygonReceiver = vm.envAddress("MARKEE_RECEIVER_POLYGON");
        address gnosisReceiver = vm.envAddress("MARKEE_RECEIVER_GNOSIS");
        address celoReceiver = vm.envAddress("MARKEE_RECEIVER_CELO");

        address vaultImplementation = address(new CommunityRevenueVault());
        SquidBridgeAdapter adapter = new SquidBridgeAdapter(address(0), SQUID_ROUTER);
        address routerImplementation = address(new GardensMarkeeRouter());

        address routerProxy = address(
            new ERC1967Proxy(
                routerImplementation,
                abi.encodeWithSelector(
                    GardensMarkeeRouter.initialize.selector,
                    SENDER,
                    vaultImplementation,
                    CANONICAL_BASE_ETHX,
                    CANONICAL_BASE_WETH
                )
            )
        );

        adapter.setRouter(routerProxy);
        GardensMarkeeRouter router = GardensMarkeeRouter(payable(routerProxy));
        router.setStreamingLeaderboardFactory(STREAMING_LEADERBOARD_FACTORY);
        router.setKeeper(MARKEE_KEEPER, true);
        router.setBridgeConfiguration(1, address(adapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(10, address(adapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(42161, address(adapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(137, address(adapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setBridgeConfiguration(42220, address(adapter), IGardensMarkeeRouter.BridgeProtocol.Squid);
        router.setRemoteReceiver(1, ethereumReceiver);
        router.setRemoteReceiver(10, optimismReceiver);
        router.setRemoteReceiver(42161, arbitrumReceiver);
        router.setRemoteReceiver(137, polygonReceiver);
        router.setRemoteReceiver(100, gnosisReceiver);
        router.setRemoteReceiver(42220, celoReceiver);

        router.transferOwnership(proxyOwner);
        adapter.transferOwnership(proxyOwner);

        console2.log("Proxy owner", proxyOwner);
        console2.log("CommunityRevenueVault impl", vaultImplementation);
        console2.log("SquidBridgeAdapter", address(adapter));
        console2.log("StreamingLeaderboardFactory", STREAMING_LEADERBOARD_FACTORY);
        console2.log("Keeper", MARKEE_KEEPER);
        console2.log("GardensMarkeeRouter impl", routerImplementation);
        console2.log("GardensMarkeeRouter proxy", routerProxy);
        console2.log("Ethereum receiver", ethereumReceiver);
        console2.log("Optimism receiver", optimismReceiver);
        console2.log("Arbitrum receiver", arbitrumReceiver);
        console2.log("Polygon receiver", polygonReceiver);
        console2.log("Gnosis receiver", gnosisReceiver);
        console2.log("Celo receiver", celoReceiver);
    }
}
