import React from "react";

export const CeloLogo = ({
  className,
  height,
}: {
  className?: string;
  height?: number;
}) => {
  return (
    <svg
      height={height}
      viewBox="0 0 250 250"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className={className}
    >
      <style type="text/css">{".st0 { fill: #FCFF52; }"}</style>
      <circle className="st0" cx="125" cy="125" r="125" />
      <path
        d="M188.9,60.7H60.7v128.2h128.2v-44.8h-21.3c-7.3,16.3-23.8,27.7-42.7,27.7c-26,0-47.1-21.3-47.1-47.1
      c0-25.9,21.1-47,47.1-47c19.3,0,35.8,11.7,43.1,28.4h20.9V60.7z"
      />
    </svg>
  );
};
