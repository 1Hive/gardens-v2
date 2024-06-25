import React, { useState } from "react";
import { useContractWrite, useAccount, useNetwork, useChainId } from "wagmi";
import { parseAbi, formatUnits, Address } from "viem";
import LoadingSpinner from "./LoadingSpinner";

interface FaucetProps {
  tokenAddress: Address;
  mintAmount?: bigint;
}

export default function TokenGardenFaucet({
  tokenAddress,
  mintAmount = 10n,
}: FaucetProps) {
  const chain = useChainId();
  const { address: connectedAccount } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const erc20MintAbi = ["function mint(address to, uint256 amount) public"];

  const { writeAsync } = useContractWrite({
    address: tokenAddress,
    abi: parseAbi(erc20MintAbi),
    functionName: "mint",
    chainId: chain,
    account: connectedAccount,
    onSuccess: () => {
      const formattedAmount = formatUnits(mintAmount, 18);
      console.debug(
        `⛽: Minted ${formattedAmount} tokens to ${connectedAccount}!`,
      );
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const requestTokens = async () => {
    if (!connectedAccount) return;
    if (!connectedAccount) {
      console.warn("⛽: No connected account");
      return;
    }
    try {
      setIsLoading(true);
      const tx = await writeAsync?.({
        args: [connectedAccount, mintAmount],
      });
      if (tx) {
        console.debug(`⛽: Transaction sent: ${tx.hash}`);
      } else {
        console.warn("⛽: Transaction could not be prepared.");
      }
    } catch (error) {
      console.error(
        "⛽: ",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  return connectedAccount ? (
    <div className="fixed bottom-0 right-0 pb-3">
      <button onClick={requestTokens} disabled={isLoading}>
        {isLoading ? <LoadingSpinner /> : "⛽"}
      </button>
    </div>
  ) : (
    <></>
  );
}
