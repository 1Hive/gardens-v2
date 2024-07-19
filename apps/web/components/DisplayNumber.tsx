"use client";

import { useEffect, useState } from "react";
import * as dn from "dnum";

export const DisplayNumber = ({
  number,
  tokenSymbol,
  className,
  disableTooltip = false,
  compact,
}: {
  number: dn.Dnum | string;
  tokenSymbol?: string;
  className?: string;
  disableTooltip?: boolean;
  compact?: boolean;
}) => {
  const fullNumberStr =
    typeof number === "string" ? number : (
      dn.format([BigInt(number[0]), Number(number[1])])
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

    if (!str) {
      setShowTooltip(false);
      return "";
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
      return dn.format(dn.from(number), {
        compact: compact,
        digits: 2,
      });
    }

    return dn.format(number, { compact: compact, digits: 2 });
  };

  const handleCopy = async () => {
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
    <div className="relative flex items-center gap-1">
      <div
        onClick={handleCopy}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            handleCopy();
          }
        }}
        className={`${!disableTooltip && showTooltip && "tooltip"} cursor-pointer`}
        data-tip={isCopied ? "Copied!" : fullNumberStr}
      >
        <p className={className}>{shortNumber}</p>
      </div>
      <p className={className}>{tokenSymbol}</p>
    </div>
  );
};
