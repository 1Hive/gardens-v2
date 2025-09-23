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
  "rounded-md p-4 flex flex-col gap-2 border border-transparent transition-colors";

const infoBoxStyles: Record<InfoBoxStyles, string> = {
  info: "bg-tertiary-soft text-tertiary-content dark:bg-tertiary-dark-base/70 dark:text-neutral-inverted-content dark:border-tertiary-dark-border/80",
  success:
    "bg-primary-soft text-primary-content dark:bg-primary-dark-base/70 dark:text-neutral-inverted-content dark:border-primary-dark-border/80",
  warning:
    "bg-secondary-soft text-secondary-content dark:bg-secondary-dark-base/70 dark:text-neutral-inverted-content dark:border-secondary-dark-border/80",
  error:
    "bg-danger-soft text-danger-content dark:bg-danger-dark-base/70 dark:text-neutral-inverted-content dark:border-danger-dark-border/80",
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
      className={`${BASE_STYLES} ${infoBoxStyles[infoBoxType]} ${className ?? ""}`.trim()}
    >
      <div className="flex items-center gap-2">
        {!hideIcon && (
          <div className="flex h-5 w-5 items-center justify-center text-inherit">
            {icon ?? <InformationCircleIcon className="h-5 w-5" />}
          </div>
        )}
        <h6>{title}</h6>
      </div>
      <p
        className={`text-sm leading-5 text-inherit first-letter:uppercase text-left ${contentStyle ?? ""}`.trim()}
      >
        {children ?? content}
      </p>
    </div>
  );
}
