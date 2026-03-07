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

const iconSizeClasses: Record<NonNullable<InfoWrapperProps["size"]>, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
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
  const iconSizeClass = iconSizeClasses[size];

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
            <InformationCircleIcon className={iconSizeClass} />
          ))}
      </div>
    </div>
  );
}
