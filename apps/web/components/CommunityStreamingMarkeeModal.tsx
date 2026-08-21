"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Address, formatEther, getAddress, isAddress } from "viem";
import { usePublicClient } from "wagmi";
import { fetchMarkeeViews } from "@/utils/markee";
import {
  MARKEE_SECONDS_IN_MONTH,
  markeeOwnerABI,
  streamingLeaderboardRuntimeABI,
} from "@/utils/markeeStreaming";

type LeaderboardEntry = {
  address: Address;
  message: string;
  name: string;
  rate: bigint;
  views?: number;
};

type Props = {
  chainId?: number;
  children: ReactNode;
  currentMessage: string;
  currentName?: string;
  currentRatePerSecondWei?: string;
  footer: ReactNode;
  isOpen: boolean;
  leaderboardAddress?: Address;
  onClose: () => void;
  title: string;
  topMarkeeAddress?: Address;
};

const MARKEE_COOPERATIVE_URL =
  "https://app.gardens.fund/gardens/8453/0xce6b968c8bd130ca08f1fcc97b509a824380d867";

const getMarkeeAppUrl = (chainId: number | undefined, board: Address) =>
  `${chainId === 8453 ? "https://www.markee.xyz" : "https://2staging.markee.xyz"}/markee/${board}`;

const formatMonthlyRate = (rate: bigint) => {
  const monthly = Number(formatEther(rate * MARKEE_SECONDS_IN_MONTH));
  return monthly.toLocaleString("en-US", {
    maximumFractionDigits: 6,
    minimumFractionDigits: monthly > 0 && monthly < 0.001 ? 6 : 3,
    useGrouping: false,
  });
};

