"use client";
import { ReactNode, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
  icon?: ReactNode;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  isOpen: boolean;
}

export function Modal({ icon, title, onClose, children, isOpen }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose?.();
    dialogRef.current?.close();
  };

  return (
    <dialog className="modal max-sm:modal-bottom" ref={dialogRef}>
      <div className="modal-box max-w-5xl w-fit flex flex-col gap-8 rounded-3xl bg-primary p-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex gap-4">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center">
                {icon}
              </div>
            )}
            <h3>{title}</h3>
          </div>
          <div className="flex items-center">
            <button onClick={handleClose} className="h-7 w-7 cursor-pointer">
              <XMarkIcon />
            </button>
          </div>
        </div>
        {children}
      </div>
    </dialog>
  );
}