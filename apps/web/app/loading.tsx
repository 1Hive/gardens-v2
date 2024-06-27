"use client";

import { useEffect, useState } from "react";

export default function Loading() {
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => prev + 25);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 z-50 w-full">
      <div className="h-1 w-full">
        <div
          className="h-1 bg-tertiary-content"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
