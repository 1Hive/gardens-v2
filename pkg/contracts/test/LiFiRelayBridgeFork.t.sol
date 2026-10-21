// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;
import {Test} from "forge-std/Test.sol";
import {LiFiRelayBridgeAdapter} from "../src/MarkeeRevenue/LiFiRelayBridgeAdapter.sol";
import {LiFiBridgeAdapter} from "../src/MarkeeRevenue/LiFiBridgeAdapter.sol";
import {BridgeRequest} from "../src/MarkeeRevenue/interfaces/IBridgeAdapter.sol";

/// @dev Opt-in read-only fork. Proves source execution, NOT off-chain settlement.
contract LiFiRelayBridgeForkTest is Test {
    function testRealLiFiSourceExecution() public {
        string memory rpc = vm.envOr("MARKEE_RELAY_FORK_RPC", string(""));
        vm.skip(bytes(rpc).length == 0);
        string memory fixture = vm.readFile("pkg/contracts/test/fixtures/markee-relay-quote.json");
        vm.createSelectFork(rpc, vm.parseJsonUint(fixture, ".baseBlockNumber"));
        address source = vm.parseJsonAddress(fixture, ".fromAddress");
        address vault = vm.parseJsonAddress(fixture, ".toAddress");
        uint256 input = vm.parseUint(vm.parseJsonString(fixture, ".inputAmount"));
        uint256 output = vm.parseUint(vm.parseJsonString(fixture, ".minimumOutput"));
        address community = 0xE2396fe2169ca026962971d3B2E373Ba925B6257;
        LiFiRelayBridgeAdapter template = new LiFiRelayBridgeAdapter(
            address(this),
            0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE,
            vault,
            0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1,
            0xCE40449B773a3E6E5e769ADb4e567179d4828cbd,
            0xC06ebbefD94032B85424D51906e2A335EFAe264B
        );
        // Replace code ONLY in the local fork so the recorded quote's depositor
        // matches. Nothing is deployed or changed on the live chain.
        vm.etch(source, address(template).code);
        vm.store(source, bytes32(0), bytes32(uint256(uint160(address(this)))));
        LiFiRelayBridgeAdapter adapter = LiFiRelayBridgeAdapter(payable(source));
        adapter.setCommunityVault(community, vault);
        vm.deal(source, 0);
        vm.deal(address(this), input);
        bytes memory quote = abi.encode(
            LiFiBridgeAdapter.LiFiQuote(
                input, output, input, adapter.destinationToken(), vm.parseJsonBytes(fixture, ".calldata")
            )
        );
        (bytes32 orderId, uint256 actualOutput) = adapter.bridgeETH{value: input}(
            BridgeRequest(100, vault, keccak256(abi.encode(uint256(100), community)), community, address(this), output),
            quote
        );
        assertTrue(adapter.usedOrders(orderId));
        assertEq(actualOutput, output);
        assertEq(source.balance, 0);
    }
    receive() external payable {}
}
