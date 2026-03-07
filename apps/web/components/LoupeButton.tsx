"use client";

import Link from "next/link";
import { Address } from "viem";
import { useFlag } from "@/hooks/useFlag";

type LoupeButtonProps = {
  diamond?: Address | string | null;
  chainId?: number | null;
  label?: string;
  className?: string;
};

export const LoupeButton = ({
  diamond,
  chainId,
  label = "🔍",
  className = "",
}: LoupeButtonProps) => {
  const loupeEnabled = useFlag("loupe");

  if (!loupeEnabled || !diamond) {
    return null;
  }

  const params = new URLSearchParams();
  params.set("diamond", diamond.toString());
  if (chainId != null && !Number.isNaN(chainId)) {
    params.set("chainId", String(chainId));
  }
  const href = `/loupe?${params.toString()}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-base leading-none text-secondary-content hover:bg-secondary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${className}`}
      aria-label="Open in Loupe"
      title="Open in Loupe"
    >
      {label}
    </Link>
  );
};
