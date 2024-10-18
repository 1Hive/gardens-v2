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
}

export function Modal({
  icon,
  title,
  onClose,
  children,
  isOpen,
  className = "",
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

  return (
    <dialog
      className={`modal max-sm:modal-bottom ${className}`}
      ref={dialogRef}
    >
      <div className="modal-box max-w-5xl overflow-visible w-fit flex flex-col rounded-2xl bg-primary p-0">
        <div className="flex items-center justify-between w-full p-2 shadow">
          <div className="flex gap-4 items-center p-2">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center">
                {icon}
              </div>
            )}
            <h3>{title}</h3>
          </div>
          <div className="flex items-center pl-16 overflow-auto h-4/5">
            <button onClick={handleClose} className="h-7 w-7 cursor-pointer">
              <XMarkIcon />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-auto w-fit">{children}</div>
      </div>
    </dialog>
  );
}
