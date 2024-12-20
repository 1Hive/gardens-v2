import React, { useRef, useState } from "react";
import { ChartBarSquareIcon } from "@heroicons/react/24/outline";

export function Metrics({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleButtonClick = () => {
    setIsOpen(true);
    if (isOpen) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  return (
    <>
      <button
        onClick={handleButtonClick}
        className="fixed top-50 left-48 tooltip hover:opacity-90 z-50"
        data-tip="Click to see community metrics"
      >
        <ChartBarSquareIcon className="w-10 h-10 text-primary-button" />
      </button>
      {isOpen && (
        <div ref={panelRef} className="">
          <div className="h-60 section-layout">
            <h2>Community metrics</h2>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
