import React from "react";

type IdentifierProps = {
  icon?: React.ReactNode;
  count?: number | string | React.ReactNode;
  label?: string | React.ReactNode;
  children?: React.ReactNode;
  tooltip?: string;
  className?: string;
};

export const Statistic = ({
  icon,
  count,
  label,
  children,
  className,
}: IdentifierProps) => {
  return (
    <div
      className={`flex items-center gap-2 text-neutral-soft-content ${className}`}
    >
      {icon && <div className="h-6 w-6">{icon}</div>}
      {(label ?? count) && (
        <p className="first-letter:uppercase">
          {label}: {count}
        </p>
      )}
      {children}
    </div>
  );
};
