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
};

// Styles for different pool badge types
const POOL_TYPE_STYLES = [
  "bg-secondary-soft text-secondary-content",
  "bg-secondary-soft text-secondary-content",
];

// Styles for different proposal status badge
const PROPOSAL_STATUS_STYLES = [
  "bg-danger-soft text-danger-content",
  "bg-primary-soft text-primary-content",
  "bg-secondary-soft text-secondary-content",
  "bg-danger-soft text-danger-content",
  "bg-tertiary-soft text-tertiary-content",
  "bg-danger-soft text-danger-content",
  "bg-danger-soft text-danger-content",
];

const BASE_STYLES =
  "border-none rounded-full leading-5 py-2 px-4 text-base cursor-default";

export function Badge({
  type,
  status,
  label,
  className,
  icon,
}: BadgeProps): JSX.Element {
  const isStatusBadge = status !== undefined;
  const ispoolTypeDefined = type !== undefined;

  // Determine the appropriate styles based on whether it's a proposal status badge or a pool type badge
  const styles =
    isStatusBadge ? `${PROPOSAL_STATUS_STYLES[status] ?? "bg-secondary-soft"}`
    : ispoolTypeDefined ?
      `${POOL_TYPE_STYLES[type] ?? "bg-tertiary-soft text-tertiary-content"}`
    : "bg-tertiary-soft text-tertiary-content";

  // Determine the label content
  const content =
    isStatusBadge ? ProposalStatus[status]
    : ispoolTypeDefined ? (PoolTypes[type] ?? label)
    : label;

  //For type => conditionally set the icon based on type === poolTypes[type]
  const iconIncluded =
    icon ??
    (() => {
      const iconMap: { [key: string]: React.ReactNode } = {
        signaling: <HandThumbUpIcon className="h-6 w-6 text-inherit" />,
        funding: <CurrencyDollarIcon className="h-6 w-6 text-inherit" />,
      };
      return type != null ? (iconMap[PoolTypes[type]] ?? null) : null;
    })();

  return (
    <div
      className={`${BASE_STYLES} ${styles} ${className} flex items-center gap-2`}
    >
      {iconIncluded && (
        <div className="h-6 w-6 text-inherit">{iconIncluded}</div>
      )}
      <h6 className="first-letter:uppercase">{content}</h6>
    </div>
  );
}
