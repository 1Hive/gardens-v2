import React from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";

type IdentifierProps = {
  icon?: React.ReactNode;
  count?: number | string | React.ReactNode;
  label?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export const Statistic = ({
  icon,
  count,
  label,
  children,
  className,
}: IdentifierProps) => {
  const iconClassNames = "h-6 w-6";
  const defaultIcon = <UserGroupIcon className={iconClassNames} />;

  return (
    <div
      className={`flex items-center gap-2 text-neutral-soft-content ${className ?? ""}`}
    >
      {icon ?
        <div className={iconClassNames}>{icon}</div>
      : <div className={iconClassNames}>{defaultIcon}</div>}
      {(label ?? count) && (
        <span>
          {label ?
            <span className="capitalize">{label}: </span>
          : ""}
          {count}
        </span>
      )}
      {children}
    </div>
  );
};
