// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IBridgeAdapter, BridgeRequest} from "./interfaces/IBridgeAdapter.sol";

/// @notice Router-configured, replaceable bridge adapter for Squid. Not
/// upgradeable itself — the router simply points `bridgeAdapter` at a new
/// deployment via `setBridgeAdapter` if the adapter needs to change.
///
/// V1 status: parameter validation and access control are fully implemented,
/// but the outbound Squid call is an explicit stub. Squid's exact entrypoint
/// address, integrator-ID-gated route/hook encoding, and refund-address
/// wiring must be confirmed against Squid's real contracts before this can
/// move funds (see plans/MARKEE_INTEGRATION_PLAN.md, "Supported Destinations").
contract SquidBridgeAdapter is Ownable, IBridgeAdapter {
    address public router;

    event RouterUpdated(address indexed router);

    error NotRouter();
    error ZeroAddress();
    error ZeroValue();
    error SquidIntegrationPending();

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
    constructor(address _router) {
        router = _router;
    }

    function setRouter(address _router) external onlyOwner {
        if (_router == address(0)) {
            revert ZeroAddress();
        }
        router = _router;
        emit RouterUpdated(_router);
    }

    /// @inheritdoc IBridgeAdapter
    function bridgeETH(
        BridgeRequest calldata request,
        bytes calldata /* quoteData */
    )
        external
        payable
        onlyRouter
        returns (bytes32, uint256)
    {
        if (msg.value == 0) {
            revert ZeroValue();
        }
        if (request.destinationReceiver == address(0) || request.refundRecipient == address(0)) {
            revert ZeroAddress();
        }

        // TODO(markee): wire the real Squid entrypoint once the ABI, route,
        // and integrator ID are confirmed. quoteData is expected to be
        // fully-encoded calldata produced by the off-chain Squid quote API,
        // forwarded verbatim to Squid's router with msg.value and the vault
        // (request.refundRecipient) as the source-chain refund address.
        revert SquidIntegrationPending();
    }
}
