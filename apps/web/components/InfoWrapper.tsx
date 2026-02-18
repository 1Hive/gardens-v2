import React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type InfoWrapperProps = {
  tooltip: string;
  children?: React.ReactNode;
  className?: string;
  customIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  hoverOnChildren?: boolean;
  hideIcon?: boolean;
  contentFlex?: boolean;
};

const sizeMap = {
  sm: { width: 18, height: 18 },
  md: { width: 20, height: 20 },
  lg: { width: 24, height: 24 },
};

export function InfoWrapper({
  tooltip,
  children,
  className,
  customIcon,
  size = "md",
  hoverOnChildren = false,
  hideIcon = false,
  contentFlex = false,
}: InfoWrapperProps): JSX.Element {
  const { width, height } = sizeMap[size];

  return (
    <div className="flex gap-1 items-center justify-center mx-1 h-fit">
      {!hoverOnChildren && (
        <div className={`${contentFlex ? "flex-1" : ""}`}>{children}</div>
      )}
      <div
        className={`tooltip flex gap-1 cursor-pointer items-center [&>svg]:text-primary-content max-w-sm [&>svg]:stroke-2 ${className}`}
        data-tip={tooltip}
      >
        {hoverOnChildren && (
          <div className={`${contentFlex ? "flex-1" : ""}`}>{children}</div>
        )}
        {!hideIcon &&
          (customIcon ?? (
            <InformationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          ))}
      </div>
    </div>
  );
}
