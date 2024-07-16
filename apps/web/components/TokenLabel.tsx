import React from "react";
import { ChainIcon, getChain } from "@/configs/chainServer";

type TokenLabelProps = { chainId: string | number };

export function TokenLabel({ chainId }: TokenLabelProps) {
  return (
    <div className="align-center flex h-fit w-fit justify-center rounded-full bg-neutral-soft-2 px-4 py-2">
      <div className="flex content-center justify-center">
        {/* TODO: change Icon library */}
        <ChainIcon chain={chainId} height={19} />
      </div>
      <h6 className="ml-[10px]">{getChain(chainId)?.nativeCurrency.symbol}</h6>
    </div>
  );
}
