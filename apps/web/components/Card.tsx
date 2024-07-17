import React from "react";
import Link from "next/link";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
};

export const Card = ({ children, href, className }: CardProps) => {
  return (
    //todo: div or section ?
    <Link href={href}>
      <div
        className={`border1 group relative w-[313px] cursor-pointer rounded-2xl bg-neutral p-6 transition-all duration-200 ease-in-out hover:border-secondary-content hover:bg-secondary-soft  ${className}`}
      >
        {children}
      </div>
    </Link>
  );
};
