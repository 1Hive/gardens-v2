// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IBridgeAdapter, BridgeRequest} from "./interfaces/IBridgeAdapter.sol";

/// @notice Router-configured, replaceable bridge adapter for Squid. Not
/// upgradeable itself — the router assigns adapter deployments independently
/// for each destination chain.
///
/// Squid route calldata is produced by the off-chain Squid v2 API. The
/// adapter pins the only callable target to Squid's canonical router and
/// forwards the vault revenue as native value. Route execution remains
/// keeper-only through GardensMarkeeRouter.
contract SquidBridgeAdapter is Ownable, IBridgeAdapter {
    struct SquidQuote {
        uint256 inputAmount;
        uint256 expectedAmountOut;
        uint256 executionValue;
        bytes routerCalldata;
    }

    address public router;
    address public immutable squidRouter;
    uint256 public transferNonce;

    event RouterUpdated(address indexed router);
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
    error InsufficientOutput(uint256 expected, uint256 minimum);
    error RefundFailed();
    error SquidCallFailed(bytes reason);

    modifier onlyRouter() {
        if (msg.sender != router) {
            revert NotRouter();
        }
        _;
    }

    /// @dev `_router` may be the zero address at construction time to break
    /// the router/adapter deployment cycle (the router itself requires a
    /// non-zero adapter at `initialize`) — `onlyRouter` blocks every caller
    /// until the real router is wired via `setRouter`, so this is safe by
    /// default.
    constructor(address _router, address _squidRouter) {
        if (_squidRouter == address(0)) revert ZeroAddress();
        router = _router;
        squidRouter = _squidRouter;
    }

    function setRouter(address _router) external onlyOwner {
        if (_router == address(0)) {
            revert ZeroAddress();
        }
        router = _router;
        emit RouterUpdated(_router);
    }

    /// @inheritdoc IBridgeAdapter
    function bridgeETH(BridgeRequest calldata request, bytes calldata quoteData)
        external
        payable
        onlyRouter
        returns (bytes32 transferId, uint256 expectedAmountOut)
    {
        if (msg.value == 0) {
            revert ZeroValue();
        }
        if (request.destinationReceiver == address(0) || request.refundRecipient == address(0)) {
            revert ZeroAddress();
        }

        SquidQuote memory quote = abi.decode(quoteData, (SquidQuote));
        if (
            quote.inputAmount == 0 || quote.expectedAmountOut == 0 || quote.executionValue < quote.inputAmount
                || quote.executionValue > msg.value || quote.routerCalldata.length < 4
        ) revert InvalidQuote();
        if (quote.expectedAmountOut < request.minAmountOut) {
            revert InsufficientOutput(quote.expectedAmountOut, request.minAmountOut);
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
                quote.expectedAmountOut,
                keccak256(quote.routerCalldata)
            )
        );

        uint256 surplus = msg.value - quote.executionValue;
        if (surplus != 0) {
            (bool refunded,) = payable(request.refundRecipient).call{value: surplus}("");
            if (!refunded) revert RefundFailed();
        }

        (bool success, bytes memory result) = squidRouter.call{value: quote.executionValue}(quote.routerCalldata);
        if (!success) revert SquidCallFailed(result);

        expectedAmountOut = quote.expectedAmountOut;
        emit SquidRouteExecuted(
            transferId,
            request.destinationChainId,
            request.destinationReceiver,
            quote.inputAmount,
            expectedAmountOut,
            keccak256(quote.routerCalldata)
        );
    }
}
