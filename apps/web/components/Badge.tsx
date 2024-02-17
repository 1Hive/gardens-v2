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
  "bg-primary text-black",
  "bg-primary text-white",
  "bg-secondary text-white",
];

//variants for Statys Badge
const STATUS_STYLES = [
  "badge-success",
  "bg-primary",
  "bg-warning",
  "bg-primary",
  "bg-error",
];

const BASE_STYLES = "badge w-28 p-4 font-semibold";
const BASE_STYLES_STATUS = "badge text-white min-w-20 p-4 text-center";

export function Badge({ type, classNames }: BadgeProps) {
  type = type - 1;
  return (
    <>
      <span
        className={`${
          TYPE_STYLES[type] ?? "bg-accent text-black"
        } ${BASE_STYLES} ${classNames}`}
      >
        {getTypeName(Number(type)) ?? "no type"}
      </span>
    </>
  );
}

export function StatusBadge({ status, classNames }: StatusBadgeProps) {
  status = status - 1;
  return (
    <>
      <span
        className={`${STATUS_STYLES[status] ?? "bg-primary"} 
           ${BASE_STYLES_STATUS} ${classNames}`}
      >
        {getStatusName(status) ?? "no status"}
      </span>
    </>
  );
}

const getTypeName = (type: number) => {
  const typeArray = ["funding", "signaling", "streaming"];
  return typeArray[type];
};

const getStatusName = (status: number) => {
  const statusArray = ["active", "paused", "cancelled", "executed", "inactive"];
  return statusArray[status];
};
