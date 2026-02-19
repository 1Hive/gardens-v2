"use client";

import React, { useEffect, useState } from "react";
import { formatEther } from "viem";
import MarkeeModal from "./MarkeeModal";

const GARDENS_STRATEGY = "0x346419315740F085Ba14cA7239D82105a9a2BDBE";
const GARDENS_STRATEGY_LOWER = GARDENS_STRATEGY.toLowerCase();
const MARKEE_SUBGRAPH =
  "https://gateway.thegraph.com/api/subgraphs/id/8kMCKUHSY7o6sQbsvufeLVo8PifxrsnagjVTMGcs6KdF";

const QUERY = `{
  markees(
    first: 1
    orderBy: totalFundsAdded
    orderDirection: desc
    where: { strategy: "${GARDENS_STRATEGY_LOWER}" }
  ) {
    id
    currentMessage
    totalFundsAdded
    owner
  }
  topDawgPartnerStrategy(id: "${GARDENS_STRATEGY_LOWER}") {
    minimumPrice
  }
}`;

type MarkeeData = {
  message: string;
  totalFundsAdded: bigint;
  minimumPrice: bigint;
  markeeId: string | null;
};

export default function MarkeeSign() {
  const [data, setData] = useState<MarkeeData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch(MARKEE_SUBGRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
    })
      .then((r) => r.json())
      .then((res) => {
        const markee = res.data?.markees?.[0];
        const strategy = res.data?.topDawgPartnerStrategy;
        setData({
          message: markee?.currentMessage ?? "this is a sign.",
          totalFundsAdded: BigInt(markee?.totalFundsAdded ?? 0),
          minimumPrice: BigInt(strategy?.minimumPrice ?? 0),
          markeeId: markee?.id ?? null,
        });
      })
      .catch((err) => {
        console.error("[MarkeeSign] Subgraph fetch error:", err);
        setData({
          message: "this is a sign.",
          totalFundsAdded: BigInt(0),
          minimumPrice: BigInt(0),
          markeeId: null,
        });
      });
  }, []);

  const topDawgEth =
    data && data.totalFundsAdded > BigInt(0)
      ? `${parseFloat(formatEther(data.totalFundsAdded)).toFixed(3)} ETH`
      : data
        ? "be first!"
        : "...";

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="group relative mx-auto mt-6 cursor-pointer"
        aria-label="Click to edit this Markee sign"
      >
        {/* Sign body */}
        <div className="border border-neutral-content/30 rounded px-10 py-5 min-w-[280px] max-w-sm bg-neutral hover:border-primary-content/50 transition-colors duration-200">
          <p className="font-mono text-neutral-content text-base group-hover:text-primary-content transition-colors duration-200 text-center leading-snug">
            {data ? data.message : "loading..."}
          </p>
        </div>
        {/* ETH badge */}
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 badge badge-sm bg-primary text-primary-content font-mono whitespace-nowrap px-3">
          {topDawgEth}
        </span>
      </button>

      {modalOpen && (
        <MarkeeModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            // Re-fetch after success
            setData(null);
            fetch(MARKEE_SUBGRAPH, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: QUERY }),
            })
              .then((r) => r.json())
              .then((res) => {
                const markee = res.data?.markees?.[0];
                const strategy = res.data?.topDawgPartnerStrategy;
                setData({
                  message: markee?.currentMessage ?? "this is a sign.",
                  totalFundsAdded: BigInt(markee?.totalFundsAdded ?? 0),
                  minimumPrice: BigInt(strategy?.minimumPrice ?? 0),
                  markeeId: markee?.id ?? null,
                });
              })
              .catch(console.error);
          }}
          currentTopDawg={data?.totalFundsAdded ?? BigInt(0)}
          minimumPrice={data?.minimumPrice ?? BigInt(0)}
          strategyAddress={GARDENS_STRATEGY as `0x${string}`}
        />
      )}
    </>
  );
}
