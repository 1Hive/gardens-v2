import React from "react";
import type { HTMLAttributes } from "react";
import cn from "classnames";

type Type = "funding" | "streaming" | "signaling";
type Status = "active" | "paused" | "cancelled" | "executed" | string;

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
const TYPE_STYLES: TypeStyles = {
  funding: "bg-primary text-black",
  streaming: "bg-primary text-white",
  signaling: "bg-secondary text-white",
};
const STATUS_STYLES: StatusStyles = {
  active: "bg-primary",
  paused: "bg-primary",
  cancelled: "bg-warning",
  executed: "bg-primary",
};

const BASE_STYLES = "badge w-28 p-4 font-semibold";
const BASE_STYLES_STATUS =
  "badge absolute right-3 top-3 text-black border-black";

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
        className={`${STATUS_STYLES[status] ?? "bg-transparet"} 
           ${cn({
             // TODO!: add real styles, this is just a placeholder for statuses
             "border-2": status === "active",
             "border-4": status === "paused",
             "border-8": status === "cancelled",
             "border-none bg-transparent": status === "executed",
           })} ${BASE_STYLES_STATUS} ${classNames}`}
      >
        {status ?? "no type"}
      </span>
    </>
  );
}
