// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

abstract contract Enum {
    enum Operation {
        Call,
        DelegateCall
    }
}

interface ISafe {
    /**
     * @notice Executes a `operation` {0: Call, 1: DelegateCall}} transaction to `to` with `value` (Native Currency)
     *          and pays `gasPrice` * `gasLimit` in `gasToken` token to `refundReceiver`.
     * @dev The fees are always transferred, even if the user transaction fails.
     *      This method doesn't perform any sanity check of the transaction, such as:
     *      - if the contract at `to` address has code or not
     *      - if the `gasToken` is a contract or not
     *      It is the responsibility of the caller to perform such checks.
     * @param to Destination address of Safe transaction.
     * @param value Ether value of Safe transaction.
     * @param data Data payload of Safe transaction.
     * @param operation Operation type of Safe transaction.
     * @param safeTxGas Gas that should be used for the Safe transaction.
     * @param baseGas Gas costs that are independent of the transaction execution(e.g. base transaction fee, signature check, payment of the refund)
     * @param gasPrice Gas price that should be used for the payment calculation.
     * @param gasToken Token address (or 0 if ETH) that is used for the payment.
     * @param refundReceiver Address of receiver of gas payment (or 0 if tx.origin).
     * @param signatures Signature data that should be verified.
     *                   Can be packed ECDSA signature ({bytes32 r}{bytes32 s}{uint8 v}), contract signature (EIP-1271) or approved hash.
     * @return success Boolean indicating transaction's success.
     */

    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures
    ) external payable returns (bool success);
}
