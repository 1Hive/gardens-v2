import { ChainIcon, getChain } from "@/configs/chainServer";
import React from "react";

type TokenLabelProps = { chainId: string | number };

export function TokenLabel({ chainId }: TokenLabelProps) {
  console.log(chainId)
  return (
    <div className="align-center flex rounded-full bg-neutral-soft-2 px-4 py-2">
      <div className="flex content-center justify-center">
        {/* TODO: change Icon library */}
        <ChainIcon chain={chainId} height={19} />
      </div>
      <h6 className="ml-[10px]">{getChain(chainId)?.nativeCurrency.symbol}</h6>
    </div>
  );
}
