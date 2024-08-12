import React from "react";
import { capitalize } from "@/utils/text";

type IdentifierProps = {
  icon?: React.ReactNode;
  count?: number | string;
  label: string;
  children?: React.ReactNode;
  tooltip?: string;
};

export const Statistic = ({
  icon,
  count,
  label,
  children,
  tooltip,
}: IdentifierProps) => {
  return (
    <div className="flex items-center gap-2 text-neutral-soft-content">
      <div
        className={"tooltip flex cursor-default items-center max-w-sm"}
        data-tip={tooltip}
      >
        {icon && <div className="mr-1">{icon}</div>}
        {label && (
          <p>
            {capitalize(label)}: {count}
          </p>
        )}
      </div>
      {children}
    </div>
  );
};
