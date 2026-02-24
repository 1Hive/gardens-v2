"use client";

import React from "react";

type Props = {
  className?: string;
};

export function StreamingPoolGraphic({ className = "" }: Props) {
  const coins = [
    { id: "c1", left: "28%", top: "42%" },
    { id: "c2", left: "34%", top: "33%" },
    { id: "c3", left: "40%", top: "46%" },
    { id: "c4", left: "49%", top: "37%" },
    { id: "c5", left: "57%", top: "45%" },
    { id: "c6", left: "63%", top: "30%" },
    { id: "c7", left: "71%", top: "40%" },
  ];

  const flowLines = [
    { id: "l1", left: "22%", top: "34%", width: "4%" },
    { id: "l2", left: "25%", top: "52%", width: "3%" },
    { id: "l3", left: "44%", top: "31%", width: "5%" },
    { id: "l4", left: "52%", top: "54%", width: "4%" },
    { id: "l5", left: "67%", top: "36%", width: "3%" },
    { id: "l6", left: "75%", top: "50%", width: "4%" },
  ];

  const dots = [
    { id: "d1", left: "37%", top: "28%" },
    { id: "d2", left: "46%", top: "49%" },
    { id: "d3", left: "61%", top: "27%" },
    { id: "d4", left: "70%", top: "53%" },
  ];

  return (
    <div
      className={`h-16 w-full rounded-lg mt-4 overflow-hidden relative border border-[#1c5b46] bg-[#102a24] ${className}`}
    >
      <div className="absolute inset-x-0 top-[20%] h-[58%] bg-[#175a49]" />
      <div className="absolute inset-x-0 top-[20%] h-[12%] bg-[#2aa06d]/75" />
      <div className="absolute inset-x-0 top-[66%] h-[12%] bg-[#0e3f36]" />

      <div className="absolute left-[17%] top-[10%] h-[80%] w-[6%] bg-[#1a6f52]" />
      <div className="absolute left-[19%] top-[8%] h-[84%] w-[2%] bg-[#43bc75]/85" />
      <div className="absolute left-[42%] top-[10%] h-[80%] w-[6%] bg-[#1a6f52]" />
      <div className="absolute left-[44%] top-[8%] h-[84%] w-[2%] bg-[#43bc75]/85" />
      <div className="absolute left-[66%] top-[10%] h-[80%] w-[6%] bg-[#1a6f52]" />
      <div className="absolute left-[68%] top-[8%] h-[84%] w-[2%] bg-[#43bc75]/85" />

      <div className="absolute left-[32%] top-[20%] h-[58%] w-[1%] bg-[#103e34]/70" />
      <div className="absolute left-[55%] top-[20%] h-[58%] w-[1%] bg-[#103e34]/70" />

      {flowLines.map((line) => (
        <div
          key={line.id}
          className="absolute h-[2px] bg-white/80"
          style={{ left: line.left, top: line.top, width: line.width }}
        />
      ))}

      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute h-[4px] w-[4px] bg-[#66d85f]"
          style={{ left: dot.left, top: dot.top }}
        />
      ))}

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

      <div className="absolute left-[8%] top-[28%] h-[3px] w-[2%] bg-[#8ce9a5]/70" />
      <div className="absolute left-[11%] top-[46%] h-[3px] w-[1.5%] bg-[#8ce9a5]/70" />
      <div className="absolute right-[8%] top-[28%] h-[3px] w-[2%] bg-[#8ce9a5]/70" />
      <div className="absolute right-[11%] top-[46%] h-[3px] w-[1.5%] bg-[#8ce9a5]/70" />

      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_0%,transparent_78%,rgba(0,0,0,0.25)_100%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
    </div>
  );
}
