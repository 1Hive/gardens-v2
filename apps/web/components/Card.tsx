import React from "react";
import Link from "next/link";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
  style?: React.CSSProperties;
  testId?: string;
};

export const Card = ({
  children,
  href,
  className,
  style,
  testId,
}: CardProps) => {
  return (
    <Link href={href}>
      <div
        className={`border1 group relative cursor-pointer rounded-2xl bg-neutral p-6 transition-all duration-200 ease-in-out hover:border-secondary-content hover:bg-secondary-soft  dark:hover:bg-secondary-soft-dark overflow-visible ${className}`}
        style={style}
        data-testid={testId}
      >
        {children}
      </div>
    </Link>
  );
};
