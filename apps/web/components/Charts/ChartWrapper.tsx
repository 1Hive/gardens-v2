import cn from "classnames";
import { ReactNode } from "react";

type ChartWrapperProps = {
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  title: string;
};

//handle the size + ... ?
//TODO set the exacts types
//TODO set offical styles

export const ChartWrapper = ({
  children,
  size = "md",
  title,
}: ChartWrapperProps) => {
  return (
    <>
      <div className="flex w-full flex-col gap-0 overflow-hidden rounded-lg rounded-t-lg">
        <div
          className={cn({
            "h-8 md:h-20 lg:h-24": size === "sm",
            "h-10 md:h-24 lg:h-64": size === "md",
            "h-10 md:h-24 lg:h-72": size === "lg",
          })}
        >
          {children}
        </div>
        <header
          className={`w-full bg-surface p-4 text-center font-semibold text-black last:rounded-b-lg ${cn(
            {
              "text-xs": size === "sm",
            },
          )} `}
        >
          {title}
        </header>
      </div>
    </>
  );
};
