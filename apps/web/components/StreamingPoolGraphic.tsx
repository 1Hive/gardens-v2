"use client";

import React from "react";

type Props = {
  className?: string;
};

export function StreamingPoolGraphic({ className = "" }: Props) {
  const bars = [
    { id: "a", height: 42 },
    { id: "b", height: 28 },
    { id: "c", height: 36 },
    { id: "d", height: 32 },
    { id: "e", height: 40 },
    { id: "f", height: 30 },
    { id: "g", height: 38 },
    { id: "h", height: 26 },
    { id: "i", height: 35 },
    { id: "j", height: 29 },
    { id: "k", height: 41 },
    { id: "l", height: 33 },
  ];

  return (
    <div
      className={`h-16 w-full rounded-lg mt-4 overflow-hidden relative border border-[#0f645f]/40 bg-gradient-to-r from-[#063a40] via-[#09525a] to-[#0a6a73] ${className}`}
    >
      <div className="absolute inset-x-0 top-2 h-6 opacity-60">
        <svg
          viewBox="0 0 320 48"
          className="w-full h-full"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 28 C50 6, 100 50, 160 24 C210 2, 260 44, 320 20"
            stroke="url(#streamGradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="streamGradient" x1="0" y1="0" x2="320" y2="0">
              <stop offset="0%" stopColor="#5be7d6" />
              <stop offset="50%" stopColor="#86efe2" />
              <stop offset="100%" stopColor="#b3f6ee" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-7 px-3 flex items-end gap-1">
        {bars.map((bar) => (
          <div
            key={bar.id}
            className="flex-1 rounded-t-full bg-gradient-to-t from-[#26b9aa] to-[#7ce8dc]"
            style={{
              height: `${bar.height}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
