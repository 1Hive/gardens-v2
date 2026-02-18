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
      className={`flex items-center text-neutral-soft-content ${icon ? "gap-2" : "gap-0"} ${className} `}
    >
      <div
        className={"tooltip flex items-center gap-2 max-w-sm"}
        data-tip={tooltip}
      >
        {icon != null && (
          <div className="w-5 h-5 sm:w-5 sm:h-5 cursor-pointer">{icon}</div>
        )}
      </div>
      {label != null && (
        <p className="first-letter:uppercase text-sm sm:text-[16px] text-neutral-content">
          {label}: {count}
        </p>
      )}
      {children}
    </div>
  );
};
