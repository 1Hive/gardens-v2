import React from "react";
import { Size } from "@/types";
import classNames from "classnames";

type LayoutProps = {
  children: React.ReactNode;
  size?: Size;
  hover?: boolean;
  className?: string;
};

export const Layout = ({
  children,
  size = "md",
  hover = false,
  className,
}: LayoutProps) => {
  return (
    <div
      className={`border1 cursor-pointer overflow-hidden bg-white transition-all duration-200 ease-in-out ${hover && "hover:bg-surfaceHover hover:border-borderHover"} ${classNames({ "p-4": size === "sm", "rounded-[16px] p-6": size === "md", "rounded-[24px] p-8": size === "lg" })} ${className}`}
    >
      {children}
    </div>
  );
};
