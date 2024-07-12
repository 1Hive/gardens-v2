import classNames from "classnames";
import React from "react";
import { Size } from "@/types";

type LayoutProps = {
  children: React.ReactNode;
  size?: Size;
  hover?: boolean;
  className?: string;
  title?: string;
};

export const Layout = ({
  children,
  size = "md",
  hover = false,
  className,
  title,
}: LayoutProps) => {
  return (
    <section
      className={`border1 relative bg-neutral transition-all duration-200 ease-in-out ${hover && "cursor-pointer hover:border-secondary-content hover:bg-secondary-soft"} ${classNames({ "p-4": size === "sm", "rounded-[16px] p-6": size === "md", "rounded-[24px] p-8": size === "lg" })} ${className}`}
    >
      <header>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
};
