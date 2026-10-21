// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IBridgeAdapter, BridgeRequest} from "./interfaces/IBridgeAdapter.sol";
import {LiFiBridgeAdapter} from "./LiFiBridgeAdapter.sol";

/// @notice Replaceable Base -> Gnosis Relay adapter. LI.FI/Relay are trusted
/// settlement providers: Relay's opaque orderId is NOT cryptographically bound
/// to BridgeData by the LI.FI facet. Keeper/provider order integrity is required.
/// This adapter additionally pins the executable calldata, fees, community inbox,
/// source refunds, token, chain and replay protection. It never accepts hooks.
contract LiFiRelayBridgeAdapter is Ownable, ReentrancyGuard, IBridgeAdapter {
    address public immutable router;
    address public immutable liFiDiamond;
    address public immutable destinationReceiver;
    address public immutable destinationToken;
    address public immutable feeCollector;
    address public immutable feeRecipient;
    mapping(bytes32 => address) public communityVaults;
    mapping(bytes32 => bool) public usedOrders;

    struct RelayData {
        bytes32 orderId;
        address depositorAddress;
    }
    event CommunityVaultSet(bytes32 indexed communityKey, address indexed community, address vault);
    event NativeRecovered(address indexed recipient, uint256 amount);
    event RelayRouteStarted(
        bytes32 indexed orderId, bytes32 indexed communityKey, address indexed vault, uint256 amountOut
    );
    error InvalidRoute();
    error NotRouter();

    constructor(
        address router_,
        address diamond_,
        address receiver_,
        address token_,
        address collector_,
        address recipient_
    ) {
        if (
            router_ == address(0) || diamond_ == address(0) || receiver_ == address(0) || token_ == address(0)
                || collector_ == address(0) || recipient_ == address(0)
        ) revert InvalidRoute();
        router = router_;
        liFiDiamond = diamond_;
        destinationReceiver = receiver_;
        destinationToken = token_;
        feeCollector = collector_;
        feeRecipient = recipient_;
    }
    receive() external payable {}

    /// @notice Delayed provider refunds must be reconciled to the affected
    /// community by the owner; they cannot be attributed from a bare ETH transfer.
    function recoverNative(address payable recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert InvalidRoute();
        uint256 amount = address(this).balance;
        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) revert InvalidRoute();
        emit NativeRecovered(recipient, amount);
    }

    /// @dev Owner must verify immutable community/token bindings on Gnosis before configuring.
    function setCommunityVault(address community, address vault) external onlyOwner {
        if (community == address(0) || vault == address(0)) revert InvalidRoute();
        bytes32 key = keccak256(abi.encode(uint256(100), community));
        communityVaults[key] = vault;
        emit CommunityVaultSet(key, community, vault);
    }

    function bridgeETH(BridgeRequest calldata request, bytes calldata quoteData)
        external
        payable
        nonReentrant
        returns (bytes32 transferId, uint256 expectedAmountOut)
    {
        if (msg.sender != router) revert NotRouter();
        LiFiBridgeAdapter.LiFiQuote memory q = abi.decode(quoteData, (LiFiBridgeAdapter.LiFiQuote));
        address vault = communityVaults[request.communityKey];
        if (
            request.destinationChainId != 100 || request.destinationReceiver != destinationReceiver
                || request.refundRecipient == address(0)
                || request.communityKey != keccak256(abi.encode(uint256(100), request.registryCommunity))
                || vault == address(0) || q.destinationToken != destinationToken || q.inputAmount == 0
                || q.executionValue != q.inputAmount || msg.value < q.executionValue || q.expectedAmountOut == 0
                || q.expectedAmountOut < request.minAmountOut || q.expectedAmountOut > q.inputAmount
                || bytes4(q.routerCalldata) != bytes4(0xa3443faa)
        ) revert InvalidRoute();
        (LiFiBridgeAdapter.BridgeData memory b, LiFiBridgeAdapter.SwapData[] memory swaps, RelayData memory relay) =
            abi.decode(_args(q.routerCalldata), (LiFiBridgeAdapter.BridgeData, LiFiBridgeAdapter.SwapData[], RelayData));
        if (
            b.receiver != vault || b.destinationChainId != 100 || b.sendingAssetId != address(0) || b.hasDestinationCall
                || !b.hasSourceSwaps || keccak256(bytes(b.bridge)) != keccak256("relaydepository")
                || keccak256(bytes(b.integrator)) != keccak256("gardens") || relay.depositorAddress != address(this)
                || relay.orderId == bytes32(0) || usedOrders[relay.orderId] || swaps.length != 1
        ) revert InvalidRoute();
        LiFiBridgeAdapter.SwapData memory s = swaps[0];
        if (
            s.callTo != feeCollector || s.approveTo != feeCollector || s.sendingAssetId != address(0)
                || s.receivingAssetId != address(0) || s.fromAmount != q.inputAmount || !s.requiresDeposit
                || bytes4(s.callData) != bytes4(keccak256("forwardNativeFees((address,uint256)[])"))
        ) revert InvalidRoute();
        LiFiBridgeAdapter.NativeFee[] memory fees = abi.decode(_args(s.callData), (LiFiBridgeAdapter.NativeFee[]));
        if (
            fees.length != 1 || fees[0].recipient != feeRecipient || fees[0].amount > q.inputAmount / 20
                || b.minAmount != q.inputAmount - fees[0].amount || q.expectedAmountOut > b.minAmount
        ) revert InvalidRoute();
        usedOrders[relay.orderId] = true;
        uint256 beforeBalance = address(this).balance - msg.value;
        (bool ok,) = liFiDiamond.call{value: q.executionValue}(q.routerCalldata);
        if (!ok) revert InvalidRoute();
        uint256 refund = address(this).balance - beforeBalance;
        if (refund != 0) {
            (ok,) = payable(request.refundRecipient).call{value: refund}("");
            if (!ok) revert InvalidRoute();
        }
        emit RelayRouteStarted(relay.orderId, request.communityKey, vault, q.expectedAmountOut);
        return (relay.orderId, q.expectedAmountOut);
    }

    function _args(bytes memory data) private pure returns (bytes memory result) {
        if (data.length < 4) revert InvalidRoute();
        result = new bytes(data.length - 4);
        for (uint256 i; i < result.length; ++i) {
            result[i] = data[i + 4];
        }
    }
}
