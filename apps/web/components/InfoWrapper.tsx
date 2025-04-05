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
};

const sizeMap = {
  sm: { width: 18, height: 18 },
  md: { width: 22, height: 22 },
  lg: { width: 2, height: 2 },
};

export function InfoWrapper({
  tooltip,
  children,
  className,
  customIcon,
  size = "md",
  hoverOnChildren = false,
  hideIcon = false,
}: InfoWrapperProps): JSX.Element {
  const { width, height } = sizeMap[size];

  return (
    <div className="flex gap-1 items-center mx-1">
      {!hoverOnChildren && <span>{children}</span>}
      <div
        className={`tooltip flex gap-1 cursor-pointer items-center [&>svg]:text-primary-content max-w-sm [&>svg]:stroke-2 ${className}`}
        data-tip={tooltip}
      >
        {hoverOnChildren && <span>{children}</span>}
        {!hideIcon &&
          (customIcon ?? (
            <InformationCircleIcon width={width} height={height} />
          ))}
      </div>
    </div>
  );
}
