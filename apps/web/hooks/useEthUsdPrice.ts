"use client";

import { useEffect, useState } from "react";

type EthPriceResponse = {
  usd?: unknown;
};

export function useEthUsdPrice() {
  const [ethUsdPrice, setEthUsdPrice] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/markee/eth-price", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const result = (await response.json()) as EthPriceResponse;
        if (
          typeof result.usd === "number" &&
          Number.isFinite(result.usd) &&
          result.usd > 0
        ) {
          setEthUsdPrice(result.usd);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return ethUsdPrice;
}
