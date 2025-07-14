import React from "react";

export const CheckIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M27,23,V5,H9,M23,9,H5,V27,H23,V9,Z" />
    </svg>
  );
};
