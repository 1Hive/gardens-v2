"use client";

import { memo, useEffect, useState } from "react";

export const LiveFlowingAmount = memo(function LiveFlowingAmount({
  value,
  ratePerSecond = 0,
  suffix,
  fractionDigits = 5,
  className = "",
  placeholder = "--",
}: {
  value?: number | null;
  ratePerSecond?: number | null;
  suffix?: string;
  fractionDigits?: number;
  className?: string;
  placeholder?: string;
}) {
  const normalizedValue =
    value != null && Number.isFinite(value) ? value : null;
  const normalizedRate =
    Number.isFinite(ratePerSecond ?? 0) ? ratePerSecond ?? 0 : 0;

  const [startedAtMs, setStartedAtMs] = useState<number>(() => Date.now());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const nextNowMs = Date.now();
    setStartedAtMs(nextNowMs);
    setNowMs(nextNowMs);
  }, [normalizedRate, normalizedValue]);

  useEffect(() => {
    if (normalizedValue == null || normalizedRate === 0) return;

    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNowMs(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [normalizedRate, normalizedValue]);

  if (normalizedValue == null) {
    return (
      <span className={`font-mono tabular-nums ${className}`.trim()}>
        {placeholder}
      </span>
    );
  }

  const elapsedSeconds = Math.max(0, nowMs - startedAtMs) / 1000;
  const displayValue = normalizedValue + normalizedRate * elapsedSeconds;
  const formattedValue = `${displayValue.toFixed(fractionDigits)}${suffix ? ` ${suffix}` : ""}`;

  return (
    <span className={`font-mono tabular-nums ${className}`.trim()}>
      {formattedValue}
    </span>
  );
});
