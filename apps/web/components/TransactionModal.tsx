"use client";

import React, {
  ForwardedRef,
  useEffect,
  useState,
  forwardRef,
  useMemo,
  useCallback,
} from "react";
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

// type Statuses = "idle" | "loading" | "success" | "error";

// type StatusConfig = {
//   message: string;
//   dataContent: string;
//   className: string;
//   messageClassName: string;
// };

export type TransactionProps = {
  message: string;
  status: "idle" | "waiting" | "loading" | "success" | "error";
  contractName: string;
  showClickToExplorer?: boolean;
};

// const statusConfig: Record<Statuses, StatusConfig> = {
//   idle: {
//     message: "waiting for approval",
//     dataContent: "",
//     className: "step",
//     messageClassName: "",
//   },
//   loading: {
//     message: "waiting for signature",
//     dataContent: "",
//     className: "step-info",
//     messageClassName: "text-info",
//   },
//   success: {
//     message: "transaction sent successfully",
//     dataContent: "✓",
//     className: "step-success",
//     messageClassName: "text-success",
//   },
//   error: {
//     message: "an error has occurred, please try again!",
//     dataContent: "X",
//     className: "step-error",
//     messageClassName: "text-error",
//   },
// };
export type TransactionModalProps = {
  label: string;
  // allowTokenStatus: Statuses;
  // stepTwoStatus: Statuses;
  // allowance?: bigint;
  // pendingAllowance?: boolean;
  // setPendingAllowance?: (_: boolean) => void;
  // token: string;
  // initialTransactionSteps: TransactionStep[];
  children?: React.ReactNode;
  transactions: TransactionProps[];
  closeModal: () => void;
};

export const TransactionModal = forwardRef<
  HTMLDialogElement,
  TransactionModalProps
>(function TransactionModal(
  {
    label,
    // allowTokenStatus,
    // stepTwoStatus,
    // initialTransactionSteps,
    children,
    transactions,
    // pendingAllowance,
    // setPendingAllowance,
    closeModal,
  }: TransactionModalProps,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  // const [transactionStepsState, setTransactionStepsState] = useState(initialTransactionSteps);

  // const currentStatusConfig = useMemo(() => statusConfig[allowTokenStatus], [allowTokenStatus]);

  // const handleCloseModal = useCallback(() => {
  //   setPendingAllowance?.(false);
  //   closeModal();
  // }, [setPendingAllowance, closeModal]);

  // useEffect(() => {
  //   const updatedFirstStep = {
  //     ...transactionStepsState[0],
  //     dataContent: pendingAllowance ? "✓" : currentStatusConfig.dataContent || "1",
  //     message: pendingAllowance
  //       ? "Allowance previously approved successfully!"
  //       : currentStatusConfig.message,
  //     stepClassName: pendingAllowance ? "step-success" : currentStatusConfig.className,
  //     messageClassName: pendingAllowance ? "text-success" : currentStatusConfig.messageClassName,
  //   };

  //   const updatedSecondStep = {
  //     ...transactionStepsState[1],
  //     message: statusConfig[stepTwoStatus].message,
  //     dataContent: statusConfig[stepTwoStatus].dataContent,
  //     current: allowTokenStatus === "success",
  //     stepClassName: stepTwoStatus === "success" ? "idle" : statusConfig[stepTwoStatus].className,
  //     messageClassName: statusConfig[stepTwoStatus].messageClassName,
  //   };

  //   if (stepTwoStatus === "success") {
  //     updatedSecondStep.message = "waiting for approval";
  //     updatedSecondStep.stepClassName = "idle";
  //     updatedSecondStep.dataContent = "2";
  //     updatedSecondStep.current = false;
  //     updatedSecondStep.messageClassName = "";
  //   }

  //   const newSteps = [updatedFirstStep, updatedSecondStep];

  //   if (JSON.stringify(newSteps) !== JSON.stringify(transactionStepsState)) {
  //     setTransactionStepsState(newSteps);
  //   }
  // }, [allowTokenStatus, stepTwoStatus, pendingAllowance, currentStatusConfig]);

  return (
    <Modal title={label} onClose={closeModal} ref={ref}>
      <div className="w-full">
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
      {children}
    </Modal>
  );
});
