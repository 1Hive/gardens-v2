import { describe, expect, it } from "vitest";
import {
  BaseError,
  CallExecutionError,
  ContractFunctionExecutionError,
  TimeoutError,
  TransactionExecutionError,
  UserRejectedRequestError,
  parseAbi,
} from "viem";
import { shouldRetryWithWalletClient } from "./shouldRetryWithWalletClient";

const address = "0x0000000000000000000000000000000000000001";
const abi = parseAbi([
  "function disputeProposal(uint256,string,bytes) payable",
]);
const contractError = (cause: BaseError) =>
  new ContractFunctionExecutionError(cause, {
    abi,
    functionName: "disputeProposal",
    args: [1n, "reason", "0x00"],
    contractAddress: address,
  });
const timeoutError = () =>
  new TimeoutError({
    url: "https://rpc.example",
    body: { method: "eth_call" },
  });

describe("shouldRetryWithWalletClient", () => {
  it("falls back when the public RPC times out during contract simulation", () => {
    const error = contractError(
      new CallExecutionError(timeoutError(), { to: address }),
    );
    expect(shouldRetryWithWalletClient(error)).toBe(true);
  });

  it("does not retry an ambiguous submission timeout", () => {
    const error = contractError(
      new TransactionExecutionError(timeoutError(), {
        account: { address, type: "json-rpc" },
        to: address,
      }),
    );
    expect(shouldRetryWithWalletClient(error)).toBe(false);
  });

  it("does not retry a timeout without evidence that it was preflight", () => {
    expect(shouldRetryWithWalletClient(timeoutError())).toBe(false);
    expect(shouldRetryWithWalletClient(contractError(timeoutError()))).toBe(
      false,
    );
  });

  it("does not retry a contract revert", () => {
    const error = contractError(
      new CallExecutionError(new BaseError("execution reverted"), {}),
    );
    expect(shouldRetryWithWalletClient(error)).toBe(false);
  });

  it("does not retry a rejected wallet request", () => {
    expect(
      shouldRetryWithWalletClient(
        new UserRejectedRequestError(new Error("Rejected")),
      ),
    ).toBe(false);
  });

  it("preserves fallback for existing fetch failures", () => {
    expect(shouldRetryWithWalletClient(new Error("Failed to fetch"))).toBe(
      true,
    );
    expect(shouldRetryWithWalletClient(new Error("HTTP request failed"))).toBe(
      true,
    );
  });
});
