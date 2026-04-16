import { useEffect, useState } from "react";
import { Address, isAddress } from "viem";
import { usePreferredReadClient } from "./usePreferredReadClient";

type Props = {
  address?: string;
  chainId?: number;
  enabled?: boolean;
};

export function useHasContractCode({
  address,
  chainId,
  enabled = true,
}: Props) {
  const publicClient = usePreferredReadClient(chainId);
  const [hasContractCode, setHasContractCode] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    if (
      !enabled ||
      chainId == null ||
      publicClient == null ||
      !address ||
      !isAddress(address)
    ) {
      setHasContractCode(false);
      return;
    }

    setHasContractCode(false);

    void publicClient
      .getBytecode({ address: address as Address })
      .then((bytecode) => {
        if (!cancelled) {
          setHasContractCode(Boolean(bytecode && bytecode !== "0x"));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasContractCode(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, chainId, enabled, publicClient]);

  return { hasContractCode };
}
