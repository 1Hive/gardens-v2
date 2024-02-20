"use client";
import React, { Fragment, useState, FC } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components";
import { XMarkIcon } from "@heroicons/react/24/outline";

type FormModalProps = {
  label: string;
  title: string;
  description: string;
  children: any;
};

export const FormModal: FC<FormModalProps> = ({
  label,
  title,
  description,
  children,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(!open)} variant="fill">
        {label}
      </Button>
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="border2 relative my-8 min-w-[50%] max-w-[80%] transform overflow-hidden rounded-lg bg-surface px-4 pb-4 pt-5 text-left shadow-xl transition-all">
                  <div>
                    <div className="text-center sm:mt-5">
                      <Dialog.Title
                        as="h2"
                        className="text-xl font-semibold leading-6 text-gray-900"
                      >
                        {title}
                      </Dialog.Title>
                      <div className="mt-1">
                        <p className="text-sm">{description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 h-fit">{children}</div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};