export function CommunityStreamingMarkeeModal({
  chainId,
  children,
  currentMessage,
  currentName,
  currentRatePerSecondWei,
  footer,
  isOpen,
  leaderboardAddress,
  onClose,
  title,
  topMarkeeAddress,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const publicClient = usePublicClient({ chainId });
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const currentRate =
    currentRatePerSecondWei != null && /^\d+$/u.test(currentRatePerSecondWei) ?
      BigInt(currentRatePerSecondWei)
    : null;

  const markeeAppUrl = useMemo(
    () =>
      leaderboardAddress == null ? null : (
        getMarkeeAppUrl(chainId, leaderboardAddress)
      ),
    [chainId, leaderboardAddress],
  );
  const challengerLeaderboard = useMemo(
    () =>
      leaderboard.filter(
        ({ address, message }) =>
          message.trim().length > 0 &&
          (topMarkeeAddress == null ||
            address.toLowerCase() !== topMarkeeAddress.toLowerCase()),
      ),
    [leaderboard, topMarkeeAddress],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen) dialog?.showModal();
    else dialog?.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || topMarkeeAddress == null) {
      setTotalViews(null);
      return;
    }
    let cancelled = false;
    void fetchMarkeeViews([topMarkeeAddress])
      .then((views) => {
        if (!cancelled) {
          setTotalViews(views[topMarkeeAddress.toLowerCase()]?.totalViews ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setTotalViews(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, topMarkeeAddress]);

  useEffect(() => {
    if (
      !leaderboardOpen ||
      leaderboardAddress == null ||
      publicClient == null
    ) {
      return;
    }

    let cancelled = false;
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    void (async () => {
      const [addresses, rates] = await publicClient.readContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        args: [11n],
        functionName: "getTopMarkees",
      });
      const validAddresses = addresses.filter((address): address is Address =>
        isAddress(address),
      );
      const markeeReads = await publicClient.multicall({
        allowFailure: true,
        contracts: validAddresses.flatMap((address) => [
          {
            abi: markeeOwnerABI,
            address,
            functionName: "message" as const,
          },
          {
            abi: markeeOwnerABI,
            address,
            functionName: "name" as const,
          },
        ]),
      });
      const views = await fetchMarkeeViews(validAddresses);
      if (cancelled) return;

      setLeaderboard(
        validAddresses.map((address, index) => ({
          address: getAddress(address),
          message:
            markeeReads[index * 2]?.status === "success" ?
              String(markeeReads[index * 2].result ?? "")
            : "",
          name:
            markeeReads[index * 2 + 1]?.status === "success" ?
              String(markeeReads[index * 2 + 1].result ?? "")
            : "",
          rate: rates[index] ?? 0n,
          views: views[address.toLowerCase()]?.totalViews,
        })),
      );
    })()
      .catch(() => {
        if (!cancelled) setLeaderboardError("Unable to load leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leaderboardAddress, leaderboardOpen, publicClient]);

  return (
    <dialog
      ref={dialogRef}
      className={`${isOpen ? "" : "hidden"} modal max-sm:modal-bottom`}
      onClose={onClose}
    >
      <div className="modal-box flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border-neutral bg-neutral p-0 dark:border-white/15">
        <header className="flex items-start justify-between border-b border-border-neutral px-6 py-4 dark:border-white/15">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-neutral-content">
              {title}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-xs text-neutral-content/60">
                62% to community treasury · 38% to{" "}
                <a
                  href={MARKEE_COOPERATIVE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 transition-colors hover:text-primary-content"
                >
                  Markee Cooperative
                </a>
              </p>
              {totalViews != null && (
                <span className="flex items-center gap-1 font-mono text-xs text-neutral-content/40">
                  <EyeIcon className="h-3 w-3" />
                  {totalViews.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm ml-3 shrink-0"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-x-hidden overflow-y-auto px-6 py-5">
          <section className="mb-5 rounded-lg border border-neutral-content/20 bg-neutral-focus px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs text-neutral-content/50">
                  Current message
                </p>
                <p className="break-words font-mono text-sm text-neutral-content">
                  {currentMessage}
                </p>
                {currentName && (
                  <p className="mt-1 text-xs text-neutral-content/40">
                    {currentName}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {markeeAppUrl && (
                  <a
                    href={markeeAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-content underline underline-offset-2"
                  >
                    Open in Markee
                  </a>
                )}
                {currentRate != null && (
                  <p className="font-mono text-xs text-neutral-content/60">
                    {formatMonthlyRate(currentRate)} ETH/mo
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLeaderboardOpen((open) => !open)}
              className="mt-3 flex items-center gap-1 text-xs text-neutral-content/50 transition-colors hover:text-neutral-content/80"
            >
              <ChevronDownIcon
                className={`h-3.5 w-3.5 transition-transform ${leaderboardOpen ? "rotate-180" : ""}`}
              />
              {leaderboardOpen ? "Hide leaderboard" : "Show leaderboard"}
            </button>

            {leaderboardOpen && (
              <div className="mt-3 space-y-3 border-t border-neutral-content/10 pt-3">
                {leaderboardLoading ?
                  <div className="space-y-2" aria-label="Loading leaderboard">
                    <div className="skeleton h-9 w-full rounded" />
                    <div className="skeleton h-9 w-full rounded" />
                  </div>
                : leaderboardError ?
                  <p className="text-xs text-danger-content">
                    {leaderboardError}
                  </p>
                : challengerLeaderboard.length === 0 ?
                  <p className="text-xs text-neutral-content/40">
                    No other Markees yet.
                  </p>
                : challengerLeaderboard.map((entry, index) => (
                    <div
                      key={entry.address}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="flex min-w-0 gap-2">
                        <span className="font-mono text-xs text-neutral-content/30">
                          {index + 2}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words font-mono text-xs text-neutral-content">
                            {entry.message}
                          </p>
                          {entry.name && (
                            <p className="mt-0.5 text-xs text-neutral-content/40">
                              {entry.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs text-neutral-content/60">
                          {formatMonthlyRate(entry.rate)} ETH/mo
                        </p>
                        {entry.views != null && (
                          <p className="mt-0.5 flex items-center justify-end gap-1 font-mono text-xs text-neutral-content/30">
                            <EyeIcon className="h-2.5 w-2.5" />
                            {entry.views.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </section>

          {children}
        </div>

        <footer className="border-t border-border-neutral px-4 py-4 dark:border-white/15">
          {footer}
        </footer>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
