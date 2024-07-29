import React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type InfoIconProps = {
  content: string;
  children?: React.ReactNode;
  classNames?: string;
  customIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { width: 18, height: 18 },
  md: { width: 22, height: 22 },
  lg: { width: 2, height: 2 },
};

export function InfoIcon({
  content,
  children,
  classNames,
  customIcon,
  size = "md",
}: InfoIconProps): JSX.Element {
  const { width, height } = sizeMap[size];

  return (
    <div
      className={`tooltip flex gap-2 cursor-pointer items-center max-w-sm [&>svg]:text-primary-content [&>svg]:stroke-2 ${classNames}`}
      data-tip={content}
    >
      {children}
      {customIcon ?? <InformationCircleIcon width={width} height={height} />}
    </div>
  );
}
