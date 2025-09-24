"use client";

import React from "react";
import { LoadingSpinner } from "./LoadingSpinner";

type LoadingToastProps = {
  message: React.ReactNode;
};

export function LoadingToast({ message }: LoadingToastProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <LoadingSpinner size="loading-sm" />
      <span className="font-medium text-sm text-neutral-soft-content whitespace-nowrap">
        {message}
      </span>
    </div>
  );
}
