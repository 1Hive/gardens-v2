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
  title,
  message,
  growing,
}: ChartWrapperProps) => {
  const growthClassname = growing
    ? "text-primary-content"
    : "text-danger-content";
  const iconClassname = `h-6 w-6 text-bold ${growthClassname}`;

  return (
    <>
      <div className="mt-10 flex flex-col gap-6">
        {/* chart title */}
        <h3>Conviction voting chart</h3>

        <div className="h-5">legends</div>

        {/* CVChart - standard */}
        <div className=" h-20">{children}</div>

        {/* Growth and message to user */}
        <div className="">
          <div className="space-y-2">
            {growing !== null && (
              <>
                <p className={`flex items-center gap-2 ${growthClassname}`}>
                  Conviction {growing ? "is growing" : "is decreasing"}!
                  <span>
                    {growing ? (
                      <ArrowUpRightIcon className={iconClassname} />
                    ) : (
                      <ArrowDownRightIcon className={iconClassname} />
                    )}{" "}
                  </span>
                </p>
                <p>{message}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
