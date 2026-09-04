// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {GardensRevenueReceiver} from "../src/MarkeeRevenue/GardensRevenueReceiver.sol";

/// @notice Deploys the singleton `GardensRevenueReceiver` for one remote
/// Gardens chain, behind an `ERC1967Proxy` owned by that chain's
/// `PROXY_OWNER` and configured for the chain's Across V3 SpokePool.
contract DeployGardensRevenueReceiver is BaseMultiChain {
    using stdJson for string;

    address constant ARB_SEPOLIA_ACROSS_SPOKE_POOL = 0x7E63A5f1a8F0B4d0934B2f2327DAED3F6bb2ee75;
    address constant ARB_SEPOLIA_WETH = 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73;
    address constant OP_SEPOLIA_ACROSS_SPOKE_POOL = 0x4e8E101924eDE233C13e2D8622DC8aED2872d505;
    address constant OP_SEPOLIA_WETH = 0x4200000000000000000000000000000000000006;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "proxy owner is zero");

        uint256 chainId = networkJson.readUint(getKeyNetwork(".chainId"));
        (address spokePool, address wrappedNativeToken) = _acrossConfig(chainId);

        address receiverImplementation = address(new GardensRevenueReceiver());
        address receiverProxy = address(
            new ERC1967Proxy(
                receiverImplementation,
                abi.encodeWithSignature(
                    "initialize(address,address,address)", proxyOwner, spokePool, wrappedNativeToken
                )
            )
        );

        console2.log("Proxy owner", proxyOwner);
        console2.log("GardensRevenueReceiver impl", receiverImplementation);
        console2.log("GardensRevenueReceiver proxy", receiverProxy);
        console2.log("Across SpokePool", spokePool);
        console2.log("Wrapped native token", wrappedNativeToken);
    }

    function _acrossConfig(uint256 chainId) internal pure returns (address spokePool, address wrappedNativeToken) {
        if (chainId == 421614) return (ARB_SEPOLIA_ACROSS_SPOKE_POOL, ARB_SEPOLIA_WETH);
        if (chainId == 11155420) return (OP_SEPOLIA_ACROSS_SPOKE_POOL, OP_SEPOLIA_WETH);
        revert("Across receiver chain unsupported");
    }
}
