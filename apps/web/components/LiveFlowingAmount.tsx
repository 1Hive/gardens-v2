"use client";

import { memo, useEffect, useRef, useState } from "react";

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
  const rawRatePerSecond = ratePerSecond ?? 0;
  const normalizedValue =
    value != null && Number.isFinite(value) ? value : null;
  const normalizedRate =
    Number.isFinite(rawRatePerSecond) ? rawRatePerSecond : 0;
  const shouldTick = normalizedValue != null && normalizedRate !== 0;

  const startedAtMsRef = useRef<number>(Date.now());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const nextNowMs = Date.now();
    startedAtMsRef.current = nextNowMs;

    if (!shouldTick) {
      return;
    }

    setNowMs(nextNowMs);

    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setNowMs(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [shouldTick, normalizedRate, normalizedValue]);

  if (normalizedValue == null) {
    return (
      <span className={`font-mono tabular-nums ${className}`.trim()}>
        {placeholder}
      </span>
    );
  }

  const elapsedSeconds = Math.max(0, nowMs - startedAtMsRef.current) / 1000;
  const displayValue = normalizedValue + normalizedRate * elapsedSeconds;
  const formattedValue = `${displayValue.toFixed(fractionDigits)}${suffix ? ` ${suffix}` : ""}`;

  return (
    <span className={`font-mono tabular-nums ${className}`.trim()}>
      {formattedValue}
    </span>
  );
});
