import React from "react";
import { proposalStatus, poolTypes } from "@/types";
import {
  CurrencyDollarIcon,
  HandThumbUpIcon,
} from "@heroicons/react/24/outline";
import { capitalize } from "@/utils/text";

type BadgeProps = {
  type?: number;
  status?: number;
  label?: string;
  classNames?: string;
  icon?: React.ReactNode;
};

// Styles for different pool badge types
const POOL_TYPE_STYLES = [
  "bg-secondary-soft text-secondary-content",
  "bg-secondary-soft text-secondary-content",
];

// Styles for different proposal statuses badges
const PROPOSAL_STATUS_STYLES = [
  "bg-error-soft text-error-content",
  "bg-primary-soft text-primary-content",
  "bg-secondary-soft text-secondary-content",
  "bg-error-soft text-error-content",
  "bg-tertiary-soft text-tertiary-content",
];

const BASE_STYLES = "badge border-none leading-5 p-4 text-base";

export function Badge({
  type,
  status,
  label,
  classNames,
  icon,
}: BadgeProps): JSX.Element {
  const isStatusBadge = status !== undefined;

  // Determine the appropriate styles based on whether it's a proposal status badge or a pool type badge
  const styles = isStatusBadge
    ? `${PROPOSAL_STATUS_STYLES[status!] ?? "bg-secondary-soft"}`
    : `${POOL_TYPE_STYLES[type!] ?? "bg-tertiary-soft text-tertiary-content"}`;

  // Determine the label content
  const content = isStatusBadge
    ? proposalStatus[status!]
    : poolTypes[type!] ?? label;

  //For type => conditionally set the icon based on type == poolTypes[type]
  const iconIncluded =
    icon ??
    (() => {
      const iconMap: { [key: string]: React.ReactNode } = {
        signaling: <HandThumbUpIcon className="h-6 w-6 text-inherit" />,
        funding: <CurrencyDollarIcon className="h-6 w-6 text-inherit" />,
      };
      return type ? iconMap[poolTypes[type]] || null : null;
    })();

  return (
    <div
      className={`${BASE_STYLES} ${styles} ${classNames} flex items-center gap-2`}
    >
      {iconIncluded && (
        <div className="h-6 w-6 text-inherit">{iconIncluded}</div>
      )}
      {capitalize(content)}
    </div>
  );
}
