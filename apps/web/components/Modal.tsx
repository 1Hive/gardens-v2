"use client";
import { ReactNode, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
  icon?: ReactNode;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  isOpen: boolean;
  className?: string;
  size?:
    | "extra-small"
    | "small"
    | "medium"
    | "large"
    | "extra-large"
    | "ultra-large";
  footer?: ReactNode | null;
  testId?: string;
}

export function Modal({
  icon,
  title,
  onClose,
  children,
  isOpen,
  className = "",
  size = "medium",
  footer = null,
  testId,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogElement = dialogRef.current;

    if (isOpen) {
      dialogElement?.showModal();
    } else {
      dialogElement?.close();
    }

    const handleDialogClose = () => {
      if (!dialogElement?.open) {
        onClose();
      }
    };

    dialogElement?.addEventListener("close", handleDialogClose);

    return () => {
      dialogElement?.removeEventListener("close", handleDialogClose);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    onClose();
    dialogRef.current?.close();
  };

  const sizeMap = {
    "extra-small": "max-w-sm",
    small: "max-w-lg",
    medium: "max-w-xl",
    large: "max-w-2xl",
    "extra-large": "max-w-4xl",
    "ultra-large": "max-w-6xl",
  };

  return (
    <dialog
      className={`modal max-sm:modal-bottom ${className}`}
      ref={dialogRef}
    >
      <div
        className={`modal-box flex flex-col rounded-2xl bg-primary p-0 ${sizeMap[size]}`}
      >
        <div className="flex items-center justify-between w-full p-2 shadow">
          <div className="flex gap-4 items-center p-2">
            {icon != null && (
              <div className="flex h-12 w-12 items-center justify-center">
                {icon}
              </div>
            )}
            <h3>{title ?? ""}</h3>
          </div>
          <div className="flex items-center pl-16 overflow-auto h-4/5">
            <button
              onClick={handleClose}
              className="h-7 w-7 cursor-pointer"
              data-testid={`modal-close-button-${testId}`}
            >
              <XMarkIcon />
            </button>
          </div>
        </div>
        <div className={"p-8 overflow-auto overflow-x-hidden w-full"}>
          {children}
        </div>
        {footer != null && (
          <div className="modal-action flex justify-end p-4 mt-0 border-t border-t-[#80808021]">
            {footer}
          </div>
        )}
      </div>

      <form method="dialog" className="modal-backdrop">
        <button data-testid={`modal-close-backdrop-${testId}`}>close</button>
      </form>
    </dialog>
  );
}
