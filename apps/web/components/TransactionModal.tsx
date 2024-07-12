"use client";

import { forwardRef, useEffect, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { Button } from "./Button";

export interface TransactionStep {
  transaction: string;
  message: string;
  current: boolean;
  dataContent: string;
  loading?: boolean;
  stepClassName?: string;
  messageClassName?: string;
}

type statuses = "idle" | "loading" | "success" | "error";

export type TransactionModalProps = {
  label: string;
  allowTokenStatus: statuses;
  stepTwoStatus: statuses;
  allowance?: bigint;
  pendingAllowance?: boolean;
  setPendingAllowance?: (_: boolean) => void;
  token: string;
  initialTransactionSteps: TransactionStep[];
  children?: React.ReactNode;
};

interface StatusConfig {
  message: string;
  dataContent: string;
  className: string;
  messageClassName: string;
}

export const TransactionModal = forwardRef<
  HTMLDialogElement,
  TransactionModalProps
>(function TransactionModal(
  {
    label,
    allowTokenStatus,
    stepTwoStatus,
    initialTransactionSteps,
    token,
    children,
    pendingAllowance,
    setPendingAllowance,
  },
  ref,
) {
  const statusConfig: Record<string, StatusConfig> = {
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

  const [transactionStepsState, setTransactionStepsState] = useState(
    initialTransactionSteps,
  );

  const { message, dataContent, className, messageClassName } =
    statusConfig[allowTokenStatus];

  useEffect(() => {
    const updatedFirstStep = {
      ...transactionStepsState[0],
      dataContent: pendingAllowance ? "✓" : dataContent || "1",
      message:
        pendingAllowance ?
          "Allowance previously approved successfully!"
          : message,
      stepClassName: pendingAllowance ? "step-success" : className,
      messageClassName: pendingAllowance ? "text-success" : messageClassName,
    };

    const updatedSecondStep = {
      ...transactionStepsState[1],
      message: statusConfig[stepTwoStatus].message || "2",
      dataContent: statusConfig[stepTwoStatus].dataContent || "2",
      current: allowTokenStatus === "success",
      stepClassName:
        stepTwoStatus === "success" ? "idle" : (
          statusConfig[stepTwoStatus].className
        ),
      messageClassName: statusConfig[stepTwoStatus].messageClassName,
    };

    if (stepTwoStatus === "success") {
      updatedSecondStep.message = "waiting for approval";
      updatedSecondStep.stepClassName = "idle";
      updatedSecondStep.dataContent = "2";
      updatedSecondStep.current = false;
      updatedSecondStep.messageClassName = "";
    }

    setTransactionStepsState([updatedFirstStep, updatedSecondStep]);
  }, [allowTokenStatus, stepTwoStatus]);

  const handleModalClose = () => {
    if (ref && "current" in ref && ref.current) {
      ref.current.close();
    }
    if (setPendingAllowance) {
      setPendingAllowance(false);
    }
  };

  return (
    <dialog id="transaction_modal" className="modal" ref={ref}>
      <div className="modal-box relative max-w-md bg-white transition-all duration-500 ease-in-out">
        <div className="flex items-start justify-between">
          <h4 className="text-lg font-bold">{label}</h4>
          {/* we should use other button here */}
          <Button btnStyle="outline" color="danger" onClick={handleModalClose}>
            X
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-info p-2 text-white">
          <ExclamationCircleIcon height={32} width={32} />
          <p className="text-sm">
            {/*  Please sign two wallet transaction
            One to allow ERC-20 tokens, the other to register  */}
            You need to allow Gardens on the {token} contract. This is a two
            step process.
          </p>
        </div>
        <div className="w-full">
          <ul className="steps steps-vertical min-h-48 w-full">
            {transactionStepsState.map((step, index) => (
              <li
                key={index}
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
            ))}
          </ul>
        </div>
        {children}
      </div>
    </dialog>
  );
});
