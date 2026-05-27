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
  showContractName?: boolean;
  showClickToExplorer?: boolean;
  clickHint?: React.ReactNode;
  auxiliaryLink?: {
    href: string;
    label: React.ReactNode;
  };
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
  contractName,
  showContractName = false,
  showClickToExplorer,
  clickHint,
  auxiliaryLink,
  index,
}: Props) {
  const chain = useChainFromPath();
  const icon = statusToIcon[status];
  const textColor = statusToTextColor[status];
  const hasContractName =
    contractName !== undefined &&
    contractName !== null &&
    contractName !== false;
  const hasMessage =
    message !== undefined && message !== null && message !== false;
  const hasClickHint =
    clickHint !== undefined && clickHint !== null && clickHint !== false;
  const textClass =
    showClickToExplorer ? textColor : "dark:text-neutral-inverted-content";
  const contractNameClass =
    status === "idle" ?
      "text-neutral-content/70 dark:text-neutral-inverted-content/70"
    : "text-neutral-content dark:text-neutral-inverted-content";

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
        {showContractName && hasContractName && (
          <div
            className={`font-medium text-base break-words whitespace-normal ${contractNameClass}`}
          >
            {contractName}
          </div>
        )}
        {hasMessage && (
          <div className={`${textClass} text-sm break-words whitespace-normal`}>
            {message}
          </div>
        )}
        {auxiliaryLink && (
          <a
            href={auxiliaryLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-sm italic underline underline-offset-2"
            onClick={(event) => event.stopPropagation()}
          >
            {auxiliaryLink.label}
          </a>
        )}
        {chain?.blockExplorers?.default.url && showClickToExplorer && (
          <div className="w-full text-sm italic">
            Click to see in block explorer
          </div>
        )}
        {hasClickHint && (
          <div className="w-full text-sm italic">{clickHint}</div>
        )}
      </div>
    </div>
  );
}
