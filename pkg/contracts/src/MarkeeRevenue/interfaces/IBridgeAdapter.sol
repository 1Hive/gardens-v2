// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice A bridge request describes where community revenue is headed and
/// where it should be refunded to if the route fails before delivery.
struct BridgeRequest {
    uint256 destinationChainId;
    address destinationReceiver;
    bytes32 communityKey;
    address registryCommunity;
    address refundRecipient;
    uint256 minAmountOut;
}

/// @notice Generic bridge adapter accepting native ETH only. Protocol
/// specific wrapping, approvals, and calldata stay inside the adapter
/// implementation (e.g. `AcrossBridgeAdapter`).
interface IBridgeAdapter {
    function bridgeETH(BridgeRequest calldata request, bytes calldata quoteData)
        external
        payable
        returns (bytes32 transferId, uint256 expectedAmountOut);
}
