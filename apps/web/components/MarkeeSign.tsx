"use client";

import React, { useCallback, useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useContractRead } from "wagmi";
import MarkeeModal from "./MarkeeModal";
import { MarkeeAbi } from "@/src/customAbis";
import {
  fetchMarkeeSignData,
  recordMarkeeView,
  GARDENS_STRATEGY,
  MarkeeNetwork,
} from "@/utils/markee";

// Confirmed from Basescan readContract
const MIN_PRICE = parseEther("0.003");
const MIN_INCREMENT = parseEther("0.001");

type SignData = {
  markeeAddress: string | null; // individual markee contract address
  message: string;
  totalFundsAdded: bigint;
  minimumPrice: bigint;
};

const DEFAULT_MESSAGE = "this is a sign.";

const DEFAULT_DATA: SignData = {
  markeeAddress: null,
  message: DEFAULT_MESSAGE,
  totalFundsAdded: BigInt(0),
  minimumPrice: MIN_PRICE,
};

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function MarkeeSign() {
  const [data, setData] = useState<SignData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [totalViews, setTotalViews] = useState<number | null>(null);

  const { data: onchainMinPrice } = useContractRead({
    address: GARDENS_STRATEGY,
    abi: MarkeeAbi,
    functionName: "minimumPrice",
    chainId: MarkeeNetwork.id,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const strategy = await fetchMarkeeSignData(GARDENS_STRATEGY);
      const markee = strategy?.markees?.[0];
      const subgraphMinPrice = BigInt(strategy?.minimumPrice ?? 0);
      const onchainMinPriceValue =
        typeof onchainMinPrice === "bigint" ? onchainMinPrice : BigInt(0);

      setData({
        markeeAddress: markee?.address ?? null,
        message: markee?.message ?? DEFAULT_MESSAGE,
        totalFundsAdded: BigInt(markee?.totalFundsAdded ?? 0),
        minimumPrice:
          onchainMinPriceValue > BigInt(0) ? onchainMinPriceValue
          : subgraphMinPrice > BigInt(0) ? subgraphMinPrice
          : MIN_PRICE,
      });
    } catch (error) {
      setLoadError("Unable to load Markee data right now.");
    } finally {
      setLoading(false);
    }
  }, [onchainMinPrice]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Record a view using the individual markee contract address
  useEffect(() => {
    if (loading || loadError !== null || data.message === DEFAULT_MESSAGE || data.markeeAddress === null) return;
    recordMarkeeView(data.markeeAddress, data.message)
      .then((res) => setTotalViews(res.totalViews))
      .catch(() => {});
  }, [loading, loadError, data.message, data.markeeAddress]);

  // Amount needed to take the top spot
  const takeTopSpot =
    data.totalFundsAdded > BigInt(0) ?
      data.totalFundsAdded + MIN_INCREMENT
    : data.minimumPrice;

  const ethDisplay =
    data.totalFundsAdded > BigInt(0) ?
      `${parseFloat(formatEther(takeTopSpot)).toFixed(3)} ETH to change`
    : "be first!";

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        disabled={loading || loadError !== null}
        className="group relative mx-auto mt-6 mb-4 cursor-pointer max-sm:w-full"
        aria-label="Click to edit this Markee sign"
      >
        {/* Sign body */}
        <div className="relative border border-neutral-content/30 rounded px-8 md:px-16 py-8 max-w-lg bg-neutral hover:border-primary-content/50 transition-colors duration-200">
          {/* View count — inside card, top right */}
          {totalViews !== null && (
            <span className="absolute top-2 right-3 flex items-center gap-1 text-xs font-mono text-neutral-content/40 group-hover:text-primary-content/50 transition-colors duration-200">
              <EyeIcon className="h-3 w-3" />
              {totalViews.toLocaleString()}
            </span>
          )}

          <p className="font-mono text-neutral-content text-lg group-hover:text-primary-content transition-colors duration-200 text-center leading-snug">
            {loading ? "loading..." : data.message}
          </p>
        </div>

        {/* Price badge — bottom center */}
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-neutral-content/30 bg-neutral px-3 py-0.5 text-xs font-mono text-neutral-content/60 opacity-0 group-hover:opacity-100 group-hover:border-primary-content/40 group-hover:text-primary-content/70 max-sm:opacity-100 max-sm:border-primary-content/40 max-sm:text-primary-content/70 transition-all duration-200 whitespace-nowrap">
          {loading ?
            "···"
          : loadError !== null ?
            "unavailable"
          : ethDisplay}
        </span>
      </button>

      {modalOpen && (
        <MarkeeModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            setTimeout(fetchData, 2000);
          }}
          currentTopDawg={data.totalFundsAdded}
          currentMessage={data.message}
          minimumPrice={data.minimumPrice}
          takeTopSpot={takeTopSpot}
          totalViews={totalViews}
        />
      )}
    </>
  );
}
