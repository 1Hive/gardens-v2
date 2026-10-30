// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {SquidBridgeAdapterV2} from "../../src/MarkeeRevenue/SquidBridgeAdapterV2.sol";
import {BridgeRequest} from "../../src/MarkeeRevenue/interfaces/IBridgeAdapter.sol";
import {ISquidGardensRevenueReceiver} from "../../src/MarkeeRevenue/interfaces/ISquidGardensRevenueReceiver.sol";

contract MockCanonicalSquidRouterV2 {
    uint256 public received;
    bytes public receivedData;

    fallback() external payable {
        received = msg.value;
        receivedData = msg.data;
    }
}

contract SquidBridgeAdapterV2Test is Test {
    address internal constant SQUID_NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SQUID_MULTICALL = 0xaD6Cea45f98444a922a2b4fE96b8C90F0862D2F4;
    address internal constant BASE_WETH = 0x4200000000000000000000000000000000000006;
    address internal constant BASE_AXL_USDC = 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
    address internal constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant ETHEREUM_USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address internal constant ETHEREUM_WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address internal constant OPTIMISM_WETH = 0x4200000000000000000000000000000000000006;
    address internal constant POLYGON_AXL_USDC = 0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed;
    address internal constant POLYGON_WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    address internal constant ARBITRUM_WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address internal constant CELO_CUSD = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    address internal constant CELO_INTERMEDIATE = 0x122013fd7dF1C6F636a5bb8f03108E876548b455;
    address internal constant CELO_NATIVE = 0x471EcE3750Da237f93B8E339c536989b8978a438;
    address internal constant CELO_CETH = 0x2DEf4285787d58a2f811AF24755A8150622f4361;
    address internal constant BASE_SWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address internal constant BASE_UNIVERSAL_ROUTER = 0x6Cb442acF35158D5eDa88fe602221b67B400Be3E;
    address internal constant BASE_PANCAKE_ROUTER = 0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86;
    address internal constant OPTIMISM_SWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address internal constant ARBITRUM_SWAP_ROUTER = 0x32226588378236Fd0c7c4053999F88aC0e5cAc77;
    address internal constant CELO_EXCHANGE = 0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6;
    address internal constant CELO_V2_ROUTER = 0x1421bDe4B10e8dd459b3BCb598810B1337D56842;
    address internal constant CELO_V3_ROUTER = 0x5615CDAb10dc425a742d643d949a7F474C01abc4;
    address internal constant BASE_ETH_USD_FEED = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;

    MockCanonicalSquidRouterV2 internal squidRouter;
    SquidBridgeAdapterV2 internal adapter;
    address internal gardensRouter = address(0xA11CE);

    function setUp() public {
        vm.warp(2 hours);
        vm.mockCall(BASE_ETH_USD_FEED, abi.encodeWithSignature("decimals()"), abi.encode(uint8(8)));
        vm.mockCall(
            BASE_ETH_USD_FEED,
            abi.encodeWithSignature("latestRoundData()"),
            abi.encode(uint80(1), int256(2_000e8), block.timestamp, block.timestamp, uint80(1))
        );
        squidRouter = new MockCanonicalSquidRouterV2();
        adapter = new SquidBridgeAdapterV2(gardensRouter, address(squidRouter));
    }

    function _request(uint256 minAmountOut) internal pure returns (BridgeRequest memory) {
        return BridgeRequest({
            destinationChainId: 10,
            destinationReceiver: address(0xBEEF),
            communityKey: keccak256("community"),
            registryCommunity: address(0xC0DE),
            refundRecipient: address(0xCAFE),
            minAmountOut: minAmountOut
        });
    }

    function _nativeRoute(
        BridgeRequest memory routeRequest,
        uint256 inputAmount,
        string memory destinationChain,
        string memory destinationAddress,
        address gasRefundRecipient
    ) internal view returns (bytes memory) {
        SquidBridgeAdapterV2.SquidCall[] memory sourceCalls = _sourceCalls(inputAmount);
        SquidBridgeAdapterV2.SquidCall[] memory destinationCalls = _nativeDestinationCalls(routeRequest, inputAmount);
        return _encodeRoute(
            sourceCalls,
            destinationCalls,
            inputAmount,
            destinationChain,
            destinationAddress,
            routeRequest.destinationReceiver,
            gasRefundRecipient,
            true
        );
    }

    function _nativeDestinationCalls(BridgeRequest memory routeRequest, uint256 inputAmount)
        internal
        pure
        returns (SquidBridgeAdapterV2.SquidCall[] memory destinationCalls)
    {
        destinationCalls = new SquidBridgeAdapterV2.SquidCall[](5);
        destinationCalls[0] = SquidBridgeAdapterV2.SquidCall({
            callType: 3, target: address(0), value: 0, callData: "", payload: abi.encode(BASE_AXL_USDC)
        });
        destinationCalls[1] = _approval(BASE_AXL_USDC, OPTIMISM_SWAP_ROUTER, type(uint256).max, 0);
        destinationCalls[2] = _swap(BASE_AXL_USDC, OPTIMISM_WETH, SQUID_MULTICALL, OPTIMISM_SWAP_ROUTER);
        destinationCalls[3] = SquidBridgeAdapterV2.SquidCall({
            callType: 1,
            target: OPTIMISM_WETH,
            value: 0,
            callData: abi.encodeWithSelector(bytes4(0x2e1a7d4d), uint256(0)),
            payload: abi.encode(OPTIMISM_WETH, uint256(0))
        });
        bytes32 payoutId = keccak256(abi.encode(routeRequest.communityKey, routeRequest.registryCommunity, inputAmount));
        destinationCalls[4] = SquidBridgeAdapterV2.SquidCall({
            callType: 2,
            target: routeRequest.destinationReceiver,
            value: 0,
            callData: abi.encodeCall(
                ISquidGardensRevenueReceiver.receiveSquidRevenueV2,
                (payoutId, routeRequest.communityKey, routeRequest.registryCommunity, 0)
            ),
            payload: abi.encode(SQUID_NATIVE_TOKEN, uint256(0))
        });
        return destinationCalls;
    }

    function _tokenRoute(BridgeRequest memory routeRequest, uint256 inputAmount, address token)
        internal
        view
        returns (bytes memory)
    {
        SquidBridgeAdapterV2.SquidCall[] memory sourceCalls = _sourceCalls(inputAmount);
        SquidBridgeAdapterV2.SquidCall[] memory destinationCalls =
            _tokenDestinationCalls(routeRequest, inputAmount, token);
        return _encodeRoute(
            sourceCalls,
            destinationCalls,
            inputAmount,
            "optimism",
            _toHexString(address(squidRouter)),
            routeRequest.destinationReceiver,
            routeRequest.refundRecipient,
            false
        );
    }

    function _tokenDestinationCalls(BridgeRequest memory routeRequest, uint256 inputAmount, address token)
        internal
        pure
        returns (SquidBridgeAdapterV2.SquidCall[] memory destinationCalls)
    {
        destinationCalls = new SquidBridgeAdapterV2.SquidCall[](5);
        destinationCalls[0] = SquidBridgeAdapterV2.SquidCall({
            callType: 3, target: address(0), value: 0, callData: "", payload: abi.encode(BASE_AXL_USDC)
        });
        destinationCalls[1] = _approval(BASE_AXL_USDC, OPTIMISM_SWAP_ROUTER, type(uint256).max, 0);
        destinationCalls[2] = _swap(BASE_AXL_USDC, token, SQUID_MULTICALL, OPTIMISM_SWAP_ROUTER);
        destinationCalls[3] = _approval(token, routeRequest.destinationReceiver, 0, 1);
        bytes32 payoutId = keccak256(abi.encode(routeRequest.communityKey, routeRequest.registryCommunity, inputAmount));
        destinationCalls[4] = SquidBridgeAdapterV2.SquidCall({
            callType: 1,
            target: routeRequest.destinationReceiver,
            value: 0,
            callData: abi.encodeCall(
                ISquidGardensRevenueReceiver.receiveSquidTokenRevenueV2,
                (payoutId, routeRequest.communityKey, routeRequest.registryCommunity, token, 0, 0)
            ),
            payload: abi.encode(token, uint256(4))
        });
        return destinationCalls;
    }

    function _singleSwapDestinationCalls(
        BridgeRequest memory routeRequest,
        uint256 inputAmount,
        address bridgeToken,
        address outputToken,
        address swapTarget,
        bool nativeOutput
    ) internal pure returns (SquidBridgeAdapterV2.SquidCall[] memory destinationCalls) {
        destinationCalls = new SquidBridgeAdapterV2.SquidCall[](5);
        destinationCalls[0] = SquidBridgeAdapterV2.SquidCall({
            callType: 3, target: address(0), value: 0, callData: "", payload: abi.encode(bridgeToken)
        });
        destinationCalls[1] = _approval(bridgeToken, swapTarget, type(uint256).max, 0);
        destinationCalls[2] = _swap(bridgeToken, outputToken, SQUID_MULTICALL, swapTarget);
        bytes32 payoutId = keccak256(abi.encode(routeRequest.communityKey, routeRequest.registryCommunity, inputAmount));
        if (nativeOutput) {
            destinationCalls[3] = SquidBridgeAdapterV2.SquidCall({
                callType: 1,
                target: outputToken,
                value: 0,
                callData: abi.encodeWithSelector(bytes4(0x2e1a7d4d), uint256(0)),
                payload: abi.encode(outputToken, uint256(0))
            });
            destinationCalls[4] = SquidBridgeAdapterV2.SquidCall({
                callType: 2,
                target: routeRequest.destinationReceiver,
                value: 0,
                callData: abi.encodeCall(
                    ISquidGardensRevenueReceiver.receiveSquidRevenueV2,
                    (payoutId, routeRequest.communityKey, routeRequest.registryCommunity, 0)
                ),
                payload: abi.encode(SQUID_NATIVE_TOKEN, uint256(0))
            });
        } else {
            destinationCalls[3] = _approval(outputToken, routeRequest.destinationReceiver, 0, 1);
            destinationCalls[4] = SquidBridgeAdapterV2.SquidCall({
                callType: 1,
                target: routeRequest.destinationReceiver,
                value: 0,
                callData: abi.encodeCall(
                    ISquidGardensRevenueReceiver.receiveSquidTokenRevenueV2,
                    (payoutId, routeRequest.communityKey, routeRequest.registryCommunity, outputToken, 0, 0)
                ),
                payload: abi.encode(outputToken, uint256(4))
            });
        }
    }

    function _assertSupportedDestinationRoute(
        uint256 destinationChainId,
        string memory destinationChain,
        address bridgeToken,
        address outputToken,
        address swapTarget,
        bool nativeOutput
    ) internal {
        BridgeRequest memory request = _request(0.8 ether);
        request.destinationChainId = destinationChainId;
        bytes memory route = _encodeRoute(
            _sourceCalls(1 ether),
            _singleSwapDestinationCalls(request, 1 ether, bridgeToken, outputToken, swapTarget, nativeOutput),
            1 ether,
            destinationChain,
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));

        assertEq(squidRouter.received(), 1.01 ether);
    }

    function _encodeRoute(
        SquidBridgeAdapterV2.SquidCall[] memory sourceCalls,
        SquidBridgeAdapterV2.SquidCall[] memory destinationCalls,
        uint256 inputAmount,
        string memory destinationChain,
        string memory destinationAddress,
        address fallbackRecipient,
        address gasRefundRecipient,
        bool enableExpress
    ) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(
            bytes4(0x846a1bc6),
            SQUID_NATIVE_TOKEN,
            inputAmount,
            sourceCalls,
            "axlUSDC",
            destinationChain,
            destinationAddress,
            abi.encode(destinationCalls, fallbackRecipient),
            gasRefundRecipient,
            enableExpress
        );
    }

    function _quote(bytes memory routerCalldata, uint256 expectedAmountOut, uint256 deadline)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(
            SquidBridgeAdapterV2.SquidQuote({
                inputAmount: 1 ether,
                expectedAmountOut: expectedAmountOut,
                executionValue: 1.01 ether,
                deadline: deadline,
                routerCalldata: routerCalldata
            })
        );
    }

    function _sourceCalls(uint256 inputAmount)
        internal
        view
        returns (SquidBridgeAdapterV2.SquidCall[] memory sourceCalls)
    {
        sourceCalls = new SquidBridgeAdapterV2.SquidCall[](3);
        sourceCalls[0] = SquidBridgeAdapterV2.SquidCall({
            callType: 0,
            target: BASE_WETH,
            value: inputAmount,
            callData: abi.encodePacked(bytes4(0xd0e30db0)),
            payload: abi.encode(BASE_WETH, uint256(0))
        });
        sourceCalls[1] = _approval(BASE_WETH, BASE_SWAP_ROUTER, type(uint256).max, 0);
        sourceCalls[2] = _swap(BASE_WETH, BASE_AXL_USDC, address(squidRouter), BASE_SWAP_ROUTER);
    }

    function _approval(address token, address spender, uint256 amount, uint8 callType)
        internal
        pure
        returns (SquidBridgeAdapterV2.SquidCall memory)
    {
        return SquidBridgeAdapterV2.SquidCall({
            callType: callType,
            target: token,
            value: 0,
            callData: abi.encodeWithSelector(bytes4(0x095ea7b3), spender, amount),
            payload: abi.encode(token, uint256(1))
        });
    }

    function _swap(address tokenIn, address tokenOut, address recipient, address target)
        internal
        pure
        returns (SquidBridgeAdapterV2.SquidCall memory)
    {
        return _swapWithMinimum(tokenIn, tokenOut, recipient, target, 0.9 ether);
    }

    function _swapWithMinimum(
        address tokenIn,
        address tokenOut,
        address recipient,
        address target,
        uint256 amountOutMinimum
    ) internal pure returns (SquidBridgeAdapterV2.SquidCall memory) {
        return SquidBridgeAdapterV2.SquidCall({
            callType: 1,
            target: target,
            value: 0,
            callData: abi.encodeWithSelector(
                bytes4(0x04e45aaf),
                tokenIn,
                tokenOut,
                uint24(100),
                recipient,
                uint256(1 ether),
                amountOutMinimum,
                uint160(0)
            ),
            payload: abi.encode(tokenIn, uint256(4))
        });
    }

    function _universalSwap(address tokenIn, address tokenOut, address recipient)
        internal
        view
        returns (SquidBridgeAdapterV2.SquidCall memory)
    {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            recipient, uint256(1 ether), uint256(0.8 ether), abi.encodePacked(tokenIn, uint24(100), tokenOut), true
        );
        return SquidBridgeAdapterV2.SquidCall({
            callType: 1,
            target: BASE_UNIVERSAL_ROUTER,
            value: 0,
            callData: abi.encodeWithSelector(bytes4(0x3593564c), bytes(hex"00"), inputs, block.timestamp + 5 minutes),
            payload: abi.encode(tokenIn, uint256(9))
        });
    }

    function _celoDexSwap(address tokenIn, address tokenOut, address recipient)
        internal
        view
        returns (SquidBridgeAdapterV2.SquidCall memory)
    {
        SquidBridgeAdapterV2.CeloDexRoute[] memory routes = new SquidBridgeAdapterV2.CeloDexRoute[](1);
        routes[0] = SquidBridgeAdapterV2.CeloDexRoute({from: tokenIn, to: tokenOut, factory: address(0xFAC7)});
        return SquidBridgeAdapterV2.SquidCall({
            callType: 1,
            target: CELO_EXCHANGE,
            value: 0,
            callData: abi.encodeWithSelector(
                bytes4(0x3375aa2a), uint256(1 ether), uint256(0.8 ether), routes, recipient, block.timestamp + 5 minutes
            ),
            payload: abi.encode(tokenIn, uint256(0))
        });
    }

    function _v2Swap(address tokenIn, address tokenOut, address recipient)
        internal
        view
        returns (SquidBridgeAdapterV2.SquidCall memory)
    {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        return SquidBridgeAdapterV2.SquidCall({
            callType: 1,
            target: CELO_V2_ROUTER,
            value: 0,
            callData: abi.encodeWithSelector(
                bytes4(0x38ed1739), uint256(1 ether), uint256(0.8 ether), path, recipient, block.timestamp + 5 minutes
            ),
            payload: abi.encode(tokenIn, uint256(0))
        });
    }

    function _validNativeRoute(BridgeRequest memory request) internal view returns (bytes memory) {
        return _nativeRoute(request, 1 ether, "optimism", _toHexString(address(squidRouter)), request.refundRecipient);
    }

    function test_bridgeETH_bindsNativeMinimumAndForwardsRoute() public {
        BridgeRequest memory request = _request(0.8 ether);
        uint256 expectedAmountOut = 0.9 ether;
        bytes memory quoteData = _quote(_validNativeRoute(request), expectedAmountOut, block.timestamp + 5 minutes);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        (, uint256 returnedAmountOut) = adapter.bridgeETH{value: 1.01 ether}(request, quoteData);

        assertEq(returnedAmountOut, expectedAmountOut);
        assertEq(squidRouter.received(), 1.01 ether);

        (SquidBridgeAdapterV2.SquidCall[] memory destinationCalls, address fallbackRecipient) =
            _destinationPayload(squidRouter.receivedData());
        bytes32 payoutId = keccak256(abi.encode(request.communityKey, request.registryCommunity, 1 ether));
        assertEq(fallbackRecipient, request.destinationReceiver);
        assertEq(
            destinationCalls[destinationCalls.length - 1].callData,
            abi.encodeCall(
                ISquidGardensRevenueReceiver.receiveSquidRevenueV2,
                (payoutId, request.communityKey, request.registryCommunity, expectedAmountOut)
            )
        );
    }

    function test_bridgeETH_bindsTokenMinimumAndForwardsRoute() public {
        BridgeRequest memory request = _request(0.8 ether);
        address token = OPTIMISM_WETH;
        uint256 expectedAmountOut = 0.9 ether;
        bytes memory quoteData =
            _quote(_tokenRoute(request, 1 ether, token), expectedAmountOut, block.timestamp + 5 minutes);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        adapter.bridgeETH{value: 1.01 ether}(request, quoteData);

        (SquidBridgeAdapterV2.SquidCall[] memory destinationCalls,) = _destinationPayload(squidRouter.receivedData());
        bytes32 payoutId = keccak256(abi.encode(request.communityKey, request.registryCommunity, 1 ether));
        assertEq(
            destinationCalls[destinationCalls.length - 1].callData,
            abi.encodeCall(
                ISquidGardensRevenueReceiver.receiveSquidTokenRevenueV2,
                (payoutId, request.communityKey, request.registryCommunity, token, 0, expectedAmountOut)
            )
        );
    }

    function test_bridgeETH_acceptsProductionShapedUniversalRouterSourcePath() public {
        BridgeRequest memory request = _request(0.8 ether);
        SquidBridgeAdapterV2.SquidCall[] memory sourceCalls = new SquidBridgeAdapterV2.SquidCall[](5);
        sourceCalls[0] = SquidBridgeAdapterV2.SquidCall({
            callType: 0,
            target: BASE_WETH,
            value: 1 ether,
            callData: abi.encodePacked(bytes4(0xd0e30db0)),
            payload: abi.encode(BASE_WETH, uint256(0))
        });
        sourceCalls[1] = _approval(BASE_WETH, BASE_UNIVERSAL_ROUTER, type(uint256).max, 0);
        sourceCalls[2] = _universalSwap(BASE_WETH, BASE_USDC, SQUID_MULTICALL);
        sourceCalls[3] = _approval(BASE_USDC, BASE_PANCAKE_ROUTER, type(uint256).max, 0);
        sourceCalls[4] = _swap(BASE_USDC, BASE_AXL_USDC, address(squidRouter), BASE_PANCAKE_ROUTER);
        bytes memory route = _encodeRoute(
            sourceCalls,
            _nativeDestinationCalls(request, 1 ether),
            1 ether,
            "optimism",
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));

        assertEq(squidRouter.received(), 1.01 ether);
    }

    function test_bridgeETH_acceptsProductionShapedCeloDestinationPath() public {
        BridgeRequest memory request = _request(0.8 ether);
        request.destinationChainId = 42220;
        SquidBridgeAdapterV2.SquidCall[] memory destinationCalls = new SquidBridgeAdapterV2.SquidCall[](11);
        destinationCalls[0] = SquidBridgeAdapterV2.SquidCall({
            callType: 3, target: address(0), value: 0, callData: "", payload: abi.encode(BASE_AXL_USDC)
        });
        destinationCalls[1] = _approval(BASE_AXL_USDC, CELO_EXCHANGE, type(uint256).max, 0);
        destinationCalls[2] = _celoDexSwap(BASE_AXL_USDC, CELO_CUSD, SQUID_MULTICALL);
        destinationCalls[3] = _approval(CELO_CUSD, CELO_V2_ROUTER, type(uint256).max, 0);
        destinationCalls[4] = _v2Swap(CELO_CUSD, CELO_INTERMEDIATE, SQUID_MULTICALL);
        destinationCalls[5] = _approval(CELO_INTERMEDIATE, CELO_V2_ROUTER, type(uint256).max, 0);
        destinationCalls[6] = _v2Swap(CELO_INTERMEDIATE, CELO_NATIVE, SQUID_MULTICALL);
        destinationCalls[7] = _approval(CELO_NATIVE, CELO_V3_ROUTER, type(uint256).max, 0);
        destinationCalls[8] = _swap(CELO_NATIVE, CELO_CETH, SQUID_MULTICALL, CELO_V3_ROUTER);
        destinationCalls[9] = _approval(CELO_CETH, request.destinationReceiver, 0, 1);
        bytes32 payoutId = keccak256(abi.encode(request.communityKey, request.registryCommunity, 1 ether));
        destinationCalls[10] = SquidBridgeAdapterV2.SquidCall({
            callType: 1,
            target: request.destinationReceiver,
            value: 0,
            callData: abi.encodeCall(
                ISquidGardensRevenueReceiver.receiveSquidTokenRevenueV2,
                (payoutId, request.communityKey, request.registryCommunity, CELO_CETH, 0, 0)
            ),
            payload: abi.encode(CELO_CETH, uint256(4))
        });
        bytes memory route = _encodeRoute(
            _sourceCalls(1 ether),
            destinationCalls,
            1 ether,
            "celo",
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));

        assertEq(squidRouter.received(), 1.01 ether);
    }

    function test_bridgeETH_acceptsEthereumDestinationPath() public {
        _assertSupportedDestinationRoute(1, "Ethereum", ETHEREUM_USDC, ETHEREUM_WETH, OPTIMISM_SWAP_ROUTER, true);
    }

    function test_bridgeETH_acceptsPolygonDestinationPath() public {
        _assertSupportedDestinationRoute(137, "Polygon", POLYGON_AXL_USDC, POLYGON_WETH, OPTIMISM_SWAP_ROUTER, false);
    }

    function test_bridgeETH_acceptsArbitrumDestinationPath() public {
        _assertSupportedDestinationRoute(42161, "Arbitrum", BASE_AXL_USDC, ARBITRUM_WETH, ARBITRUM_SWAP_ROUTER, true);
    }

    function test_bridgeETH_revertsWhenSourceSwapRedirectsOutput() public {
        BridgeRequest memory request = _request(0.8 ether);
        SquidBridgeAdapterV2.SquidCall[] memory sourceCalls = _sourceCalls(1 ether);
        sourceCalls[2] = _swap(BASE_WETH, BASE_AXL_USDC, address(0xBAD), BASE_SWAP_ROUTER);
        bytes memory route = _encodeRoute(
            sourceCalls,
            _nativeDestinationCalls(request, 1 ether),
            1 ether,
            "optimism",
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenSourceSwapMinimumIsEconomicallyUnbound() public {
        BridgeRequest memory request = _request(0.8 ether);
        SquidBridgeAdapterV2.SquidCall[] memory sourceCalls = _sourceCalls(1 ether);
        sourceCalls[2] = _swapWithMinimum(BASE_WETH, BASE_AXL_USDC, address(squidRouter), BASE_SWAP_ROUTER, 1);
        bytes memory route = _encodeRoute(
            sourceCalls,
            _nativeDestinationCalls(request, 1 ether),
            1 ether,
            "optimism",
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(abi.encodeWithSelector(SquidBridgeAdapterV2.InsufficientSourceOutput.selector, 1, 1_800e6));
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenSourcePriceIsStale() public {
        vm.mockCall(
            BASE_ETH_USD_FEED,
            abi.encodeWithSignature("latestRoundData()"),
            abi.encode(
                uint80(1), int256(2_000e8), block.timestamp - 1 hours - 1, block.timestamp - 1 hours - 1, uint80(1)
            )
        );
        BridgeRequest memory request = _request(0.8 ether);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.InvalidPriceFeed.selector);
        adapter.bridgeETH{value: 1.01 ether}(
            request, _quote(_validNativeRoute(request), 0.9 ether, block.timestamp + 5 minutes)
        );
    }

    function test_bridgeETH_revertsWhenSourcePriceRoundIsIncomplete() public {
        vm.mockCall(
            BASE_ETH_USD_FEED,
            abi.encodeWithSignature("latestRoundData()"),
            abi.encode(uint80(2), int256(2_000e8), block.timestamp, block.timestamp, uint80(1))
        );
        BridgeRequest memory request = _request(0.8 ether);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.InvalidPriceFeed.selector);
        adapter.bridgeETH{value: 1.01 ether}(
            request, _quote(_validNativeRoute(request), 0.9 ether, block.timestamp + 5 minutes)
        );
    }

    function test_bridgeETH_revertsWhenSourcePriceRoundNeverStarted() public {
        vm.mockCall(
            BASE_ETH_USD_FEED,
            abi.encodeWithSignature("latestRoundData()"),
            abi.encode(uint80(1), int256(2_000e8), uint256(0), block.timestamp, uint80(1))
        );
        BridgeRequest memory request = _request(0.8 ether);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.InvalidPriceFeed.selector);
        adapter.bridgeETH{value: 1.01 ether}(
            request, _quote(_validNativeRoute(request), 0.9 ether, block.timestamp + 5 minutes)
        );
    }

    function test_bridgeETH_revertsWhenSourceUsesUnapprovedTarget() public {
        BridgeRequest memory request = _request(0.8 ether);
        address attackerTarget = address(0xBAD);
        SquidBridgeAdapterV2.SquidCall[] memory sourceCalls = _sourceCalls(1 ether);
        sourceCalls[1] = _approval(BASE_WETH, attackerTarget, type(uint256).max, 0);
        sourceCalls[2] = _swap(BASE_WETH, BASE_AXL_USDC, address(squidRouter), attackerTarget);
        bytes memory route = _encodeRoute(
            sourceCalls,
            _nativeDestinationCalls(request, 1 ether),
            1 ether,
            "optimism",
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenDestinationSwapRedirectsOutput() public {
        BridgeRequest memory request = _request(0.8 ether);
        SquidBridgeAdapterV2.SquidCall[] memory destinationCalls = _nativeDestinationCalls(request, 1 ether);
        destinationCalls[2] = _swap(BASE_AXL_USDC, OPTIMISM_WETH, address(0xBAD), OPTIMISM_SWAP_ROUTER);
        bytes memory route = _encodeRoute(
            _sourceCalls(1 ether),
            destinationCalls,
            1 ether,
            "optimism",
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenDestinationSwapMinimumIsBelowExpectedOutput() public {
        BridgeRequest memory request = _request(0.8 ether);
        SquidBridgeAdapterV2.SquidCall[] memory destinationCalls = _nativeDestinationCalls(request, 1 ether);
        destinationCalls[2] = _swapWithMinimum(BASE_AXL_USDC, OPTIMISM_WETH, SQUID_MULTICALL, OPTIMISM_SWAP_ROUTER, 1);
        bytes memory route = _encodeRoute(
            _sourceCalls(1 ether),
            destinationCalls,
            1 ether,
            "optimism",
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(abi.encodeWithSelector(SquidBridgeAdapterV2.InsufficientOutput.selector, 1, 0.9 ether));
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenProviderQuoteIsBelowIndependentDestinationFloor() public {
        BridgeRequest memory request = _request(0);
        bytes memory route = _validNativeRoute(request);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(abi.encodeWithSelector(SquidBridgeAdapterV2.InsufficientOutput.selector, 1, 0.9 ether));
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 1, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenProviderSetsItsOwnMinimum() public {
        BridgeRequest memory request = _request(0.8 ether);
        SquidBridgeAdapterV2.SquidCall[] memory destinationCalls = _nativeDestinationCalls(request, 1 ether);
        bytes32 payoutId = keccak256(abi.encode(request.communityKey, request.registryCommunity, 1 ether));
        destinationCalls[4].callData = abi.encodeCall(
            ISquidGardensRevenueReceiver.receiveSquidRevenueV2,
            (payoutId, request.communityKey, request.registryCommunity, 1)
        );
        bytes memory route = _encodeRoute(
            _sourceCalls(1 ether),
            destinationCalls,
            1 ether,
            "optimism",
            _toHexString(address(squidRouter)),
            request.destinationReceiver,
            request.refundRecipient,
            true
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenProviderRedirectsReceiver() public {
        BridgeRequest memory request = _request(0.8 ether);
        BridgeRequest memory maliciousRoute = _request(0.8 ether);
        maliciousRoute.destinationReceiver = address(0xBAD);
        bytes memory quoteData = _quote(_validNativeRoute(maliciousRoute), 0.9 ether, block.timestamp + 5 minutes);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, quoteData);
    }

    function test_bridgeETH_revertsWhenDestinationChainDoesNotMatch() public {
        BridgeRequest memory request = _request(0.8 ether);
        bytes memory route =
            _nativeRoute(request, 1 ether, "Polygon", _toHexString(address(squidRouter)), request.refundRecipient);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenDestinationRouterDoesNotMatch() public {
        BridgeRequest memory request = _request(0.8 ether);
        bytes memory route =
            _nativeRoute(request, 1 ether, "optimism", _toHexString(address(0xBAD)), request.refundRecipient);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenGasRefundRecipientDoesNotMatch() public {
        BridgeRequest memory request = _request(0.8 ether);
        bytes memory route =
            _nativeRoute(request, 1 ether, "optimism", _toHexString(address(squidRouter)), address(0xBAD));

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenCommunityMetadataDoesNotMatch() public {
        BridgeRequest memory request = _request(0.8 ether);
        BridgeRequest memory maliciousRoute = _request(0.8 ether);
        maliciousRoute.communityKey = keccak256("other community");

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(
            request, _quote(_validNativeRoute(maliciousRoute), 0.9 ether, block.timestamp + 5 minutes)
        );
    }

    function test_bridgeETH_revertsWhenSourceAmountDoesNotMatch() public {
        BridgeRequest memory request = _request(0.8 ether);
        bytes memory route =
            _nativeRoute(request, 0.5 ether, "optimism", _toHexString(address(squidRouter)), request.refundRecipient);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapterV2.UnboundRoute.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(route, 0.9 ether, block.timestamp + 5 minutes));
    }

    function test_bridgeETH_revertsWhenExpectedOutputIsBelowRouterMinimum() public {
        BridgeRequest memory request = _request(0.9 ether);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(abi.encodeWithSelector(SquidBridgeAdapterV2.InsufficientOutput.selector, 0.8 ether, 0.9 ether));
        adapter.bridgeETH{value: 1.01 ether}(
            request, _quote(_validNativeRoute(request), 0.8 ether, block.timestamp + 5 minutes)
        );
    }

    function test_bridgeETH_revertsWhenQuoteExpired() public {
        BridgeRequest memory request = _request(0.8 ether);
        uint256 deadline = block.timestamp + 5 minutes;
        vm.warp(deadline + 1);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(abi.encodeWithSelector(SquidBridgeAdapterV2.QuoteExpired.selector, deadline));
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(_validNativeRoute(request), 0.9 ether, deadline));
    }

    function _destinationPayload(bytes memory routerCalldata)
        internal
        pure
        returns (SquidBridgeAdapterV2.SquidCall[] memory destinationCalls, address fallbackRecipient)
    {
        (,,,,,, bytes memory payload,,) = abi.decode(
            _withoutSelector(routerCalldata),
            (address, uint256, SquidBridgeAdapterV2.SquidCall[], string, string, string, bytes, address, bool)
        );
        return abi.decode(payload, (SquidBridgeAdapterV2.SquidCall[], address));
    }

    function _withoutSelector(bytes memory data) internal pure returns (bytes memory result) {
        result = new bytes(data.length - 4);
        for (uint256 i; i < result.length; ++i) {
            result[i] = data[i + 4];
        }
    }

    function _toHexString(address value) internal pure returns (string memory) {
        bytes16 symbols = "0123456789abcdef";
        bytes memory result = new bytes(42);
        result[0] = "0";
        result[1] = "x";
        uint160 raw = uint160(value);
        for (uint256 i; i < 40; ++i) {
            result[41 - i] = symbols[raw & 0xf];
            raw >>= 4;
        }
        return string(result);
    }
}
