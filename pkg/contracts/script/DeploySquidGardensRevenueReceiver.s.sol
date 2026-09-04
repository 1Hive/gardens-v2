// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {SquidGardensRevenueReceiver} from "../src/MarkeeRevenue/SquidGardensRevenueReceiver.sol";

/// @notice Deploys the Squid destination receiver singleton on a production
/// Gardens chain. Squid documents one canonical Multicall address across its
/// supported EVM mainnets.
contract DeploySquidGardensRevenueReceiver is BaseMultiChain {
    using stdJson for string;

    address constant CANONICAL_SQUID_MULTICALL = 0xaD6Cea45f98444a922a2b4fE96b8C90F0862D2F4;
    address constant GNOSIS_SQUID_MULTICALL = 0x073e81D92bd8B39562106819D12346240606F04A;

    function runCurrentNetwork(string memory networkJson) public override {
        uint256 currentChainId = networkJson.readUint(getKeyNetwork(".chainId"));
        require(_isSupportedRemoteChain(currentChainId), "unsupported Squid receiver chain");

        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "proxy owner is zero");
        address squidMulticall = currentChainId == 100 ? GNOSIS_SQUID_MULTICALL : CANONICAL_SQUID_MULTICALL;

        address receiverImplementation = address(new SquidGardensRevenueReceiver());
        address receiverProxy = address(
            new ERC1967Proxy(
                receiverImplementation,
                abi.encodeWithSignature("initialize(address,address)", proxyOwner, squidMulticall)
            )
        );

        console2.log("Chain ID", currentChainId);
        console2.log("Proxy owner", proxyOwner);
        console2.log("Squid Multicall", squidMulticall);
        console2.log("SquidGardensRevenueReceiver impl", receiverImplementation);
        console2.log("SquidGardensRevenueReceiver proxy", receiverProxy);
    }

    function _isSupportedRemoteChain(uint256 currentChainId) internal pure returns (bool) {
        return currentChainId == 1 || currentChainId == 10 || currentChainId == 42161 || currentChainId == 137
            || currentChainId == 100 || currentChainId == 42220;
    }
}
