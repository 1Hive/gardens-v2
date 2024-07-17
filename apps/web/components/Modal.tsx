"use client";
import { LockClosedIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { MouseEventHandler, ReactElement, ReactNode, forwardRef } from "react";

interface ModalProps {
  icon?: ReactNode;
  title?: string;
  onClose: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
}

export type Ref = HTMLDialogElement;

export default forwardRef<Ref, ModalProps>(function Modal(
  { icon, title, onClose, children },
  ref,
) {
  return (
    <dialog className="modal " ref={ref}>
      {/* Modal box */}
      <div className="flex max-w-xl flex-col gap-8 rounded-md bg-white p-8 transition-all duration-500 ease-in-out">
        <div className="flex flex-1 items-center justify-between gap-6">
          <div className="flex gap-4">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center">
                {icon}
              </div>
            )}
            <h3>{title}</h3>
          </div>
          <div className="">
            <button onClick={onClose} className="h-8 w-8 cursor-pointer ">
              <XMarkIcon />
            </button>
          </div>
        </div>
        {children}
      </div>
    </dialog>
  );
});
