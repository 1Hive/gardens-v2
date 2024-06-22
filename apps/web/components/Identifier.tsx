import React from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { capitalize } from "@/utils/text";

type IdentifierProps = {
  icon?: React.ReactNode;
  count: number | string;
  label: string;
};

export const Identifier = ({ icon, count, label }: IdentifierProps) => {
  const iconClassNames = "h-6 w-6";
  const defaultIcon = <UserGroupIcon className={iconClassNames} />;

  return (
    <div className="text-neutral-soft-content flex h-full items-center gap-2">
      {icon ? (
        <div className={iconClassNames}>{icon}</div>
      ) : (
        <div className={iconClassNames}>{defaultIcon}</div>
      )}
      <p className="">
        {capitalize(label)}: {count}
      </p>
    </div>
  );
};
