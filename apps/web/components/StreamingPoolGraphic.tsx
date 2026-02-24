"use client";

import React from "react";

type Props = {
  className?: string;
};

export function StreamingPoolGraphic({ className = "" }: Props) {
  const coins = [
    { id: "c1", left: "34%", top: "38%" },
    { id: "c2", left: "44%", top: "44%" },
    { id: "c3", left: "54%", top: "36%" },
    { id: "c4", left: "64%", top: "42%" },
  ];

  return (
    <div
      className={`h-16 w-full rounded-lg mt-4 overflow-hidden relative border border-[#1c5b46] bg-[#102a24] ${className}`}
    >
      <div className="absolute inset-x-0 top-[24%] h-[52%] bg-[#175a49]" />
      <div className="absolute inset-x-0 top-[24%] h-[10%] bg-[#2aa06d]/70" />
      <div className="absolute inset-x-0 top-[62%] h-[10%] bg-[#0e3f36]" />

      <div className="absolute left-[18%] top-[16%] h-[68%] w-[5%] bg-[#1a6f52]" />
      <div className="absolute left-[46%] top-[16%] h-[68%] w-[5%] bg-[#1a6f52]" />
      <div className="absolute left-[73%] top-[16%] h-[68%] w-[5%] bg-[#1a6f52]" />

      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute h-[10px] w-[10px] rounded-full bg-[#ffcb3a] border border-[#e39b1b] shadow-[0_0_0_1px_#ffd96b_inset]"
          style={{ left: coin.left, top: coin.top }}
        >
          <div className="absolute left-[3px] top-[1px] h-[6px] w-[2px] bg-[#e38b14]" />
          <div className="absolute left-[1px] top-[3px] h-[2px] w-[6px] bg-[#e38b14]" />
        </div>
      ))}

      <div className="absolute left-[26%] top-[44%] h-[2px] w-[6%] bg-white/75" />
      <div className="absolute left-[57%] top-[44%] h-[2px] w-[6%] bg-white/75" />
    </div>
  );
}
