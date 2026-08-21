// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IBridgeAdapter, BridgeRequest} from "./interfaces/IBridgeAdapter.sol";

interface IAcrossSpokePool {
    function depositV3Now(
        address depositor,
        address recipient,
        address inputToken,
        address outputToken,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 destinationChainId,
        address exclusiveRelayer,
        uint32 fillDeadlineOffset,
        uint32 exclusivityDeadline,
        bytes calldata message
    ) external payable;
}

/// @notice Bridges native ETH through Across V3 and invokes a
/// `GardensRevenueReceiver` on the destination chain.
contract AcrossBridgeAdapter is Ownable, IBridgeAdapter {
    struct AcrossQuote {
        uint256 outputAmount;
        uint32 fillDeadline;
    }

    address public router;
    address public immutable spokePool;
    address public immutable wrappedNativeToken;
    uint256 public transferNonce;
    mapping(uint256 destinationChainId => address outputToken) public destinationTokens;

    event RouterUpdated(address indexed router);
    event DestinationTokenUpdated(uint256 indexed destinationChainId, address indexed outputToken);
    event AcrossDepositCreated(
        bytes32 indexed transferId,
        uint256 indexed destinationChainId,
        address indexed receiver,
        uint256 inputAmount,
        uint256 outputAmount
    );

    error NotRouter();
    error ZeroAddress();
    error ZeroValue();
    error DestinationNotConfigured(uint256 destinationChainId);
    error InvalidQuote();
    error QuoteExpired();
    error InsufficientOutput(uint256 expected, uint256 minimum);

    modifier onlyRouter() {
        if (msg.sender != router) revert NotRouter();
        _;
    }

    constructor(address _router, address _spokePool, address _wrappedNativeToken) {
        if (_spokePool == address(0) || _wrappedNativeToken == address(0)) revert ZeroAddress();
        router = _router;
        spokePool = _spokePool;
        wrappedNativeToken = _wrappedNativeToken;
    }

    function setRouter(address _router) external onlyOwner {
        if (_router == address(0)) revert ZeroAddress();
        router = _router;
        emit RouterUpdated(_router);
    }

    function setDestinationToken(uint256 destinationChainId, address outputToken) external onlyOwner {
        if (outputToken == address(0)) revert ZeroAddress();
        destinationTokens[destinationChainId] = outputToken;
        emit DestinationTokenUpdated(destinationChainId, outputToken);
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

        address outputToken = destinationTokens[request.destinationChainId];
        if (outputToken == address(0)) revert DestinationNotConfigured(request.destinationChainId);

        AcrossQuote memory quote = abi.decode(quoteData, (AcrossQuote));
        if (quote.outputAmount == 0 || quote.outputAmount > msg.value) {
            revert InvalidQuote();
        }
        if (quote.fillDeadline <= block.timestamp) revert QuoteExpired();
        if (quote.outputAmount < request.minAmountOut) {
            revert InsufficientOutput(quote.outputAmount, request.minAmountOut);
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
                msg.value,
                quote.outputAmount
            )
        );

        _deposit(request, quote, outputToken, transferId);

        expectedAmountOut = quote.outputAmount;
        emit AcrossDepositCreated(
            transferId, request.destinationChainId, request.destinationReceiver, msg.value, expectedAmountOut
        );
    }

    function _deposit(BridgeRequest calldata request, AcrossQuote memory quote, address outputToken, bytes32 transferId)
        internal
    {
        bytes memory message = abi.encode(transferId, request.communityKey, request.registryCommunity);
        IAcrossSpokePool(spokePool).depositV3Now{value: msg.value}(
            request.refundRecipient,
            request.destinationReceiver,
            wrappedNativeToken,
            outputToken,
            msg.value,
            quote.outputAmount,
            request.destinationChainId,
            address(0),
            quote.fillDeadline - uint32(block.timestamp),
            0,
            message
        );
    }
}
