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
}: IdentifierProps) => {
  return (
    <div className="flex items-center gap-2 text-neutral-soft-content">
      {icon && <div className="w-6 h-6">{icon}</div>}
      <div className={"tooltip flex items-center max-w-sm"} data-tip={tooltip}>
        {label && (
          <p className="first-letter:uppercase">
            {label}: {count}
          </p>
        )}
      </div>
      {children}
    </div>
  );
};
