import React, { useRef, useState, useEffect } from "react";

type Props = {
  children: string | undefined;
  className?: string;
  lineClamp?:
    | "line-clamp-2"
    | "line-clamp-3"
    | "line-clamp-4"
    | "line-clamp-5"
    | "line-clamp-6"
    | "line-clamp-7"
    | "line-clamp-8"
    | "line-clamp-9"
    | "line-clamp-10"
    | "line-clamp-none";
};

function TooltipIfOverflow({
  children,
  className,
  lineClamp = "line-clamp-none",
}: Props) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      if (lineClamp === "line-clamp-none") {
        setIsOverflowing(element.scrollWidth > element.offsetWidth);
      } else {
        setIsOverflowing(element.scrollHeight > element.offsetHeight + 1);
      }
    }
  }, [children]);

  return (
    <div
      className="tooltip w-full"
      data-tip={isOverflowing ? children : undefined}
    >
      <div
        ref={textRef}
        className={`${lineClamp === "line-clamp-none" ? "truncate" : lineClamp} w-full text-left ${className ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export default TooltipIfOverflow;
