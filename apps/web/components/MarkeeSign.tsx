"use client";

import React, { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import MarkeeModal from "./MarkeeModal";

const MARKEE_SUBGRAPH_ID = "8kMCKUHSY7o6sQbsvufeLVo8PifxrsnagjVTMGcs6KdF";
const SUBGRAPH_GATEWAY_KEY = process.env.NEXT_PUBLIC_SUBGRAPH_KEY;
const MARKEE_SUBGRAPH = SUBGRAPH_GATEWAY_KEY
  ? `https://gateway.thegraph.com/api/${SUBGRAPH_GATEWAY_KEY}/subgraphs/id/${MARKEE_SUBGRAPH_ID}`
  : `https://gateway.thegraph.com/api/subgraphs/id/${MARKEE_SUBGRAPH_ID}`;

const GARDENS_STRATEGY = "0x346419315740f085ba14ca7239d82105a9a2bdbe";

const QUERY = `{
  markees(
    first: 1
    orderBy: totalFundsAdded
    orderDirection: desc
    where: { partnerStrategy: "${GARDENS_STRATEGY}" }
  ) {
    message
    name
    totalFundsAdded
  }
  topDawgPartnerStrategy(id: "${GARDENS_STRATEGY}") {
    minimumPrice
  }
}`;

type SignData = {
  message: string;
  totalFundsAdded: bigint;
  minimumPrice: bigint;
};

export default function MarkeeSign() {
  const [data, setData] = useState<SignData | null>(null);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(() => {
    setError(false);
    fetch(MARKEE_SUBGRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res.errors) throw new Error(res.errors[0]?.message);
        const markee = res.data?.markees?.[0];
        const strategy = res.data?.topDawgPartnerStrategy;
        setData({
          message: markee?.message ?? "this is a sign.",
          totalFundsAdded: BigInt(markee?.totalFundsAdded ?? 0),
          minimumPrice: BigInt(strategy?.minimumPrice ?? 0),
        });
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ethDisplay =
    data && data.totalFundsAdded > BigInt(0)
      ? `${parseFloat(formatEther(data.totalFundsAdded)).toFixed(4)} ETH`
      : null;

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
            {error ? "this is a sign." : data ? data.message : "loading..."}
          </p>
        </div>
        {/* ETH badge */}
        {ethDisplay && (
          <span className="absolute -top-2.5 -right-2.5 rounded-full bg-primary px-2 py-0.5 text-xs font-mono font-semibold text-primary-content shadow-sm">
            {ethDisplay}
          </span>
        )}
        {!ethDisplay && data && (
          <span className="absolute -top-2.5 -right-2.5 rounded-full border border-neutral-content/30 bg-neutral px-2 py-0.5 text-xs text-neutral-content/50">
            be first!
          </span>
        )}
      </button>

      {modalOpen && data && (
        <MarkeeModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            setTimeout(fetchData, 2000);
          }}
          strategyAddress="0x346419315740F085Ba14cA7239D82105a9a2BDBE"
          currentTopDawg={data.totalFundsAdded}
          minimumPrice={data.minimumPrice}
        />
      )}
    </>
  );
}
