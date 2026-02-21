"use client";

import React, { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import MarkeeModal from "./MarkeeModal";

const MARKEE_SUBGRAPH_ID = "8kMCKUHSY7o6sQbsvufeLVo8PifxrsnagjVTMGcs6KdF";
const SUBGRAPH_GATEWAY_KEY = process.env.NEXT_PUBLIC_SUBGRAPH_KEY;
export const MARKEE_SUBGRAPH_URL = SUBGRAPH_GATEWAY_KEY
  ? `https://gateway.thegraph.com/api/${SUBGRAPH_GATEWAY_KEY}/subgraphs/id/${MARKEE_SUBGRAPH_ID}`
  : `https://api.studio.thegraph.com/query/1742437/markee-base/version/latest`;

export const GARDENS_STRATEGY = "0x346419315740f085ba14ca7239d82105a9a2bdbe";

const QUERY = `{
  topDawgPartnerStrategy(id: "${GARDENS_STRATEGY}") {
    minimumPrice
    markees(first: 1, orderBy: totalFundsAdded, orderDirection: desc) {
      message
      name
      totalFundsAdded
    }
  }
}`;

type SignData = {
  message: string;
  totalFundsAdded: bigint;
  minimumPrice: bigint;
};

const DEFAULT_DATA: SignData = {
  message: "this is a sign.",
  totalFundsAdded: BigInt(0),
  minimumPrice: BigInt(0),
};

export default function MarkeeSign() {
  const [data, setData] = useState<SignData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(MARKEE_SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res.errors) {
          console.error("[MarkeeSign] GraphQL errors:", JSON.stringify(res.errors));
          return;
        }
        console.log("[MarkeeSign] subgraph response:", JSON.stringify(res.data));
        const strategy = res.data?.topDawgPartnerStrategy;
        const markee = strategy?.markees?.[0];
        setData({
          message: markee?.message ?? "this is a sign.",
          totalFundsAdded: BigInt(markee?.totalFundsAdded ?? 0),
          minimumPrice: BigInt(strategy?.minimumPrice ?? 0),
        });
      })
      .catch((err) => {
        console.error("[MarkeeSign] fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ethDisplay =
    data.totalFundsAdded > BigInt(0)
      ? `${parseFloat(formatEther(data.totalFundsAdded)).toFixed(3)} ETH to change`
      : "be first!";

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="group relative mx-auto mt-6 mb-4 cursor-pointer"
        aria-label="Click to edit this Markee sign"
      >
        {/* Sign body */}
        <div className="border border-neutral-content/30 rounded px-16 py-8 min-w-[420px] max-w-lg bg-neutral hover:border-primary-content/50 transition-colors duration-200">
          <p className="font-mono text-neutral-content text-lg group-hover:text-primary-content transition-colors duration-200 text-center leading-snug">
            {loading ? "loading..." : data.message}
          </p>
        </div>

        {/* Price badge — bottom center, only visible on hover */}
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-neutral-content/30 bg-neutral px-3 py-0.5 text-xs font-mono text-neutral-content/60 opacity-0 group-hover:opacity-100 group-hover:border-primary-content/40 group-hover:text-primary-content/70 transition-all duration-200 whitespace-nowrap">
          {loading ? "···" : ethDisplay}
        </span>
      </button>

      {modalOpen && (
        <MarkeeModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            setTimeout(fetchData, 2000);
          }}
          strategyAddress="0x346419315740F085Ba14cA7239D82105a9a2BDBE"
          currentTopDawg={data.totalFundsAdded}
          currentMessage={data.message}
          minimumPrice={data.minimumPrice}
          subgraphUrl={MARKEE_SUBGRAPH_URL}
        />
      )}
    </>
  );
}
