import React from "react";
import type { HTMLAttributes } from "react";
import cn from "classnames";

type Type = "funding" | "streaming" | "signaling";
type Status = "active" | "inactive" | "disputed" | "resolved" | "paused";

type TypeStyles = Record<Type, HTMLAttributes<HTMLSpanElement>["className"]>;

interface BadgeProps {
  type: Type;
  status?: Status;
  classNames?: string;
}

// TODO!: add real styles, this is just a placeholder
// TODO: comment: we might hae 2 types of Badges, the ones that are used pool page and the ones that are used in proposals page (this ones are more dynamic and used the status prop)

const TYPE_STYLES: TypeStyles = {
  funding: "bg-primary text-black",
  streaming: "bg-primary text-white",
  signaling: "bg-secondary text-white",
};

export function Badge({ type, status, classNames }: BadgeProps) {
  return (
    <span
      className={`${TYPE_STYLES[type] ?? ""} ${cn({
        // TODO!: add real styles, this is just a placeholder for status
        "border-2": status === "active",
        "border-4": status === "inactive",
        "border-8": status === "disputed",
        "border-10": status === "resolved",
      })} badge w-28 p-4 font-semibold ${classNames}`}
    >
      {type}
    </span>
  );
}
