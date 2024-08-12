import React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type InfoIconProps = {
  content: string;
  children: React.ReactNode;
  classNames?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { width: 18, height: 18 },
  md: { width: 22, height: 22 },
  lg: { width: 2, height: 2 },
};

export function InfoWrapper({
  content,
  children,
  classNames,
  size = "md",
}: InfoIconProps): JSX.Element {
  const { width, height } = sizeMap[size];

  return (
    <div
      className={`tooltip ml-2 flex cursor-default items-center max-w-sm ${classNames}`}
      data-tip={content}
    >
      {children}
      <InformationCircleIcon
        className="ml-2 stroke-2 text-primary-content"
        width={width}
        height={height}
      />
    </div>
  );
}
