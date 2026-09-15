// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {AcrossBridgeAdapter} from "../../src/MarkeeRevenue/AcrossBridgeAdapter.sol";
import {BridgeRequest} from "../../src/MarkeeRevenue/interfaces/IBridgeAdapter.sol";

contract MockAcrossSpokePool {
    address public depositor;
    address public recipient;
    address public inputToken;
    address public outputToken;
    uint256 public inputAmount;
    uint256 public outputAmount;
    uint256 public destinationChainId;
    bytes public message;

    function depositV3Now(
        address _depositor,
        address _recipient,
        address _inputToken,
        address _outputToken,
        uint256 _inputAmount,
        uint256 _outputAmount,
        uint256 _destinationChainId,
        address,
        uint32,
        uint32,
        bytes calldata _message
    ) external payable {
        require(msg.value == _inputAmount, "value mismatch");
        depositor = _depositor;
        recipient = _recipient;
        inputToken = _inputToken;
        outputToken = _outputToken;
        inputAmount = _inputAmount;
        outputAmount = _outputAmount;
        destinationChainId = _destinationChainId;
        message = _message;
    }
}

contract AcrossBridgeAdapterTest is Test {
    uint256 internal constant DESTINATION_CHAIN_ID = 11155420;
    address internal router = address(0xA017E2);
    address internal wrappedNativeToken = address(0x0E7);
    address internal destinationToken = address(0xDE57);
    address internal receiver = address(0x2EC317E7);
    address internal refundRecipient = address(0xF00D);
    address internal registryCommunity = address(0xC0DE);

    MockAcrossSpokePool internal spokePool;
    AcrossBridgeAdapter internal adapter;

    function setUp() public {
        vm.warp(1_800_000_000);
        spokePool = new MockAcrossSpokePool();
        adapter = new AcrossBridgeAdapter(router, address(spokePool), wrappedNativeToken);
        adapter.setDestinationToken(DESTINATION_CHAIN_ID, destinationToken);
    }

    function _request(uint256 minAmountOut) internal view returns (BridgeRequest memory) {
        return BridgeRequest({
            destinationChainId: DESTINATION_CHAIN_ID,
            destinationReceiver: receiver,
            communityKey: keccak256("community"),
            registryCommunity: registryCommunity,
            refundRecipient: refundRecipient,
            minAmountOut: minAmountOut
        });
    }

    function _quote(uint256 outputAmount) internal view returns (bytes memory) {
        return abi.encode(
            AcrossBridgeAdapter.AcrossQuote({outputAmount: outputAmount, fillDeadline: uint32(block.timestamp + 3600)})
        );
    }

    function test_bridgeETH_depositsNativeETHWithBoundMessage() public {
        uint256 inputAmount = 1 ether;
        uint256 outputAmount = 0.99 ether;

        vm.deal(router, inputAmount);
        vm.prank(router);
        (bytes32 transferId, uint256 expectedAmountOut) =
            adapter.bridgeETH{value: inputAmount}(_request(outputAmount), _quote(outputAmount));

        assertEq(expectedAmountOut, outputAmount);
        assertEq(spokePool.depositor(), refundRecipient);
        assertEq(spokePool.recipient(), receiver);
        assertEq(spokePool.inputToken(), wrappedNativeToken);
        assertEq(spokePool.outputToken(), destinationToken);
        assertEq(spokePool.inputAmount(), inputAmount);
        assertEq(spokePool.outputAmount(), outputAmount);
        assertEq(spokePool.destinationChainId(), DESTINATION_CHAIN_ID);

        (bytes32 deliveredId, bytes32 communityKey, address deliveredRegistry) =
            abi.decode(spokePool.message(), (bytes32, bytes32, address));
        assertEq(deliveredId, transferId);
        assertEq(communityKey, keccak256("community"));
        assertEq(deliveredRegistry, registryCommunity);
    }

    function test_bridgeETH_revertsForNonRouter() public {
        vm.expectRevert(AcrossBridgeAdapter.NotRouter.selector);
        adapter.bridgeETH(_request(1), _quote(1));
    }

    function test_bridgeETH_revertsForUnconfiguredDestination() public {
        BridgeRequest memory request = _request(1);
        request.destinationChainId = 421614;
        vm.deal(router, 1 ether);
        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(AcrossBridgeAdapter.DestinationNotConfigured.selector, 421614));
        adapter.bridgeETH{value: 1 ether}(request, _quote(1));
    }

    function test_bridgeETH_revertsBelowMinimumOutput() public {
        vm.deal(router, 1 ether);
        vm.prank(router);
        vm.expectRevert(abi.encodeWithSelector(AcrossBridgeAdapter.InsufficientOutput.selector, 0.9 ether, 0.95 ether));
        adapter.bridgeETH{value: 1 ether}(_request(0.95 ether), _quote(0.9 ether));
    }

    function test_bridgeETH_revertsForExpiredQuote() public {
        bytes memory quote = abi.encode(
            AcrossBridgeAdapter.AcrossQuote({outputAmount: 0.9 ether, fillDeadline: uint32(block.timestamp)})
        );
        vm.deal(router, 1 ether);
        vm.prank(router);
        vm.expectRevert(AcrossBridgeAdapter.QuoteExpired.selector);
        adapter.bridgeETH{value: 1 ether}(_request(0.9 ether), quote);
    }

    function test_adminSetters_onlyOwner() public {
        vm.prank(address(0xBAD));
        vm.expectRevert();
        adapter.setDestinationToken(421614, address(1));

        adapter.setRouter(address(1));
        assertEq(adapter.router(), address(1));
    }

    function test_constructor_revertsOnZeroSpokePool() public {
        vm.expectRevert(AcrossBridgeAdapter.ZeroAddress.selector);
        new AcrossBridgeAdapter(router, address(0), wrappedNativeToken);
    }

    function test_constructor_revertsOnZeroWrappedNativeToken() public {
        vm.expectRevert(AcrossBridgeAdapter.ZeroAddress.selector);
        new AcrossBridgeAdapter(router, address(spokePool), address(0));
    }

    function test_setRouter_revertsOnZeroAddress() public {
        vm.expectRevert(AcrossBridgeAdapter.ZeroAddress.selector);
        adapter.setRouter(address(0));
    }

    function test_setDestinationToken_revertsOnZeroAddress() public {
        vm.expectRevert(AcrossBridgeAdapter.ZeroAddress.selector);
        adapter.setDestinationToken(DESTINATION_CHAIN_ID, address(0));
    }

    function test_bridgeETH_revertsOnZeroValue() public {
        vm.prank(router);
        vm.expectRevert(AcrossBridgeAdapter.ZeroValue.selector);
        adapter.bridgeETH(_request(1), _quote(1));
    }

    function test_bridgeETH_revertsOnZeroDestinationReceiver() public {
        BridgeRequest memory request = _request(1);
        request.destinationReceiver = address(0);

        vm.deal(router, 1 ether);
        vm.prank(router);
        vm.expectRevert(AcrossBridgeAdapter.ZeroAddress.selector);
        adapter.bridgeETH{value: 1 ether}(request, _quote(0.9 ether));
    }

    function test_bridgeETH_revertsOnZeroRefundRecipient() public {
        BridgeRequest memory request = _request(1);
        request.refundRecipient = address(0);

        vm.deal(router, 1 ether);
        vm.prank(router);
        vm.expectRevert(AcrossBridgeAdapter.ZeroAddress.selector);
        adapter.bridgeETH{value: 1 ether}(request, _quote(0.9 ether));
    }

    function test_bridgeETH_revertsOnInvalidQuote() public {
        vm.deal(router, 1 ether);
        vm.prank(router);
        vm.expectRevert(AcrossBridgeAdapter.InvalidQuote.selector);
        adapter.bridgeETH{value: 1 ether}(_request(0), _quote(0));
    }
}
