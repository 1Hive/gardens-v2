import React, { ReactElement } from "react";

type Identifier = {
  icon?: ReactElement<{ className?: string }>;
  count: number;
  label: string;
};

export const Identifier = ({ icon, count, label }: Identifier) => {
  return (
    <div className="flex h-full items-center gap-1">
      {icon && <div className="text-fgNeutralSoft h-6 w-6">{icon}</div>}
      <p className="text-fgNeutralSoft">
        {label}: {count}
      </p>
    </div>
  );
};
