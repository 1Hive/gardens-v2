"use client";

import React, { ForwardedRef, useEffect, useState, forwardRef, useMemo, useCallback, MouseEventHandler } from "react";
import { Modal } from "@/components";
import useModal from "@/hooks/useModal";

export interface TransactionStep {
  transaction: string;
  message: string;
  current: boolean;
  dataContent: string;
  loading?: boolean;
  stepClassName?: string;
  messageClassName?: string;
}

type Statuses = "idle" | "loading" | "success" | "error";

export type TransactionModalProps = {
  label: string;
  allowTokenStatus: Statuses;
  stepTwoStatus: Statuses;
  allowance?: bigint;
  pendingAllowance?: boolean;
  setPendingAllowance?: (_: boolean) => void;
  token: string;
  initialTransactionSteps: TransactionStep[];
  children?: React.ReactNode;
  closeModal: () => void;
};

type StatusConfig = {
  message: string;
  dataContent: string;
  className: string;
  messageClassName: string;
};

const statusConfig: Record<Statuses, StatusConfig> = {
  idle: {
    message: "waiting for approval",
    dataContent: "",
    className: "step",
    messageClassName: "",
  },
  loading: {
    message: "waiting for signature",
    dataContent: "",
    className: "step-info",
    messageClassName: "text-info",
  },
  success: {
    message: "transaction sent successfully",
    dataContent: "✓",
    className: "step-success",
    messageClassName: "text-success",
  },
  error: {
    message: "an error has occurred, please try again!",
    dataContent: "X",
    className: "step-error",
    messageClassName: "text-error",
  },
};

export const TransactionModal = forwardRef<HTMLDialogElement, TransactionModalProps>(
  (
    {
      label,
      allowTokenStatus,
      stepTwoStatus,
      initialTransactionSteps,
      children,
      pendingAllowance,
      setPendingAllowance,
      closeModal,
    }: TransactionModalProps,
    ref: ForwardedRef<HTMLDialogElement>,
  ) => {

    const [transactionStepsState, setTransactionStepsState] = useState(initialTransactionSteps);

    const currentStatusConfig = useMemo(() => statusConfig[allowTokenStatus], [allowTokenStatus]);

    const handleCloseModal = useCallback(() => {
      setPendingAllowance?.(false);
      closeModal();
    }, [setPendingAllowance, closeModal]);

    useEffect(() => {
      const updatedFirstStep = {
        ...transactionStepsState[0],
        dataContent: pendingAllowance ? "✓" : currentStatusConfig.dataContent || "1",
        message: pendingAllowance
          ? "Allowance previously approved successfully!"
          : currentStatusConfig.message,
        stepClassName: pendingAllowance ? "step-success" : currentStatusConfig.className,
        messageClassName: pendingAllowance ? "text-success" : currentStatusConfig.messageClassName,
      };

      const updatedSecondStep = {
        ...transactionStepsState[1],
        message: statusConfig[stepTwoStatus].message,
        dataContent: statusConfig[stepTwoStatus].dataContent,
        current: allowTokenStatus === "success",
        stepClassName: stepTwoStatus === "success" ? "idle" : statusConfig[stepTwoStatus].className,
        messageClassName: statusConfig[stepTwoStatus].messageClassName,
      };

      if (stepTwoStatus === "success") {
        updatedSecondStep.message = "waiting for approval";
        updatedSecondStep.stepClassName = "idle";
        updatedSecondStep.dataContent = "2";
        updatedSecondStep.current = false;
        updatedSecondStep.messageClassName = "";
      }

      const newSteps = [updatedFirstStep, updatedSecondStep];

      if (JSON.stringify(newSteps) !== JSON.stringify(transactionStepsState)) {
        setTransactionStepsState(newSteps);
      }
    }, [allowTokenStatus, stepTwoStatus, pendingAllowance, currentStatusConfig]);

    const renderStep = useCallback((step: TransactionStep, index: number) => (
      <li
        key={`step-${index}`}
        data-content={step.dataContent}
        className={`step ${step.stepClassName}`}
      >
        <div className="flex flex-col gap-1">
          <span className="text-left font-semibold">
            {step.transaction}
          </span>
          <span
            className={`flex items-center gap-2 text-left text-sm ${step.messageClassName}`}
          >
            {step.stepClassName === "step-info" && (
              <span className="loading loading-spinner loading-xs" />
            )}
            {step.message}
          </span>
        </div>
      </li>
    ), []);

    return (
      <Modal
        title={label}
        onClose={handleCloseModal}
        ref={ref}
      >
        <div className="w-full">
          <ul className="steps steps-vertical min-h-48 w-full">
            {transactionStepsState.map(renderStep)}
          </ul>
        </div>
        {children}
      </Modal>
    );
  },
);

TransactionModal.displayName = "TransactionModal";