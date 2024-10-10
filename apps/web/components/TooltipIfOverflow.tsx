import React, { useRef, useState, useEffect } from "react";

type Props = { children: string | undefined; className?: string };

function TooltipIfOverflow({ children, className }: Props) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      setIsOverflowing(element.scrollWidth > element.offsetWidth);
    }
  }, [children]);

  return (
    <div
      className="tooltip w-full"
      data-tip={isOverflowing ? children : undefined}
    >
      <div
        ref={textRef}
        className={`truncate w-full text-left ${className ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export default TooltipIfOverflow;
