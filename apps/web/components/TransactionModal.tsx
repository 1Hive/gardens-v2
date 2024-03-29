import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button } from "./Button";
import { forwardRef } from "react";

type TransactionModalProps = {
  label: string;
  children: React.ReactNode;
  isSuccess: boolean;
  isFailed: boolean;
};

export const TransactionModal = forwardRef<
  HTMLDialogElement,
  TransactionModalProps
>(function TransactionModal({ label, children, isSuccess, isFailed }, ref) {
  const dialogRef = typeof ref === "function" ? { current: null } : ref;

  return (
    <dialog id="transaction_modal" className="modal" ref={ref}>
      <div className="modal-box relative max-w-xl bg-surface">
        {/* Content */}
        <div className="-px-2 absolute left-0 top-[45%] flex w-full items-center justify-center -space-x-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <ChevronRightIcon
              key={i}
              className={`h-4 w-4 transition-colors duration-200 ease-in ${
                isSuccess
                  ? "text-success"
                  : isFailed
                    ? "text-error"
                    : "text-secondary"
              }`}
            />
          ))}
        </div>

        <div className="flex items-start justify-between pb-10">
          <h4 className="text-2xl">{label}</h4>
          <Button size="sm" onClick={() => dialogRef?.current?.close()}>
            close
          </Button>
        </div>

        <div className="flex h-48 overflow-hidden px-6">{children}</div>
      </div>
    </dialog>
  );
});

type TransactionModalStepProps = {
  tokenSymbol?: string;
  status: "success" | "error" | "idle" | "loading";
  isLoading: boolean;
  failedMessage: string;
  successMessage: string;
  type?: string;
};

export const TransactionModalStep = ({
  tokenSymbol,
  status,
  isLoading,
  failedMessage,
  successMessage,
  type,
}: TransactionModalStepProps) => {
  const isSuccess = status === "success";
  const isFailed = status === "error";
  const loadingClass = isLoading ? "animate-pulse" : "animate-none";
  const successClass = isSuccess ? "text-success" : "";
  const errorClass = isFailed ? "text-error" : "";

  return (
    <div className="relative flex flex-1 flex-col items-center justify-start transition-all duration-300 ease-in-out">
      <div
        className={`rounded-full bg-secondary ${isFailed ? "border-[1px] border-error first:bg-error" : isSuccess ? "border-[1px] border-success first:bg-success" : ""}`}
      >
        <div
          className={`relative flex h-28 w-28 items-center rounded-full border-8 border-white p-1 text-center ${loadingClass}`}
        />
      </div>
      <span
        className={`absolute top-9 h-fit max-w-min text-center leading-5 text-white ${successClass}`}
      >
        {tokenSymbol}
      </span>
      <p
        className={`absolute bottom-0 max-w-xs px-10 text-center text-sm ${successClass} ${errorClass}`}
      >
        {isFailed
          ? failedMessage
          : isSuccess
            ? successMessage
            : "Waiting for signature"}
      </p>
    </div>
  );
};
