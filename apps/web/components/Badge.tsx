import React from "react";

interface Badge {
  type: "funding" | "streaming" | "signaling";
}

export function Badge({ type }: Badge) {
  const colors = {
    funding: "primary",
    streaming: "secondary",
    signaling: "accent",
  };

  return (
    <span className={`badge w-28 p-4 font-semibold bg-${colors[type]}`}>
      {type}
    </span>
  );
}
