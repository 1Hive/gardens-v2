// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {CommunityRevenueVault} from "../src/MarkeeRevenue/CommunityRevenueVault.sol";
import {GardensMarkeeRouter} from "../src/MarkeeRevenue/GardensMarkeeRouter.sol";
import {CommunityKeyLib} from "../src/MarkeeRevenue/libraries/CommunityKeyLib.sol";

interface IMarkeeLeaderboardFactory {
    function ETHX() external view returns (address);
    function createLeaderboard(
        address _beneficiaryAddress,
        string calldata _leaderboardName,
        string calldata _platformName,
        string calldata _platformId
    ) external returns (address leaderboardAddress, address seedMarkeeAddress);
}

interface IRegistryCommunitySafeView {
    function councilSafe() external view returns (address);
}

/// @notice One-off Sepolia integration test. Deploys a throwaway
/// GardensMarkeeRouter + CommunityRevenueVault stack —
/// owned and keepered by the deploying key, not the production Gardens
/// PROXY_OWNER, since this is manual-test scaffolding, not a production
/// deployment — resolves that community's vault, and creates a real
/// StreamingLeaderboard on Markee's Ethereum Sepolia factory
/// (0x974962E400096Fff36D5069576D0C404eE552C05) with the vault as
/// beneficiary.
///
/// Ethereum Sepolia (chainId 11155111) already has a Gardens deployment
/// (pkg/contracts/config/networks.json, network "ethsepolia") whose
/// SUPERFLUID_HOST matches the Markee factory's HOST() exactly, so this
/// targets a real deployed RegistryCommunity there instead of a mock, and
/// pays out to that community's real councilSafe().
///
/// Since this deploys on the same chain the community lives on,
/// `sweep()` takes the local payout path — no bridge adapter/receiver is
/// ever actually exercised here.
///
/// Simulate only (no transactions sent):
///   forge script pkg/contracts/script/DeployMarkeeSepoliaTest.s.sol \
///     --rpc-url $RPC_URL_SEP_TESTNET
///
/// Broadcast for real:
///   forge script pkg/contracts/script/DeployMarkeeSepoliaTest.s.sol \
///     --rpc-url $RPC_URL_SEP_TESTNET --broadcast
contract DeployMarkeeSepoliaTest is Script {
    address constant MARKEE_FACTORY = 0x974962E400096Fff36D5069576D0C404eE552C05;
    // Canonical Sepolia WETH9. Never actually funded in this test — Markee
    // only ever pays the vault in ETHx — but CommunityRevenueVault.initialize
    // requires a real WETH-shaped contract for its normalization path.
    address constant SEPOLIA_WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    // pkg/contracts/config/networks.json, network "ethsepolia", first entry
    // in PROXIES.REGISTRY_COMMUNITIES.
    address constant TEST_REGISTRY_COMMUNITY = 0x116eaA654E867D15E9def43560D9145ec12F4838;

    uint256 constant SEPOLIA_CHAIN_ID = 11155111;

    function run() external {
        uint256 pk = vm.envUint("PK");
        address deployer = vm.addr(pk);

        IMarkeeLeaderboardFactory factory = IMarkeeLeaderboardFactory(MARKEE_FACTORY);
        address ethx = factory.ETHX();
        address councilSafe = IRegistryCommunitySafeView(TEST_REGISTRY_COMMUNITY).councilSafe();

        console2.log("Deployer", deployer);
        console2.log("Markee factory", MARKEE_FACTORY);
        console2.log("Markee ETHx", ethx);
        console2.log("Test RegistryCommunity", TEST_REGISTRY_COMMUNITY);
        console2.log("Test community councilSafe", councilSafe);

        vm.startBroadcast(pk);

        address vaultImplementation = address(new CommunityRevenueVault());
        address routerImplementation = address(new GardensMarkeeRouter());
        address routerProxy = address(
            new ERC1967Proxy(
                routerImplementation,
                abi.encodeWithSelector(
                    GardensMarkeeRouter.initialize.selector, deployer, vaultImplementation, ethx, SEPOLIA_WETH
                )
            )
        );
        GardensMarkeeRouter router = GardensMarkeeRouter(payable(routerProxy));

        router.setKeeper(deployer, true);

        address vault = router.ensureCommunityVault(SEPOLIA_CHAIN_ID, TEST_REGISTRY_COMMUNITY);

        (address leaderboard, address seedMarkee) =
            factory.createLeaderboard(vault, "Gardens Sepolia Test Leaderboard", "Gardens", "gardens-sepolia-test");

        vm.stopBroadcast();

        bytes32 communityKey = CommunityKeyLib.communityKey(SEPOLIA_CHAIN_ID, TEST_REGISTRY_COMMUNITY);

        console2.log("--- Deployed ---");
        console2.log("CommunityRevenueVault impl", vaultImplementation);
        console2.log("GardensMarkeeRouter proxy", routerProxy);
        console2.log("Community vault (leaderboard beneficiary)", vault);
        console2.log("Leaderboard", leaderboard);
        console2.log("Seed Markee", seedMarkee);
        console2.logBytes32(communityKey);
        console2.log("NEXT: stream ETHx to the leaderboard, then call");
        console2.log('      router.sweep(communityKey, "", 0, gasCost) to reimburse keeper gas and pay councilSafe');
    }
}
