"use client";

import React from "react";
import { Modal } from "@/components";
import { TransactionStatusNotification } from "@/hooks/useTransactionNotification";

export interface TransactionStep {
  transaction: string;
  message: string;
  current: boolean;
  dataContent: string;
  loading?: boolean;
  stepClassName?: string;
  messageClassName?: string;
}

export type TransactionProps = {
  message: string;
  status: "idle" | "waiting" | "loading" | "success" | "error";
  contractName: React.ReactNode;
  showClickToExplorer?: boolean;
};

export type TransactionModalProps = {
  label: string;
  children?: React.ReactNode;
  transactions: TransactionProps[];
  onClose: () => void;
  isOpen: boolean;
};

export function TransactionModal({
  label,
  children,
  transactions,
  onClose,
  isOpen,
}: TransactionModalProps) {
  return (
    <Modal title={label} onClose={onClose} isOpen={isOpen}>
      {children}
      <div className="w-[420px]">
        {transactions.map((props, index) => {
          return (
            <React.Fragment key={`${props.contractName + "_" + index + 1}`}>
              <TransactionStatusNotification {...props} index={index + 1} />
              {index < transactions.length - 1 && (
                <div className="h-[50px] w-0.5 bg-gray-300 ml-[19px] my-2" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Modal>
  );
}
