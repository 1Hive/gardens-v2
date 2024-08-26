import React from "react";
import { ChainIcon, getChain } from "@/configs/chains";

type TokenLabelProps = {
  chainId: string | number;
  noSymbol?: boolean;
  classNames?: string;
  iconSize?: number;
};

export function TokenLabel({
  chainId,
  noSymbol = false,
  classNames,
  iconSize = 24,
}: TokenLabelProps) {
  return (
    <div
      className={`items-center flex h-fit w-fit justify-center rounded-full px-4 py-2 ${classNames}`}
    >
      <div className="flex content-center justify-center">
        {/* TODO: change Icon library */}
        <ChainIcon chain={chainId} height={iconSize} />
      </div>
      {!noSymbol && (
        <h6 className="ml-[10px]">
          {getChain(chainId)?.nativeCurrency.symbol}
        </h6>
      )}
    </div>
  );
}
