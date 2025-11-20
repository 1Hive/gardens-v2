"use client";

import React from "react";
import Image from "next/image";

import {
  TxError,
  TxIdle,
  TxInProgress,
  TxSuccess,
  TxWaitingForSig,
} from "@/assets";
import { useChainFromPath } from "@/hooks/useChainFromPath";

type TransactionStatus = "idle" | "waiting" | "loading" | "success" | "error";

type Props = {
  message: React.ReactNode;
  status: TransactionStatus;
  contractName?: React.ReactNode;
  showClickToExplorer?: boolean;
  index?: number;
};

const statusToIcon: Record<TransactionStatus, any> = {
  idle: TxIdle,
  waiting: TxWaitingForSig,
  loading: TxInProgress,
  success: TxSuccess,
  error: TxError,
};

const statusToTextColor: Record<TransactionStatus, string> = {
  idle: "",
  waiting: "text-warning",
  loading: "text-info",
  success: "text-success",
  error: "text-error",
};

export function TransactionStatusNotification({
  message,
  status,
  showClickToExplorer,
  index,
}: Props) {
  const chain = useChainFromPath();
  const icon = statusToIcon[status];
  const textColor = statusToTextColor[status];

  const textClass =
    showClickToExplorer ? textColor : "dark:text-neutral-inverted-content";

  return (
    <div
      className="flex flex-row items-center gap-2"
      data-testid="transaction-status-notification"
    >
      {icon && (
        <div className="relative flex items-center justify-center">
          <Image
            key={status}
            className={status === "loading" ? "animate-spin" : ""}
            width={40}
            src={icon}
            alt="icon"
          />
          {index !== undefined && status === "idle" && (
            <label className="absolute font-medium text-xl text-gray-900 dark:text-neutral-inverted-content">
              {index}
            </label>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1 min-w-0">
        <div
          className={`${textClass} font-medium text-base break-words whitespace-normal`}
        >
          {message}
        </div>
        {chain?.blockExplorers?.default.url && showClickToExplorer && (
          <div className="w-full text-sm italic">
            Click to see in block explorer
          </div>
        )}
      </div>
    </div>
  );
}
