"use client";

import React, { useState } from "react";
import { useContractWrite, useAccount, useChainId } from "wagmi";
import { parseAbi, formatUnits, Address } from "viem";
import { TokenGarden } from "#/subgraph/.graphclient";

interface FaucetProps {
  token: TokenGarden;
}

const MINT_AMMOUNT = 1000n;

export default function TokenGardenFaucet({ token }: FaucetProps) {
  const chain = useChainId();
  const { address: connectedAccount } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const mintAmount = MINT_AMMOUNT * 10n ** BigInt(token.decimals);

  const erc20MintAbi = ["function mint(address to, uint256 amount) public"];
  const { writeAsync } = useContractWrite({
    address: token.id as Address,
    abi: parseAbi(erc20MintAbi),
    functionName: "mint",
    chainId: chain,
    account: connectedAccount,
    onSuccess: () => {
      const formattedAmount = formatUnits(mintAmount, token.decimals);
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
        "⛽:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  return connectedAccount ? (
    <div className="fixed bottom-0 right-0 pb-3">
      <button
        onClick={() => requestTokens()}
        disabled={isLoading}
        title={`Get some test ${token.symbol}`}
      >
        {isLoading ? <div className="loading-spinner"></div> : "⛽"}
      </button>
    </div>
  ) : (
    <></>
  );
}