import React, { ReactNode } from "react";

type Props = {
  className?: string;
  children: ReactNode;
  isLoading: boolean;
  rows?: number;
};

export const Skeleton = ({
  className,
  children,
  isLoading,
  rows = 1,
}: Props) => {
  return isLoading ?
      <div className="flex flex-col gap-1 w-full">
        {Array(rows)
          .fill(0)
          .map((_, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={`[--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171] skeleton h-5 w-full my-1 rounded-md ${className}`}
            />
          ))}
      </div>
    : <>{children}</>;
};
