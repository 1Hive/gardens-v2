"use client";
import React from "react";
import { useProposals } from "@/hooks/useProposals";

export default function Proposals() {
  const { proposals } = useProposals();

  return (
    <div>
      {proposals.map((proposal) => (
        <h2>hello</h2>
      ))}
    </div>
  );
}
