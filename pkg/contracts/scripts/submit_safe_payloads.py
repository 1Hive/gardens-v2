#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

import requests
from eth_abi import encode as abi_encode
from eth_account import Account
from eth_utils import keccak, to_checksum_address


SAFE_TX_TYPEHASH = keccak(
    text=(
        "SafeTx(address to,uint256 value,bytes data,uint8 operation,"
        "uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,"
        "address refundReceiver,uint256 nonce)"
    )
)
DOMAIN_SEPARATOR_TYPEHASH = keccak(text="EIP712Domain(uint256 chainId,address verifyingContract)")
MULTISEND_SELECTOR = keccak(text="multiSend(bytes)")[:4]


SAFE_SERVICE_URLS = {
    "arbitrum": "https://safe-transaction-arbitrum.safe.global",
    "optimism": "https://safe-transaction-optimism.safe.global",
    "polygon": "https://safe-transaction-polygon.safe.global",
    "gnosis": "https://safe-transaction-gnosis-chain.safe.global",
    "base": "https://safe-transaction-base.safe.global",
    "celo": "https://safe-transaction-celo.safe.global",
}

SAFE_APP_PREFIX = {
    "arbitrum": "arb1",
    "optimism": "oeth",
    "polygon": "matic",
    "gnosis": "gno",
    "base": "base",
    "celo": "celo",
}

MULTISEND_CALL_ONLY_BY_VERSION = {
    "1.3.0": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
    "1.3.1": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
    "1.4.1": "0x9641d764fc13c8B624c04430C7356C1C7C8102e2",
}


def _hex_to_bytes(value: str) -> bytes:
    if value.startswith("0x"):
        return bytes.fromhex(value[2:])
    return bytes.fromhex(value)


def _encode_multisend(transactions):
    packed = b""
    for tx in transactions:
        op = int(tx.get("operation", 0))
        to = bytes.fromhex(tx["to"][2:])
        value = int(tx.get("value", "0"))
        data = _hex_to_bytes(tx.get("data", "0x"))
        packed += (
            op.to_bytes(1, "big")
            + to
            + value.to_bytes(32, "big")
            + len(data).to_bytes(32, "big")
            + data
        )
    encoded = abi_encode(["bytes"], [packed])
    return "0x" + (MULTISEND_SELECTOR + encoded).hex()


def _safe_tx_hash(
    chain_id,
    safe_address,
    to,
    value,
    data,
    operation,
    safe_tx_gas,
    base_gas,
    gas_price,
    gas_token,
    refund_receiver,
    nonce,
):
    data_hash = keccak(_hex_to_bytes(data))
    tx_hash = keccak(
        abi_encode(
            [
                "bytes32",
                "address",
                "uint256",
                "bytes32",
                "uint8",
                "uint256",
                "uint256",
                "uint256",
                "address",
                "address",
                "uint256",
            ],
            [
                SAFE_TX_TYPEHASH,
                to_checksum_address(to),
                value,
                data_hash,
                operation,
                safe_tx_gas,
                base_gas,
                gas_price,
                to_checksum_address(gas_token),
                to_checksum_address(refund_receiver),
                nonce,
            ],
        )
    )
    domain_separator = keccak(
        abi_encode(
            ["bytes32", "uint256", "address"],
            [DOMAIN_SEPARATOR_TYPEHASH, chain_id, to_checksum_address(safe_address)],
        )
    )
    return keccak(b"\x19\x01" + domain_separator + tx_hash)


def _get_safe_info(base_url, safe_address):
    resp = requests.get(f"{base_url}/api/v1/safes/{safe_address}/", timeout=30)
    resp.raise_for_status()
    return resp.json()


