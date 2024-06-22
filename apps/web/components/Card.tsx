import Link from "next/link";
import React from "react";

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
        className={`border1 hover:bg-secondary-soft group card card-compact relative h-full w-[313px] cursor-pointer rounded-2xl bg-neutral p-6 transition-all duration-200 ease-in-out hover:border-secondary-content  ${className}`}
      >
        {children}
      </div>
    </Link>
  );
};
