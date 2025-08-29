import React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type InfoBoxStyles = "success" | "warning" | "error" | "info";

type InfoBoxProps = {
  infoBoxType: InfoBoxStyles;
  title?: string;
  content?: string;
  contentStyle?: string;
  className?: string;
  icon?: React.ReactNode;
  hideIcon?: boolean;
  children?: React.ReactNode;
};

const BASE_STYLES =
  "rounded-md p-2 flex flex-col items-start justify-center gap-2";
// Styles for different info box types

const infoBoxStyles = {
  info: "bg-tertiary-soft text-tertiary-content dark:bg-tertiary-content",
  success: "bg-primary-soft text-primary-content",
  warning: "bg-secondary-soft text-secondary-content",
  error: "bg-danger-soft text-danger-content",
};

export function InfoBox({
  infoBoxType,
  content,
  title,
  contentStyle,
  className,
  icon,
  hideIcon,
  children,
}: InfoBoxProps): JSX.Element {
  return (
    <div
      className={`${BASE_STYLES} ${infoBoxStyles[infoBoxType]} ${className}`}
    >
      <div className="flex items-center gap-2">
        {!hideIcon && (
          <div className="h-5 w-5 text-inherit flex-items-center justify-center">
            {" "}
            {icon ?? (
              <InformationCircleIcon className="h-5 w-5 dark:text-tertiary-soft" />
            )}
          </div>
        )}
        <h6>{title}</h6>
      </div>
      <p
        className={`text-sm leading-5 text-neutral-content first-letter:uppercase text-left ${contentStyle}`}
      >
        {children ?? content}
      </p>
    </div>
  );
}
