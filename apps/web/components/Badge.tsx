import { proposalStatus, proposalTypes } from "@/types";
import React from "react";

interface BadgeProps {
  type: number;
  classNames?: string;
}

interface StatusBadgeProps {
  status: number;
  classNames?: string;
}

// TODO!: add real styles, this is just a placeholder
//variant for common badge
const TYPE_STYLES = [
  "bg-warning text-black",
  "bg-primary text-black",
  "bg-secondary text-white",
];

//variants for Status Badge
const STATUS_STYLES = ["badge-error", "bg-success", "bg-warning", "bg-neutral"];

const BASE_STYLES = "badge text-base leading-5 font-medium";

const BASE_STYLES_STATUS =
  "badge text-white min-w-20 p-4 text-center tracking-widest";

export function Badge({ type, classNames }: BadgeProps) {
  return (
    <>
      <span
        className={`${
          TYPE_STYLES[type] ?? "bg-accent text-black"
        } ${BASE_STYLES} ${classNames}`}
      >
        {proposalTypes[type] ?? "no type"}
      </span>
    </>
  );
}

export function StatusBadge({ status, classNames }: StatusBadgeProps) {
  return (
    <>
      <span
        className={`${STATUS_STYLES[status] ?? "bg-primary"} 
           ${BASE_STYLES_STATUS} ${classNames}`}
      >
        {proposalStatus[status] ?? "no status"}
      </span>
    </>
  );
}
