import React from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { capitalize } from "@/utils/text";
import { DisplayNumber } from "./DisplayNumber";
import { Dnum } from "dnum";

type IdentifierProps = {
  icon?: React.ReactNode;
  count: string | Dnum | number;
  label: string;
  children?: React.ReactNode;
  tokenSymbol?: string;
};

export const Statistic = ({
  icon,
  count,
  label,
  children,
  tokenSymbol
}: IdentifierProps) => {
  const iconClassNames = "h-6 w-6";
  const defaultIcon = <UserGroupIcon className={iconClassNames} />;

  if (typeof count === "number") {
    count = count.toString();
  }

  return (
    <div className="flex items-center gap-2 text-neutral-soft-content">
      {icon ? (
        <div className={iconClassNames}>{icon}</div>
      ) : (
        <div className={iconClassNames}>{defaultIcon}</div>
      )}
      <div className="display flex">
        <p className="">{capitalize(label)}:</p>
        <DisplayNumber number={count} compact={true} tokenSymbol={tokenSymbol}/>
      </div>
      {children}
    </div>
  );
};
