"use client";
import * as dn from "dnum";
import { doesNotReject } from "assert";
import { useEffect, useState } from "react";

export const DisplayNumber = ({
  number: fullNumber,
  tokenSymbol,
  className,
  compact,
}: {
  number: string | undefined;
  tokenSymbol?: string;
  className?: string;
  compact?: boolean;
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [shortNumber, setShortNumber] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setShortNumber(parseString(fullNumber));
  }, []);

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
    if (str.slice(0, 2) === "0.")
      return (
        str.slice(0, charsLength + prefixLength - 1) +
        "…" +
        str.slice(-charsLength)
      );
    // console.log(dn.from(str));
    return str;
    // return "";
  };

  const handleCopy = async () => {
    try {
      setShowTooltip(true);
      await navigator.clipboard.writeText(fullNumber ?? "");
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        setShowTooltip(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <div className="relative ml-2 flex items-center gap-1">
      <div
        onClick={handleCopy}
        className={`${showTooltip && "tooltip"} cursor-copy ${className}`}
        data-tip={isCopied ? "Copied!" : fullNumber}
      >
        <p>{shortNumber}</p>
      </div>
      <p>{tokenSymbol}</p>
    </div>
  );
};
