import React from "react";
import {
  CurrencyDollarIcon,
  HandThumbUpIcon,
} from "@heroicons/react/24/outline";
import { PoolTypes, ProposalStatus } from "@/types";

type BadgeProps = {
  type?: number;
  status?: number;
  label?: string;
  className?: string;
  icon?: React.ReactNode;
  isCapitalize?: boolean;
  tooltip?: string;
  children?: React.ReactNode;
};

// Styles for different pool badge types
const POOL_TYPE_STYLES = [
  "bg-primary-soft text-primary-content dark:bg-primary-soft-dark",
  "bg-tertiary-soft dark:bg-tertiary-dark text-tertiary-content",
];

// Styles for different proposal status badge
const PROPOSAL_STATUS_STYLES = [
  "bg-danger-soft dark:bg-danger-soft-dark text-danger-content",
  "bg-primary-soft text-primary-content dark:bg-primary-soft-dark",
  "bg-secondary-soft dark:bg-secondary-soft-dark text-secondary-content",
  "bg-danger-soft dark:bg-danger-soft-dark text-danger-content",
  "bg-tertiary-soft dark:bg-tertiary-dark text-tertiary-content",
  "bg-danger-soft dark:bg-danger-soft-dark text-danger-content",
  "bg-danger-soft dark:bg-danger-soft-dark text-danger-content",
];

const BASE_STYLES =
  "border-none rounded-full leading-5 py-1 px-2 cursor-default";

export function Badge({
  type,
  status,
  label,
  className,
  tooltip,
  icon,
  children,
}: BadgeProps): JSX.Element {
  const ispoolTypeDefined = type !== undefined;

  // Determine the appropriate styles based on whether it's a proposal status badge or a pool type badge
  const styles =
    status != null ?
      `${
        PROPOSAL_STATUS_STYLES[status] ??
        "bg-secondary-soft text-secondary-hover-content dark:bg-secondary-dark-base/70 dark:text-secondary-dark-text"
      }`
    : ispoolTypeDefined ?
      `${
        POOL_TYPE_STYLES[type] ??
        "bg-tertiary-soft text-tertiary-hover-content dark:text-tertiary-dark-text"
      }`
    : "bg-tertiary-soft text-tertiary-hover-content dark:text-tertiary-dark-text";

  // Determine the label content
  const content =
    children ??
    (status != null ? ProposalStatus[status] : undefined) ??
    (ispoolTypeDefined ? PoolTypes[type] : undefined) ??
    label;

  //For type => conditionally set the icon based on type === poolTypes[type]
  const iconIncluded =
    icon ??
    (() => {
      const iconMap: { [key: string]: React.ReactNode } = {
        signaling: <HandThumbUpIcon className="h-5 w-5 text-primary-content" />,
        funding: (
          <CurrencyDollarIcon className="h-5 w-5 dark:text-tertiary-content" />
        ),
      };
      return type != null ? iconMap[PoolTypes[type]] ?? null : null;
    })();

  return (
    <div
      className={`${BASE_STYLES} ${styles} ${tooltip ? "tooltip cursor-pointer" : ""} ${className} flex items-center gap-1`}
      data-tip={tooltip}
    >
      {Boolean(iconIncluded) && (
        <span className={`h-5 w-5 ${styles}`}>{iconIncluded}</span>
      )}
      <p className="first-letter:uppercase text-sm font-semibold text-inherit">
        {content}
      </p>
    </div>
  );
}
