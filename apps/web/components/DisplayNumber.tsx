"use client";

import { useEffect, useState } from "react";
import * as dn from "dnum";

export const DisplayNumber = ({
  number,
  tokenSymbol,
  valueClassName,
  symbolClassName,
  disableTooltip = false,
  compact,
  copiable,
  tooltipClass = "tooltip-top",
  forceTooltip,
}: {
  number: dn.Dnum | string;
  tokenSymbol?: string;
  valueClassName?: string;
  symbolClassName?: string;
  disableTooltip?: boolean;
  compact?: boolean;
  copiable?: boolean;
  forceTooltip?: boolean;
  tooltipClass?:
    | "tooltip-top"
    | "tooltip-bottom"
    | "tooltip-left"
    | "tooltip-right";
}) => {
  const fullNumberStr =
    typeof number === "string" ? number : (
      dn.format(number, {
        trailingZeros: false,
        digits: 4,
      })
    );

  const [isCopied, setIsCopied] = useState(false);
  const [shortNumber, setShortNumber] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setShortNumber(parseString(fullNumberStr));
  }, [fullNumberStr]);

  const parseString = (str: string | undefined) => {
    const charsLength = 3;
    const prefixLength = 2; // "0."

    if (!str) return "0";

    if (str === "0" || str === "0.0" || str === "0.00") {
      setShowTooltip(false);
      return "0";
    }

    if (str.length < charsLength * 2 + prefixLength) {
      setShowTooltip(false);
      return str;
    }

    setShowTooltip(true);

    if (str.slice(0, 2) === "0.") {
      return (
        str.slice(0, charsLength + prefixLength - 1) +
        "…" +
        str.slice(-charsLength)
      );
    }

    if (typeof number === "string") {
      if (number.endsWith(".")) number = number.slice(0, -1);
      return dn.format(dn.from(number), {
        compact: compact,
        digits: 2,
      });
    }

    return dn.format(number, { compact: compact, digits: 2 });
  };

  const handleCopy = async (
    e:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.KeyboardEvent<HTMLDivElement>,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!copiable) {
      return;
    }
    if (showTooltip === false) {
      setShowTooltip(true);
    }
    try {
      await navigator.clipboard.writeText(fullNumberStr ?? "");
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        if (showTooltip === false) {
          setShowTooltip(false);
        }
      }, 1500);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <div className="relative flex items-baseline gap-1">
      <div
        onClick={(e) => handleCopy(e)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            handleCopy(ev);
          }
        }}
        className={`${!disableTooltip && (showTooltip || forceTooltip) && "tooltip"} ${copiable && "cursor-pointer"} ${tooltipClass}`}
        data-tip={isCopied ? "Copied" : fullNumberStr}
      >
        <p className={valueClassName}>{shortNumber}</p>
      </div>
      <p className={symbolClassName}>{tokenSymbol}</p>
    </div>
  );
};
