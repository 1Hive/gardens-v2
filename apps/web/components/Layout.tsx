import React from "react";
import { Size } from "@/types";
import classNames from "classnames";

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
      className={`border1 bg-neutral transition-all duration-200 ease-in-out ${hover && "hover:bg-surfaceHover hover:border-borderHover cursor-pointer"} ${classNames({ "p-4": size === "sm", "rounded-[16px] p-6": size === "md", "rounded-[24px] p-8": size === "lg" })} ${className}`}
    >
      <h2>{title}</h2>
      {children}
    </section>
  );
};
