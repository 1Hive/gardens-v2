import React from "react";

export const GnosisLogo = ({
  className,
  height,
}: {
  className?: string;
  height?: number;
}) => {
  return (
    <svg
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      version="1.1"
      x="0px"
      y="0px"
      viewBox="0 0 2500 2500"
      xmlSpace="preserve"
      className={className}
    >
      <style type="text/css">{".st1 { fill: #3E6957; }"}</style>
      <g id="Layer_x0020_1">
        <g id="_2234463039744">
          <path
            className="st1"
            d="M735,1423c72,0,142-24,199-68L478,899c-110,142-84,346,58,456c57,43,127,67,199,67l0,0V1423z"
          />
          <path
            className="st1"
            d="M2090,1098c0-72-24-142-68-199l-456,456c142,110,346,84,456-58C2066,1240,2090,1170,2090,1098z"
          />
          <path
            className="st1"
            d="M2320,602l-202,202c162,195,137,484-58,647c-171,143-418,143-589,0l-221,221l-221-221    c-195,162-484,137-647-58c-143-171-143-418,0-589L279,701l-98-99C62,797,0,1021,0,1250c0,690,560,1250,1250,1250    s1250-560,1250-1250C2501,1022,2437,797,2320,602z"
          />
          <path
            className="st1"
            d="M2154,387C1678-112,887-131,388,345c-15,14-29,28-42,42c-31,33-60,67-88,102l992,992l992-992    C2215,453,2185,419,2154,387z M1250,163c292,0,564,113,769,318l-769,769L481,481C685,275,958,163,1250,163z"
          />
        </g>
      </g>
    </svg>
  );
};
