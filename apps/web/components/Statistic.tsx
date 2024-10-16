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
      className={`flex items-center gap-2 text-neutral-soft-content ${className}`}
    >
      <div
        className={"tooltip flex items-center gap-2 max-w-sm"}
        data-tip={tooltip}
      >
        {icon && <div className="w-6 h-6">{icon}</div>}
      </div>
      {label && (
        <p className="first-letter:uppercase">
          {label}: {count}
        </p>
      )}
      {children}
    </div>
  );
};
