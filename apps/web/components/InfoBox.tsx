import React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type InfoBoxStyles = "success" | "warning" | "error" | "info";

type InfoBoxProps = {
  infoBoxType: InfoBoxStyles;
  content: string;
  contentStyle?: string;
  classNames?: string;
  icon?: React.ReactNode;
  hideIcon?: boolean;
};

const BASE_STYLES =
  "border-none rounded-[20px] p-4 flex items-center justify-center gap-4";
// Styles for different info box types

const infoBoxStyles = {
  info: "bg-tertiary-soft text-tertiary-content",
  success: "bg-primary-soft text-primary-content",
  warning: "bg-secondary-soft text-secondary-content",
  error: "bg-danger-soft text-danger-contentt",
};

export function InfoBox({
  infoBoxType,
  content,
  contentStyle,
  classNames,
  icon,
  hideIcon,
}: InfoBoxProps): JSX.Element {
  return (
    <div
      className={`${BASE_STYLES} ${infoBoxStyles[infoBoxType]} ${classNames}`}
    >
      {!hideIcon && (
        <div className="h-9 w-9 text-inherit">
          {" "}
          {icon ?? (
            <InformationCircleIcon className="h-9 w-9" />
          )}
        </div>
      )}
      <p
        className={`leading-5 text-neutral-content first-letter:uppercase ${contentStyle}`}
      >
        {content}
      </p>
    </div>
  );
}
