import React from "react";
import { format } from "date-fns";

interface DateComponentProps {
  timestamp: number; // Unix timestamp in seconds
  className?: string;
}

export const DateComponent: React.FC<DateComponentProps> = ({
  timestamp,
  className,
}) => {
  const date = new Date(timestamp * 1000);
  const formattedDate = format(date, "MMMM, do"); // Format as "March, 10th"
  const formattedTime = format(date, "HH:MM"); // Format as "10:30"

  return (
    <span
      className={`tooltip cursor-default ${className}`}
      data-tip={formattedTime}
    >
      {formattedDate}
    </span>
  );
};
