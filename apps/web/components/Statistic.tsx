import React from "react";
import { capitalize } from "@/utils/text";

type IdentifierProps = {
  icon?: React.ReactNode;
  count?: number | string;
  label: string;
  children?: React.ReactNode;
};

export const Statistic = ({
  icon,
  count,
  label,
  children,
}: IdentifierProps) => {
  const iconClassNames = "h-6 w-6";

  return (
    <div className="flex items-center gap-2 text-neutral-soft-content">
      {icon && <div className={iconClassNames}>{icon}</div>}
      {label && (
        <p>
          {capitalize(label)}: {count}
        </p>
      )}
      {children}
    </div>
  );
};
