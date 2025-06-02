import React from "react";
import Link from "next/link";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
  onHover?: () => void;
  onUnhover?: () => void;
};

export const Card = ({
  children,
  href,
  className,
  onHover,
  onUnhover,
}: CardProps) => {
  return (
    //todo: div or section ?
    <Link href={href}>
      <div
        className={`border1 group relative cursor-pointer rounded-2xl bg-neutral p-6 transition-all duration-300 ease-in-out hover:border-secondary-content hover:bg-secondary-soft overflow-visible ${className}`}
        onMouseEnter={onHover}
        onMouseLeave={onUnhover}
      >
        {children}
      </div>
    </Link>
  );
};
