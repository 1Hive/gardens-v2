import React from "react";
import { format } from "date-fns"; // Library for date formatting

interface DateComponentProps {
  timestamp: number; // Unix timestamp in milliseconds
  className?: string; // Optional Tailwind classes for styling
}

export const DateComponent: React.FC<DateComponentProps> = ({
  timestamp,
  className,
}) => {
  const date = new Date(timestamp * 1000);
  const formattedDate = format(date, "MMMM, do"); // Format as "March, 10th"

  return <span className={className}>{formattedDate}</span>;
};
