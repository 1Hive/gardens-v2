import React from "react";

type IdentifierProps = {
  icon?: React.ReactNode;
  count?: number | string | React.ReactNode;
  label?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  tooltip?: string;
};

export const Statistic = ({
  icon,
  count,
  label,
  children,
  tooltip,
  className,
}: IdentifierProps) => {
  return (
    <div
      className={`flex items-center tooltip gap-1 text-neutral-soft-content ${className}`}
      data-tip={tooltip}
    >
      <div className={"tooltip flex items-center gap-2 max-w-sm"}>
        {icon != null && <div className="w-6 h-6 cursor-pointer">{icon}</div>}
      </div>
      {label != null && (
        <p className="first-letter:uppercase text-md">
          {label}: {count}
        </p>
      )}
      {children}
    </div>
  );
};
