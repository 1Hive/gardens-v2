import React, { ReactNode } from "react";

type Props = { className?: string; children: ReactNode; isLoading: boolean };

export const Skeleton = ({ className, children, isLoading }: Props) => {
  return isLoading ?
      <div
        className={`[--fallback-b3:#f0f0f0] skeleton h-4 w-full my-1 rounded-md ${className}`}
      />
    : <>{children}</>;
};
