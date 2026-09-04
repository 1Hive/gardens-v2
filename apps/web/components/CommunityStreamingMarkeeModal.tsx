"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useModal } from "connectkit";
import { Address, formatEther, getAddress, isAddress } from "viem";
import { usePublicClient } from "wagmi";
import { fetchMarkeeViews } from "@/utils/markee";
import {
  MARKEE_SECONDS_IN_MONTH,
  markeeOwnerABI,
  streamingLeaderboardRuntimeABI,
} from "@/utils/markeeStreaming";

export type StreamingMarkeeLeaderboardEntry = {
  address: Address;
  message: string;
  name: string;
  rank: number;
  rate: bigint;
  views?: number;
};

type Props = {
  chainId?: number;
  children: ReactNode;
  footer: ReactNode;
  hideLeaderboard?: boolean;
  isOpen: boolean;
  leaderboardAddress?: Address;
  onFundMarkee?: (entry: StreamingMarkeeLeaderboardEntry) => void;
  onSelectOwnedMarkee?: () => void;
  onClose: () => void;
  ownedMarkeeAddress?: Address | null;
  selectedMarkeeAddress?: Address | null;
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
  footer,
  hideLeaderboard = false,
  isOpen,
  leaderboardAddress,
  onFundMarkee,
  onSelectOwnedMarkee,
  onClose,
  ownedMarkeeAddress,
  selectedMarkeeAddress,
  title,
  topMarkeeAddress,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const suspendedForConnectRef = useRef(false);
  const { open: connectModalOpen } = useModal();
  const publicClient = usePublicClient({ chainId });
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<
    StreamingMarkeeLeaderboardEntry[]
  >([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [totalViews, setTotalViews] = useState<number | null>(null);

  const markeeAppUrl = useMemo(
    () =>
      leaderboardAddress == null ? null : (
        getMarkeeAppUrl(chainId, leaderboardAddress)
      ),
    [chainId, leaderboardAddress],
  );
  const displayedLeaderboard = useMemo(() => {
    const visibleEntries = leaderboard.filter(
      ({ message }) => message.trim().length > 0,
    );
    const ownedEntry = visibleEntries.find(
      ({ address }) =>
        ownedMarkeeAddress != null &&
        address.toLowerCase() === ownedMarkeeAddress.toLowerCase(),
    );
    const promotedEntry = visibleEntries.find(
      ({ address }) =>
        topMarkeeAddress != null &&
        address.toLowerCase() === topMarkeeAddress.toLowerCase(),
    );
    const pinnedAddresses = new Set(
      [ownedEntry?.address, promotedEntry?.address]
        .filter((address): address is Address => address != null)
        .map((address) => address.toLowerCase()),
    );

    return [
      ...(ownedEntry == null ? [] : [ownedEntry]),
      ...(promotedEntry == null || promotedEntry === ownedEntry ?
        []
      : [promotedEntry]),
      ...visibleEntries.filter(
        ({ address }) => !pinnedAddresses.has(address.toLowerCase()),
      ),
    ];
  }, [leaderboard, ownedMarkeeAddress, topMarkeeAddress]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen) {
      dialog?.close();
      return;
    }

    if (connectModalOpen) {
      if (dialog?.open) {
        suspendedForConnectRef.current = true;
        dialog.close();
      }
      return;
    }

    if (!dialog?.open) dialog?.showModal();
    suspendedForConnectRef.current = false;
  }, [connectModalOpen, isOpen]);

  const handleDialogClose = () => {
    if (suspendedForConnectRef.current) return;
    onClose();
  };

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
      const markeeCount = await publicClient.readContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        functionName: "markeeCount",
      });
      const [addresses, rates] = await publicClient.readContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        args: [markeeCount],
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
          rank: index + 1,
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
      onClose={handleDialogClose}
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
          {!hideLeaderboard && (
            <section className="mb-5 rounded-lg border border-neutral-content/20 bg-neutral-focus px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setLeaderboardOpen((open) => !open)}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-content/60 transition-colors hover:text-neutral-content"
                  aria-expanded={leaderboardOpen}
                >
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 transition-transform ${leaderboardOpen ? "rotate-180" : ""}`}
                  />
                  Leaderboard
                </button>
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
              </div>

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
                  : displayedLeaderboard.length === 0 ?
                    <p className="text-xs text-neutral-content/40">
                      No Markees yet.
                    </p>
                  : displayedLeaderboard.map((entry) => {
                      const isOwned =
                        ownedMarkeeAddress != null &&
                        entry.address.toLowerCase() ===
                          ownedMarkeeAddress.toLowerCase();
                      const isPromoted =
                        topMarkeeAddress != null &&
                        entry.address.toLowerCase() ===
                          topMarkeeAddress.toLowerCase();
                      const isSelected =
                        selectedMarkeeAddress != null &&
                        entry.address.toLowerCase() ===
                          selectedMarkeeAddress.toLowerCase();
                      return (
                        <div
                          key={entry.address}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${isSelected ? "border-primary-content" : "border-neutral-content/10"} ${isPromoted ? "bg-primary-content/5" : ""}`}
                        >
                          <div className="flex min-w-0 gap-2">
                            <span className="font-mono text-xs text-neutral-content/30">
                              #{entry.rank}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="break-words font-mono text-xs text-neutral-content">
                                  {entry.message}
                                </p>
                                {isPromoted && (
                                  <span className="rounded-full border border-primary-content/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary-content">
                                    Promoted
                                  </span>
                                )}
                                {isOwned && (
                                  <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-content/40">
                                    Yours
                                  </span>
                                )}
                              </div>
                              {entry.name && (
                                <p className="mt-0.5 text-xs text-neutral-content/40">
                                  {entry.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-right">
                            <div>
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
                            {(
                              isOwned &&
                              selectedMarkeeAddress != null &&
                              !isSelected &&
                              onSelectOwnedMarkee != null
                            ) ?
                              <button
                                type="button"
                                className="h-7 rounded-lg border border-primary-content/50 px-2.5 text-xs font-medium text-primary-content transition-colors hover:bg-primary-content/10"
                                onClick={onSelectOwnedMarkee}
                              >
                                Fund
                              </button>
                            : !isOwned &&
                              onFundMarkee != null && (
                                <button
                                  type="button"
                                  className={`h-7 rounded-lg border px-2.5 text-xs font-medium transition-colors ${isSelected ? "border-primary-content bg-primary-content text-neutral-inverted-content" : "border-primary-content/50 text-primary-content hover:bg-primary-content/10"}`}
                                  onClick={() => onFundMarkee(entry)}
                                >
                                  {isSelected ? "Selected" : "Fund"}
                                </button>
                              )
                            }
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </section>
          )}

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
