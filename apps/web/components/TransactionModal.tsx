"use client";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { Button } from "./Button";
import { forwardRef, useEffect, useState } from "react";

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
  token: string;
  initialTransactionSteps: TransactionStep[];
  children?: React.ReactNode;
};

type StepStateProps = {
  [key: string]: string;
};

export const TransactionModal = forwardRef<
  HTMLDialogElement,
  TransactionModalProps
>(function TransactionModal(
  {
    label,
    allowTokenStatus,
    allowance,
    stepTwoStatus,
    initialTransactionSteps,
    token,
    children,
  },
  ref,
) {
  const dialogRef = typeof ref === "function" ? { current: null } : ref;

  const statusMessage: StepStateProps = {
    idle: "waiting for approval",
    loading: "waiting for signature",
    success: "transaction sent successfull",
    error: "an error has occurred, please try again!",
  };

  const dataContent: StepStateProps = {
    success: "✓",
    error: "X",
  };

  const stepClassName: StepStateProps = {
    idle: "step",
    loading: "step-info",
    success: "step-success",
    error: "step-error",
  };

  const messageClassName: StepStateProps = {
    idle: "text-info",
    loading: "text-info",
    success: "text-success",
    error: "text-error",
  };

  const messageClassName2: StepStateProps = {
    ...messageClassName,
    idle: "",
  };

  const [transactionStepsState, setTransactionStepsState] = useState(
    initialTransactionSteps,
  );

  useEffect(() => {
    const updatedFirstStep = {
      ...transactionStepsState[0],
      dataContent: dataContent[allowTokenStatus] || "1",
      message: statusMessage[allowTokenStatus] || "",
      stepClassName: stepClassName[allowTokenStatus] || "",
      messageClassName: messageClassName[allowTokenStatus] || "",
    };

    const updatedSecondStep = {
      ...transactionStepsState[1],
      message: statusMessage[stepTwoStatus] || "2",
      dataContent: dataContent[stepTwoStatus] || "2",
      current: allowTokenStatus === "success",
      stepClassName:
        stepTwoStatus === "success" ? "idle" : stepClassName[stepTwoStatus],
      messageClassName: messageClassName2[stepTwoStatus],
    };

    setTransactionStepsState([updatedFirstStep, updatedSecondStep]);
  }, [allowTokenStatus, stepTwoStatus]);

  return (
    <dialog id="transaction_modal" className="modal" ref={ref}>
      <div className="modal-box relative max-w-md bg-white transition-all duration-500 ease-in-out">
        <div className="flex items-start justify-between">
          <h4 className="text-lg font-bold">{label}</h4>
          <Button
            className="border-none font-bold text-black"
            size="sm"
            onClick={() => dialogRef?.current?.close()}
          >
            X
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-info p-2 text-white">
          <ExclamationCircleIcon height={32} width={32} />
          <p className="text-sm">
            You need to approve Gardens on the {token} contract. This is a two
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
                    className={`text-left text-sm ${step.messageClassName}`}
                  >
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
