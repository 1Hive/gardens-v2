import React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type InfoIconProps = {
  content: string
  children: React.ReactNode;
  classNames?: string;
};

export function InfoIcon({
  content,
  children,
  classNames,
}: InfoIconProps): JSX.Element {

  return (
    <div
      className={`tooltip ml-2 flex cursor-pointer items-center text-primary-content ${classNames}`}
      data-tip={content}
    >
      {children}
      <InformationCircleIcon
        className="ml-2 stroke-2"
        width={22}
        height={22}
      />
    </div>
  );
}
