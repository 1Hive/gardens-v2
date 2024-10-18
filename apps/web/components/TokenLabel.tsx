import React from "react";
import { getChain } from "@/configs/chains";

type TokenLabelProps = {
  chainId: string | number;
  noSymbol?: boolean;
  className?: string;
};

export function TokenLabel({
  chainId,
  noSymbol = false,
  className,
}: TokenLabelProps) {
  return (
    <div
      className={`items-center flex h-fit w-fit justify-center rounded-full px-4 py-2 ${className}`}
    >
      {!noSymbol && (
        <h6 className="ml-[10px]">
          {getChain(chainId)?.nativeCurrency.symbol}
        </h6>
      )}
    </div>
  );
}
