// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {IBridgeAdapter, BridgeRequest} from "./interfaces/IBridgeAdapter.sol";
import {ISquidGardensRevenueReceiver} from "./interfaces/ISquidGardensRevenueReceiver.sol";

/// @notice Router-configured, replaceable Squid adapter that binds provider
/// calldata to the destination selected by Gardens.
contract SquidBridgeAdapterV2 is Ownable, IBridgeAdapter {
    struct SquidCall {
        uint8 callType;
        address target;
        uint256 value;
        bytes callData;
        bytes payload;
    }

    struct SquidQuote {
        uint256 inputAmount;
        uint256 expectedAmountOut;
        uint256 executionValue;
        uint256 deadline;
        bytes routerCalldata;
    }

    struct SquidRoute {
        address sourceToken;
        uint256 sourceAmount;
        SquidCall[] sourceCalls;
        string bridgeTokenSymbol;
        string destinationChain;
        string destinationAddress;
        bytes destinationPayload;
        address gasRefundRecipient;
        bool enableExpress;
    }

    struct SwapDetails {
        address tokenIn;
        address tokenOut;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint256 inputPosition;
    }

    struct TokenPayout {
        bytes32 payoutId;
        bytes32 communityKey;
        address registryCommunity;
        address token;
        uint256 amount;
        uint256 minimum;
    }

    struct CeloDexRoute {
        address from;
        address to;
        address factory;
    }

    address internal constant SQUID_NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SQUID_MULTICALL = 0xaD6Cea45f98444a922a2b4fE96b8C90F0862D2F4;
    address internal constant BASE_WETH = 0x4200000000000000000000000000000000000006;
    address internal constant BASE_AXL_USDC = 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
    address internal constant BASE_ETH_USD_FEED = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    bytes4 internal constant CALL_BRIDGE_CALL_SELECTOR = 0x846a1bc6;
    bytes4 internal constant APPROVE_SELECTOR = 0x095ea7b3;
    bytes4 internal constant DEPOSIT_SELECTOR = 0xd0e30db0;
    bytes4 internal constant WITHDRAW_SELECTOR = 0x2e1a7d4d;
    bytes4 internal constant EXACT_INPUT_SINGLE_SELECTOR = 0x04e45aaf;
    bytes4 internal constant EXACT_INPUT_SINGLE_WITH_DEADLINE_SELECTOR = 0x414bf389;
    bytes4 internal constant UNIVERSAL_ROUTER_EXECUTE_SELECTOR = 0x3593564c;
    bytes4 internal constant CELO_ROUTER_SWAP_SELECTOR = 0x3375aa2a;
    bytes4 internal constant V2_ROUTER_SWAP_SELECTOR = 0x38ed1739;
    uint8 internal constant DEFAULT_CALL = 0;
    uint8 internal constant FULL_TOKEN_BALANCE = 1;
    uint8 internal constant FULL_NATIVE_BALANCE = 2;
    uint8 internal constant COLLECT_TOKEN_BALANCE = 3;
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    uint256 internal constant MAX_SOURCE_SLIPPAGE_BPS = 1_000;
    uint256 internal constant MAX_DESTINATION_SLIPPAGE_BPS = 1_000;
    uint256 internal constant MAX_ETH_USD_PRICE_AGE = 1 hours;

    address public router;
    address public immutable squidRouter;
    uint256 public transferNonce;
    mapping(uint256 chainId => mapping(address target => bool allowed)) public allowedSwapTargets;

    event RouterUpdated(address indexed router);
    event SwapTargetUpdated(uint256 indexed chainId, address indexed target, bool allowed);
    event SquidRouteExecuted(
        bytes32 indexed transferId,
        uint256 indexed destinationChainId,
        address indexed destinationReceiver,
        uint256 inputAmount,
        uint256 expectedAmountOut,
        bytes32 routerCalldataHash
    );

    error NotRouter();
    error ZeroAddress();
    error ZeroValue();
    error InvalidQuote();
    error QuoteExpired(uint256 deadline);
    error InsufficientOutput(uint256 expected, uint256 minimum);
    error RefundFailed();
    error SquidCallFailed(bytes reason);
    error UnboundRoute();
    error InvalidPriceFeed();
    error InsufficientSourceOutput(uint256 minimum, uint256 requiredMinimum);

    modifier onlyRouter() {
        if (msg.sender != router) revert NotRouter();
        _;
    }

    constructor(address _router, address _squidRouter) {
        if (_squidRouter == address(0)) revert ZeroAddress();
        router = _router;
        squidRouter = _squidRouter;
        _setDefaultSwapTargets();
    }

    function setRouter(address _router) external onlyOwner {
        if (_router == address(0)) revert ZeroAddress();
        router = _router;
        emit RouterUpdated(_router);
    }

    function setSwapTarget(uint256 chainId, address target, bool allowed) external onlyOwner {
        if (target == address(0)) revert ZeroAddress();
        allowedSwapTargets[chainId][target] = allowed;
        emit SwapTargetUpdated(chainId, target, allowed);
    }

    /// @inheritdoc IBridgeAdapter
    function bridgeETH(BridgeRequest calldata request, bytes calldata quoteData)
        external
        payable
        onlyRouter
        returns (bytes32 transferId, uint256 expectedAmountOut)
    {
        if (msg.value == 0) revert ZeroValue();
        if (request.destinationReceiver == address(0) || request.refundRecipient == address(0)) {
            revert ZeroAddress();
        }

        SquidQuote memory quote = abi.decode(quoteData, (SquidQuote));
        if (
            quote.inputAmount == 0 || quote.expectedAmountOut == 0 || quote.executionValue < quote.inputAmount
                || quote.executionValue > msg.value || quote.deadline == 0 || quote.routerCalldata.length < 4
        ) revert InvalidQuote();
        if (block.timestamp > quote.deadline) revert QuoteExpired(quote.deadline);

        uint256 independentMinimum = _minimumDestinationOutput(quote.inputAmount);
        if (quote.expectedAmountOut < independentMinimum) {
            revert InsufficientOutput(quote.expectedAmountOut, independentMinimum);
        }

        bytes memory boundRouterCalldata = _validateRoute(request, quote);
        expectedAmountOut = quote.expectedAmountOut;
        if (expectedAmountOut < request.minAmountOut) {
            revert InsufficientOutput(expectedAmountOut, request.minAmountOut);
        }

        uint256 nonce = transferNonce++;
        transferId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                nonce,
                request.destinationChainId,
                request.destinationReceiver,
                request.communityKey,
                request.registryCommunity,
                quote.inputAmount,
                expectedAmountOut,
                keccak256(boundRouterCalldata)
            )
        );

        uint256 surplus = msg.value - quote.executionValue;
        if (surplus != 0) {
            (bool refunded,) = payable(request.refundRecipient).call{value: surplus}("");
            if (!refunded) revert RefundFailed();
        }

        (bool success, bytes memory result) = squidRouter.call{value: quote.executionValue}(boundRouterCalldata);
        if (!success) revert SquidCallFailed(result);

        emit SquidRouteExecuted(
            transferId,
            request.destinationChainId,
            request.destinationReceiver,
            quote.inputAmount,
            expectedAmountOut,
            keccak256(boundRouterCalldata)
        );
    }

    function _validateRoute(BridgeRequest calldata request, SquidQuote memory quote)
        internal
        view
        returns (bytes memory boundRouterCalldata)
    {
        if (_selector(quote.routerCalldata) != CALL_BRIDGE_CALL_SELECTOR) revert UnboundRoute();

        SquidRoute memory route = _decodeRoute(_withoutSelector(quote.routerCalldata));

        if (
            route.sourceToken != SQUID_NATIVE_TOKEN || route.sourceAmount != quote.inputAmount
                || route.gasRefundRecipient != request.refundRecipient
                || keccak256(bytes(route.bridgeTokenSymbol)) != keccak256("axlUSDC")
                || keccak256(bytes(route.destinationChain)) != _destinationChainHash(request.destinationChainId)
                || _parseAddress(route.destinationAddress) != squidRouter
        ) revert UnboundRoute();
        _validateSourceCalls(route.sourceCalls, quote);

        (SquidCall[] memory destinationCalls, address fallbackRecipient) =
            abi.decode(route.destinationPayload, (SquidCall[], address));
        if (destinationCalls.length == 0 || fallbackRecipient != request.destinationReceiver) revert UnboundRoute();

        destinationCalls[destinationCalls.length - 1] = _validateAndBindDestination(request, quote, destinationCalls);
        route.destinationPayload = abi.encode(destinationCalls, fallbackRecipient);
        boundRouterCalldata = abi.encodeWithSelector(
            CALL_BRIDGE_CALL_SELECTOR,
            route.sourceToken,
            route.sourceAmount,
            route.sourceCalls,
            route.bridgeTokenSymbol,
            route.destinationChain,
            route.destinationAddress,
            route.destinationPayload,
            route.gasRefundRecipient,
            route.enableExpress
        );
    }

    function _validateAndBindDestination(
        BridgeRequest calldata request,
        SquidQuote memory quote,
        SquidCall[] memory calls
    ) internal view returns (SquidCall memory) {
        SquidCall memory payoutCall = calls[calls.length - 1];
        if (payoutCall.target != request.destinationReceiver || payoutCall.value != 0) revert UnboundRoute();

        uint256 independentMinimum = _minimumDestinationOutput(quote.inputAmount);

        address currentToken = _destinationBridgeToken(request.destinationChainId);
        SquidCall memory collectCall = calls[0];
        if (
            collectCall.callType != COLLECT_TOKEN_BALANCE || collectCall.target != address(0) || collectCall.value != 0
                || collectCall.callData.length != 0
                || keccak256(collectCall.payload) != keccak256(abi.encode(currentToken))
        ) revert UnboundRoute();

        bytes4 payoutSelector = _selector(payoutCall.callData);
        if (payoutSelector == ISquidGardensRevenueReceiver.receiveSquidRevenueV2.selector) {
            return _bindNativePayout(request, quote.inputAmount, calls, currentToken, payoutCall, independentMinimum);
        } else if (payoutSelector == ISquidGardensRevenueReceiver.receiveSquidTokenRevenueV2.selector) {
            return _bindTokenPayout(request, quote.inputAmount, calls, currentToken, payoutCall, independentMinimum);
        }
        revert UnboundRoute();
    }

    function _bindNativePayout(
        BridgeRequest calldata request,
        uint256 inputAmount,
        SquidCall[] memory calls,
        address currentToken,
        SquidCall memory payoutCall,
        uint256 independentMinimum
    ) internal view returns (SquidCall memory) {
        if (!_supportsNativeOutput(request.destinationChainId) || calls.length < 3) {
            revert UnboundRoute();
        }
        currentToken = _validateDestinationSwaps(
            calls, currentToken, calls.length - 2, request.destinationChainId, independentMinimum
        );
        _validateWithdraw(calls[calls.length - 2], currentToken, request.destinationChainId);
        (bytes32 routePayoutId, bytes32 communityKey, address registryCommunity, uint256 minimum) =
            abi.decode(_withoutSelector(payoutCall.callData), (bytes32, bytes32, address, uint256));
        bytes32 payoutId = keccak256(abi.encode(request.communityKey, request.registryCommunity, inputAmount));
        if (
            payoutCall.callType != FULL_NATIVE_BALANCE || routePayoutId != payoutId
                || communityKey != request.communityKey || registryCommunity != request.registryCommunity
                || minimum != 0
                || keccak256(payoutCall.payload) != keccak256(abi.encode(SQUID_NATIVE_TOKEN, uint256(0)))
        ) revert UnboundRoute();
        payoutCall.callData = abi.encodeCall(
            ISquidGardensRevenueReceiver.receiveSquidRevenueV2,
            (payoutId, request.communityKey, request.registryCommunity, independentMinimum)
        );
        return payoutCall;
    }

    function _bindTokenPayout(
        BridgeRequest calldata request,
        uint256 inputAmount,
        SquidCall[] memory calls,
        address currentToken,
        SquidCall memory payoutCall,
        uint256 independentMinimum
    ) internal view returns (SquidCall memory) {
        if (calls.length < 3) revert UnboundRoute();
        currentToken = _validateDestinationSwaps(
            calls, currentToken, calls.length - 2, request.destinationChainId, independentMinimum
        );
        TokenPayout memory routePayout = abi.decode(_withoutSelector(payoutCall.callData), (TokenPayout));
        bytes32 payoutId = keccak256(abi.encode(request.communityKey, request.registryCommunity, inputAmount));
        if (
            payoutCall.callType != FULL_TOKEN_BALANCE || routePayout.payoutId != payoutId
                || routePayout.communityKey != request.communityKey
                || routePayout.registryCommunity != request.registryCommunity
                || routePayout.token != _destinationOutputToken(request.destinationChainId)
                || routePayout.token != currentToken || routePayout.amount != 0 || routePayout.minimum != 0
                || keccak256(payoutCall.payload) != keccak256(abi.encode(routePayout.token, uint256(4)))
        ) revert UnboundRoute();
        _validateApproval(
            calls[calls.length - 2], routePayout.token, request.destinationReceiver, 0, FULL_TOKEN_BALANCE
        );
        payoutCall.callData = abi.encodeCall(
            ISquidGardensRevenueReceiver.receiveSquidTokenRevenueV2,
            (payoutId, request.communityKey, request.registryCommunity, routePayout.token, 0, independentMinimum)
        );
        return payoutCall;
    }

    function _validateSourceCalls(SquidCall[] memory calls, SquidQuote memory quote) internal view {
        if (calls.length < 3 || calls.length % 2 == 0) revert UnboundRoute();
        SquidCall memory depositCall = calls[0];
        if (
            depositCall.callType != DEFAULT_CALL || depositCall.target != BASE_WETH
                || depositCall.value != quote.inputAmount || _selector(depositCall.callData) != DEPOSIT_SELECTOR
                || depositCall.callData.length != 4
                || keccak256(depositCall.payload) != keccak256(abi.encode(BASE_WETH, uint256(0)))
        ) revert UnboundRoute();

        address currentToken = BASE_WETH;
        uint256 bridgeAmountMinimum = 0;
        for (uint256 i = 1; i < calls.length; i += 2) {
            SquidCall memory swapCall = calls[i + 1];
            _validateApproval(calls[i], currentToken, swapCall.target, type(uint256).max, DEFAULT_CALL);
            address recipient = i + 2 == calls.length ? squidRouter : SQUID_MULTICALL;
            (currentToken, bridgeAmountMinimum) = _validateSwap(swapCall, currentToken, recipient, 8453);
        }
        if (currentToken != BASE_AXL_USDC) revert UnboundRoute();
        _validateSourceOutputFloor(quote.inputAmount, bridgeAmountMinimum);
    }

    function _validateDestinationSwaps(
        SquidCall[] memory calls,
        address currentToken,
        uint256 terminalIndex,
        uint256 destinationChainId,
        uint256 requiredOutputMinimum
    ) internal view returns (address) {
        if (terminalIndex < 1 || (terminalIndex - 1) % 2 != 0) revert UnboundRoute();
        uint256 finalSwapMinimum;
        for (uint256 i = 1; i < terminalIndex; i += 2) {
            SquidCall memory swapCall = calls[i + 1];
            _validateApproval(calls[i], currentToken, swapCall.target, type(uint256).max, DEFAULT_CALL);
            (currentToken, finalSwapMinimum) =
                _validateSwap(swapCall, currentToken, SQUID_MULTICALL, destinationChainId);
        }
        if (finalSwapMinimum < requiredOutputMinimum) {
            revert InsufficientOutput(finalSwapMinimum, requiredOutputMinimum);
        }
        return currentToken;
    }

    function _validateApproval(
        SquidCall memory approvalCall,
        address token,
        address spender,
        uint256 amount,
        uint8 callType
    ) internal pure {
        if (
            approvalCall.callType != callType || approvalCall.target != token || approvalCall.value != 0
                || _selector(approvalCall.callData) != APPROVE_SELECTOR
                || keccak256(approvalCall.payload) != keccak256(abi.encode(token, uint256(1)))
        ) revert UnboundRoute();
        (address routeSpender, uint256 routeAmount) =
            abi.decode(_withoutSelector(approvalCall.callData), (address, uint256));
        if (routeSpender != spender || routeAmount != amount) revert UnboundRoute();
    }

    function _validateSwap(SquidCall memory swapCall, address tokenIn, address recipient, uint256 chainId)
        internal
        view
        returns (address tokenOut, uint256 amountOutMinimum)
    {
        if (
            swapCall.callType != FULL_TOKEN_BALANCE || swapCall.value != 0
                || !allowedSwapTargets[chainId][swapCall.target]
        ) revert UnboundRoute();
        bytes4 selector = _selector(swapCall.callData);
        // Every supported selector below assigns the complete swap description.
        // slither-disable-next-line uninitialized-local
        SwapDetails memory swap;
        if (selector == EXACT_INPUT_SINGLE_SELECTOR) {
            swap = _decodeExactInputSingle(swapCall.callData);
        } else if (selector == EXACT_INPUT_SINGLE_WITH_DEADLINE_SELECTOR) {
            swap = _decodeExactInputSingleWithDeadline(swapCall.callData);
        } else if (selector == UNIVERSAL_ROUTER_EXECUTE_SELECTOR) {
            swap = _decodeUniversalRouterSwap(swapCall.callData);
        } else if (selector == CELO_ROUTER_SWAP_SELECTOR) {
            swap = _decodeCeloRouterSwap(swapCall.callData);
        } else if (selector == V2_ROUTER_SWAP_SELECTOR) {
            swap = _decodeV2RouterSwap(swapCall.callData);
        } else {
            revert UnboundRoute();
        }
        if (swap.tokenIn != tokenIn || swap.tokenOut == address(0) || swap.tokenIn == swap.tokenOut) {
            revert UnboundRoute();
        }
        if (swap.recipient != recipient || swap.amountIn == 0 || swap.amountOutMinimum == 0) revert UnboundRoute();
        if (keccak256(swapCall.payload) != keccak256(abi.encode(swap.tokenIn, swap.inputPosition))) {
            revert UnboundRoute();
        }
        return (swap.tokenOut, swap.amountOutMinimum);
    }

    function _validateSourceOutputFloor(uint256 inputAmount, uint256 bridgeAmountMinimum) internal view {
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            IAggregatorV3(BASE_ETH_USD_FEED).latestRoundData();
        uint8 decimals = IAggregatorV3(BASE_ETH_USD_FEED).decimals();
        if (
            answer <= 0 || decimals > 18 || startedAt == 0 || updatedAt < startedAt || answeredInRound < roundId
                || updatedAt > block.timestamp || block.timestamp - updatedAt > MAX_ETH_USD_PRICE_AGE
        ) revert InvalidPriceFeed();

        uint256 usdValueInBridgeDecimals = Math.mulDiv(inputAmount, uint256(answer), 10 ** (uint256(decimals) + 12));
        uint256 requiredMinimum =
            Math.mulDiv(usdValueInBridgeDecimals, BPS_DENOMINATOR - MAX_SOURCE_SLIPPAGE_BPS, BPS_DENOMINATOR);
        if (bridgeAmountMinimum < requiredMinimum) {
            revert InsufficientSourceOutput(bridgeAmountMinimum, requiredMinimum);
        }
    }

    function _minimumDestinationOutput(uint256 inputAmount) internal pure returns (uint256) {
        return Math.mulDiv(inputAmount, BPS_DENOMINATOR - MAX_DESTINATION_SLIPPAGE_BPS, BPS_DENOMINATOR);
    }

    function _decodeExactInputSingle(bytes memory callData) internal pure returns (SwapDetails memory swap) {
        bytes memory arguments = _withoutSelector(callData);
        (swap.tokenIn, swap.tokenOut,, swap.recipient) = abi.decode(arguments, (address, address, uint24, address));
        (swap.amountIn, swap.amountOutMinimum,) =
            abi.decode(_slice(arguments, 4 * 32, 3 * 32), (uint256, uint256, uint160));
        swap.inputPosition = 4;
    }

    function _decodeExactInputSingleWithDeadline(bytes memory callData)
        internal
        view
        returns (SwapDetails memory swap)
    {
        bytes memory arguments = _withoutSelector(callData);
        uint256 deadline;
        (swap.tokenIn, swap.tokenOut,, swap.recipient) = abi.decode(arguments, (address, address, uint24, address));
        (deadline, swap.amountIn, swap.amountOutMinimum,) =
            abi.decode(_slice(arguments, 4 * 32, 4 * 32), (uint256, uint256, uint256, uint160));
        if (deadline < block.timestamp) revert UnboundRoute();
        swap.inputPosition = 5;
    }

    function _decodeUniversalRouterSwap(bytes memory callData) internal view returns (SwapDetails memory swap) {
        bytes memory commands;
        bytes[] memory inputs;
        uint256 deadline;
        (commands, inputs, deadline) = abi.decode(_withoutSelector(callData), (bytes, bytes[], uint256));
        if (commands.length != 1 || uint8(commands[0]) & 0x3f != 0 || inputs.length != 1 || deadline < block.timestamp)
        {
            revert UnboundRoute();
        }
        bytes memory path;
        bool payerIsUser;
        (swap.recipient, swap.amountIn, swap.amountOutMinimum, path, payerIsUser) =
            abi.decode(inputs[0], (address, uint256, uint256, bytes, bool));
        if (!payerIsUser || path.length < 43 || (path.length - 20) % 23 != 0) revert UnboundRoute();
        swap.tokenIn = _pathToken(path, 0);
        swap.tokenOut = _pathToken(path, path.length - 20);
        swap.inputPosition = 9;
    }

    function _decodeCeloRouterSwap(bytes memory callData) internal view returns (SwapDetails memory swap) {
        CeloDexRoute[] memory routes;
        uint256 deadline;
        (swap.amountIn, swap.amountOutMinimum, routes, swap.recipient, deadline) =
            abi.decode(_withoutSelector(callData), (uint256, uint256, CeloDexRoute[], address, uint256));
        if (routes.length == 0 || deadline < block.timestamp) revert UnboundRoute();
        swap.tokenIn = routes[0].from;
        swap.tokenOut = routes[routes.length - 1].to;
        for (uint256 i; i < routes.length; ++i) {
            if (routes[i].from == address(0) || routes[i].to == address(0) || routes[i].factory == address(0)) {
                revert UnboundRoute();
            }
            if (i != 0 && routes[i - 1].to != routes[i].from) revert UnboundRoute();
        }
        swap.inputPosition = 0;
    }

    function _decodeV2RouterSwap(bytes memory callData) internal view returns (SwapDetails memory swap) {
        address[] memory path;
        uint256 deadline;
        (swap.amountIn, swap.amountOutMinimum, path, swap.recipient, deadline) =
            abi.decode(_withoutSelector(callData), (uint256, uint256, address[], address, uint256));
        if (path.length < 2 || deadline < block.timestamp) revert UnboundRoute();
        swap.tokenIn = path[0];
        swap.tokenOut = path[path.length - 1];
        for (uint256 i; i < path.length; ++i) {
            if (path[i] == address(0)) revert UnboundRoute();
        }
        swap.inputPosition = 0;
    }

    function _validateWithdraw(SquidCall memory withdrawCall, address token, uint256 destinationChainId) internal pure {
        if (
            token != _destinationOutputToken(destinationChainId) || withdrawCall.callType != FULL_TOKEN_BALANCE
                || withdrawCall.target != token || withdrawCall.value != 0
                || _selector(withdrawCall.callData) != WITHDRAW_SELECTOR
                || abi.decode(_withoutSelector(withdrawCall.callData), (uint256)) != 0
                || keccak256(withdrawCall.payload) != keccak256(abi.encode(token, uint256(0)))
        ) revert UnboundRoute();
    }

    function _destinationChainHash(uint256 destinationChainId) internal pure returns (bytes32) {
        if (destinationChainId == 1) return keccak256("Ethereum");
        if (destinationChainId == 10) return keccak256("optimism");
        if (destinationChainId == 137) return keccak256("Polygon");
        if (destinationChainId == 42161) return keccak256("Arbitrum");
        if (destinationChainId == 42220) return keccak256("celo");
        revert UnboundRoute();
    }

    function _setDefaultSwapTargets() internal {
        allowedSwapTargets[8453][0x2626664c2603336E57B271c5C0b26F421741e481] = true;
        allowedSwapTargets[8453][0x6Cb442acF35158D5eDa88fe602221b67B400Be3E] = true;
        allowedSwapTargets[8453][0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86] = true;
        allowedSwapTargets[1][0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45] = true;
        allowedSwapTargets[10][0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45] = true;
        allowedSwapTargets[137][0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45] = true;
        allowedSwapTargets[42161][0x32226588378236Fd0c7c4053999F88aC0e5cAc77] = true;
        allowedSwapTargets[42161][0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45] = true;
        allowedSwapTargets[42220][0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6] = true;
        allowedSwapTargets[42220][0x1421bDe4B10e8dd459b3BCb598810B1337D56842] = true;
        allowedSwapTargets[42220][0x5615CDAb10dc425a742d643d949a7F474C01abc4] = true;
    }

    function _supportsNativeOutput(uint256 destinationChainId) internal pure returns (bool) {
        return destinationChainId == 1 || destinationChainId == 10 || destinationChainId == 42161;
    }

    function _destinationOutputToken(uint256 destinationChainId) internal pure returns (address) {
        if (destinationChainId == 1) return 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        if (destinationChainId == 10) return 0x4200000000000000000000000000000000000006;
        if (destinationChainId == 137) return 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
        if (destinationChainId == 42161) return 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        if (destinationChainId == 42220) return 0x2DEf4285787d58a2f811AF24755A8150622f4361;
        revert UnboundRoute();
    }

    function _destinationBridgeToken(uint256 destinationChainId) internal pure returns (address) {
        if (destinationChainId == 1) return 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        if (destinationChainId == 10 || destinationChainId == 42161 || destinationChainId == 42220) {
            return 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
        }
        if (destinationChainId == 137) return 0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed;
        revert UnboundRoute();
    }

    function _pathToken(bytes memory path, uint256 offset) internal pure returns (address token) {
        assembly {
            token := shr(96, mload(add(add(path, 0x20), offset)))
        }
    }

    function _decodeRoute(bytes memory routeArguments) internal pure returns (SquidRoute memory route) {
        // `callBridgeCall` encodes the tuple fields as separate arguments. Add
        // the dynamic tuple offset expected when decoding those fields as a struct.
        route = abi.decode(bytes.concat(bytes32(uint256(32)), routeArguments), (SquidRoute));
    }

    function _parseAddress(string memory value) internal pure returns (address parsed) {
        bytes memory text = bytes(value);
        if (text.length != 42 || text[0] != "0" || (text[1] != "x" && text[1] != "X")) revert UnboundRoute();

        uint160 result;
        for (uint256 i = 2; i < 42; ++i) {
            uint8 char = uint8(text[i]);
            uint8 nibble = 0;
            if (char >= 48 && char <= 57) nibble = char - 48;
            else if (char >= 65 && char <= 70) nibble = char - 55;
            else if (char >= 97 && char <= 102) nibble = char - 87;
            else revert UnboundRoute();
            result = (result << 4) | uint160(nibble);
        }
        parsed = address(result);
    }

    function _selector(bytes memory data) internal pure returns (bytes4 selector) {
        if (data.length < 4) return bytes4(0);
        assembly {
            selector := mload(add(data, 0x20))
        }
    }

    function _withoutSelector(bytes memory data) internal pure returns (bytes memory result) {
        if (data.length < 4) revert UnboundRoute();
        return _slice(data, 4, data.length - 4);
    }

    function _slice(bytes memory data, uint256 start, uint256 length) internal pure returns (bytes memory result) {
        if (data.length < start + length) revert UnboundRoute();
        result = new bytes(length);
        assembly {
            let source := add(add(data, 0x20), start)
            let destination := add(result, 0x20)
            for { let offset := 0 } lt(offset, length) { offset := add(offset, 0x20) } {
                mstore(add(destination, offset), mload(add(source, offset)))
            }
        }
    }
}

interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
