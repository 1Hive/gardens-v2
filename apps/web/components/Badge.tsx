import React from "react";
import type { HTMLAttributes } from "react";
import cn from "classnames";

export type Type = "signaling" | "funding" | "streaming";
type Status =
  | "active"
  | "paused"
  | "cancelled"
  | "executed"
  | "inactive"
  | string;

type TypeStyles = Record<Type, HTMLAttributes<HTMLSpanElement>["className"]>;
type StatusStyles = Record<
  Status,
  HTMLAttributes<HTMLSpanElement>["className"]
>;

interface BadgeProps {
  type: Type;
  classNames?: string;
}

interface StatusBadgeProps {
  status: Status;
  classNames?: string;
}

// TODO!: add real styles, this is just a placeholder
//variant for common badge
const TYPE_STYLES: TypeStyles = {
  funding: "bg-primary text-black",
  streaming: "bg-primary text-white",
  signaling: "bg-secondary text-white",
};

//variants for Statys Badge
const STATUS_STYLES: StatusStyles = {
  active: "badge-success",
  paused: "bg-primary",
  cancelled: "bg-warning",
  executed: "bg-primary",
  inactive: "bg-error",
};

const BASE_STYLES = "badge w-28 p-4 font-semibold";
const BASE_STYLES_STATUS = "badge text-white min-w-20 p-4 text-center";

export function Badge({ type, classNames }: BadgeProps) {
  return (
    <>
      <span
        className={`${
          TYPE_STYLES[type] ?? "bg-accent text-black"
        } ${BASE_STYLES} ${classNames}`}
      >
        {type ?? "no type"}
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
        {status ?? "no type"}
      </span>
    </>
  );
}