def _get_pending_nonce_info(base_url, safe_address):
    resp = requests.get(
        f"{base_url}/api/v1/safes/{safe_address}/multisig-transactions/",
        params={
            "executed": "false",
            "ordering": "-nonce",
            "limit": "50",
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    results = data.get("results", [])
    if not results:
        return 0, None
    max_pending = max(tx.get("nonce", 0) for tx in results)
    return len(results), max_pending


def _post_safe_tx(base_url, safe_address, payload):
    resp = requests.post(
        f"{base_url}/api/v1/safes/{safe_address}/multisig-transactions/",
        json=payload,
        timeout=60,
    )
    if resp.status_code not in (200, 201, 202):
        raise RuntimeError(f"{resp.status_code}: {resp.text}")
    try:
        return resp.json()
    except ValueError:
        return {"status": resp.status_code, "text": resp.text}


def _load_private_key(keystore_path, password_env):
    password = os.environ.get(password_env)
    if not password:
        raise RuntimeError(f"Missing {password_env} env var for keystore password.")
    key_data = json.loads(Path(keystore_path).read_text())
    priv_key = Account.decrypt(key_data, password)
    acct = Account.from_key(priv_key)
    return acct


def _resolve_multisend_address(version, override):
    if override:
        return override
    return MULTISEND_CALL_ONLY_BY_VERSION.get(version, MULTISEND_CALL_ONLY_BY_VERSION["1.3.0"])


def main():
    parser = argparse.ArgumentParser(description="Submit Safe Transaction Builder payloads.")
    parser.add_argument("--safe", required=True, help="Safe address")
    parser.add_argument("--keystore", required=True, help="Keystore file path")
    parser.add_argument("--password-env", default="SAFE_KEYSTORE_PASSWORD", help="Env var for keystore password")
    parser.add_argument(
        "--payload-dir",
        default=str(Path(__file__).resolve().parents[1] / "transaction-builder"),
        help="Directory containing payload JSON files",
    )
    parser.add_argument(
        "--chains",
        default="arbitrum,optimism,polygon,gnosis,base,celo",
        help="Comma-separated list of chains to submit",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=int(os.environ.get("CHUNK_SIZE", "40")),
        help="Transactions per Safe batch",
    )
    parser.add_argument(
        "--start-nonce",
        type=int,
        default=-1,
        help="Override Safe nonce (useful if you want to force a specific start nonce)",
    )
    parser.add_argument(
        "--multisend-call-only",
        default="",
        help="Override MultiSendCallOnly address (optional)",
    )
    parser.add_argument("--origin", default="gardens-v2 batch upgrade", help="Origin label for Safe service")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Submit even if a pending transaction exists at the current Safe nonce",
    )
    parser.add_argument(
        "--skip-pending",
        action="store_true",
        help="Skip existing pending nonces and start after the highest pending nonce",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Use sandbox Safe address for testing",
    )
    args = parser.parse_args()

    context_safe = to_checksum_address(args.safe)
    safe_address = context_safe
    if args.test:
        safe_address = to_checksum_address("0xD7d5AEDb6faf61CD17E395D586a7C9B365e685cD")
    acct = _load_private_key(args.keystore, args.password_env)
    chains = [c.strip() for c in args.chains.split(",") if c.strip()]
    payload_dir = Path(args.payload_dir)

    for chain in chains:
        base_url = SAFE_SERVICE_URLS.get(chain)
        if not base_url:
            print(f"{chain}: no Safe service URL configured", file=sys.stderr)
            continue

        payload_path = payload_dir / f"{chain}-payload.json"
        if not payload_path.exists():
            print(f"{chain}: missing payload {payload_path}", file=sys.stderr)
            continue

        payload_json = json.loads(payload_path.read_text())
        all_txs = payload_json.get("transactions", [])
        if not all_txs:
            print(f"{chain}: payload has no transactions", file=sys.stderr)
            continue

        safe_info = _get_safe_info(base_url, context_safe)
        version = safe_info.get("version", "1.3.0")
        multisend_call_only = _resolve_multisend_address(version, args.multisend_call_only)

        chunks = [all_txs[i : i + args.chunk_size] for i in range(0, len(all_txs), args.chunk_size)]
        if not chunks:
            print(f"{chain}: no chunks to submit", file=sys.stderr)
            continue

        current_nonce = int(safe_info["nonce"])
        pending_count, max_pending = _get_pending_nonce_info(base_url, context_safe)
        if args.start_nonce >= 0:
            base_nonce = args.start_nonce
            print(f"{chain}: using start nonce override {base_nonce}")
        elif args.force:
            # Force means ignore pending queue and start from last executed nonce
            base_nonce = current_nonce
            if max_pending is not None and max_pending >= current_nonce:
                print(
                    f"{chain}: force enabled, pending txs detected ({pending_count}), "
                    f"submitting replacements starting at executed nonce {base_nonce}"
                )
            else:
                print(f"{chain}: force enabled, starting at executed nonce {base_nonce}")
        elif args.skip_pending:
            if max_pending is not None and max_pending >= current_nonce:
                base_nonce = max_pending + 1
                print(f"{chain}: pending txs detected, skipping to nonce {base_nonce}")
            else:
                base_nonce = current_nonce
        else:
            base_nonce = current_nonce
            if max_pending is not None and max_pending >= current_nonce:
                print(
                    f"{chain}: pending txs detected ({pending_count}), "
                    f"submitting replacements starting at executed nonce {base_nonce}"
                )

        for idx, txs in enumerate(chunks, start=1):
            safe_nonce = base_nonce + (idx - 1)

            multisend_data = _encode_multisend(txs)
            chain_id = int(payload_json["chainId"])

            safe_tx = {
                "to": to_checksum_address(multisend_call_only),
                "value": 0,
                "data": multisend_data,
                "operation": 1,  # delegatecall
                "safeTxGas": 0,
                "baseGas": 0,
                "gasPrice": 0,
                "gasToken": "0x0000000000000000000000000000000000000000",
                "refundReceiver": "0x0000000000000000000000000000000000000000",
                "nonce": safe_nonce,
            }

            safe_tx_hash = _safe_tx_hash(
                chain_id,
                safe_address,
                safe_tx["to"],
                safe_tx["value"],
                safe_tx["data"],
                safe_tx["operation"],
                safe_tx["safeTxGas"],
                safe_tx["baseGas"],
                safe_tx["gasPrice"],
                safe_tx["gasToken"],
                safe_tx["refundReceiver"],
                safe_tx["nonce"],
            )

            signature = acct.signHash(safe_tx_hash).signature.hex()
            safe_tx_hash_hex = "0x" + safe_tx_hash.hex()

            request_payload = {
                "safe": safe_address,
                "to": safe_tx["to"],
                "value": str(safe_tx["value"]),
                "data": safe_tx["data"],
                "operation": safe_tx["operation"],
                "safeTxGas": safe_tx["safeTxGas"],
                "baseGas": safe_tx["baseGas"],
                "gasPrice": safe_tx["gasPrice"],
                "gasToken": safe_tx["gasToken"],
                "refundReceiver": safe_tx["refundReceiver"],
                "nonce": safe_tx["nonce"],
                "contractTransactionHash": safe_tx_hash_hex,
                "sender": acct.address,
                "signature": signature,
                "origin": args.origin,
            }

            try:
                _post_safe_tx(base_url, safe_address, request_payload)
                prefix = SAFE_APP_PREFIX.get(chain, chain)
                tx_id = f"multisig_{safe_address}_{safe_tx_hash_hex}"
                link = f"https://app.safe.global/transactions/tx?safe={prefix}:{safe_address}&id={tx_id}"
                if args.test:
                    print(f"{chain}: submitted part {idx}/{len(chunks)} (nonce {safe_nonce}) [test safe]")
                else:
                    print(f"{chain}: submitted part {idx}/{len(chunks)} (nonce {safe_nonce})")
                print(link)
            except Exception as exc:
                print(f"{chain}: submit failed: {exc}", file=sys.stderr)
                break


if __name__ == "__main__":
    main()
