import cn from "classnames";
import { ReactNode } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/solid";

type ChartWrapperProps = {
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  title?: string;
  message?: string;
  growing?: boolean | null;
};

export const ChartWrapper = ({
  children,
  size = "md",
  message,
  growing,
}: ChartWrapperProps) => {
  const iconClassname = `h-6 w-6 text-bold ${growing ? "text-success" : "text-error"}`;

  return (
    <>
      <div className="flex h-[fit] w-full flex-col gap-0 rounded-lg rounded-t-lg">
        {children}

        <div
          className={`w-full px-2 text-left font-semibold text-black last:rounded-b-lg ${cn(
            {
              "text-xs": size === "sm",
            },
          )} `}
        >
          <div className="space-y-2">
            {growing !== null && (
              <p className="flex items-center gap-2">
                Conviction {growing ? "is growing" : "is decreasing"}
                <span>
                  {growing ? (
                    <ArrowUpRightIcon className={iconClassname} />
                  ) : (
                    <ArrowDownRightIcon className={iconClassname} />
                  )}{" "}
                </span>
              </p>
            )}

            <p>{message}</p>
          </div>
        </div>
      </div>
    </>
  );
};
