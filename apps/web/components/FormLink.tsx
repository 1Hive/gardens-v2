"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { PlusIcon } from "@heroicons/react/24/solid";

type LinkProps = {
  href: string;
  label: string;
  className?: string;
};

export const FormLink = ({ href, label, className }: LinkProps) => {
  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();

  return (
    <Link href={href} className={className}>
      <Button
        btnStyle="filled"
        disabled={!isConnected || missmatchUrl}
        tooltip={tooltipMessage}
        icon={<PlusIcon height={24} width={24} />}
      >
        {label}
      </Button>
    </Link>
  );
};
