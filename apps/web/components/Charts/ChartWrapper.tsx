import { Fragment, ReactNode } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/solid";

type ChartWrapperProps = {
  children?: ReactNode;
  message?: string;
  growing?: boolean | null;
  isSignalingType?: boolean;
};

export const ChartWrapper = ({
  children,
  message,
  growing,
  isSignalingType,
}: ChartWrapperProps) => {
  const growthClassname = growing
    ? "text-primary-content"
    : "text-danger-content";
  const iconClassname = `h-6 w-6 text-bold ${growthClassname}`;

  const legend = [
    {
      name: "Conviction",
      className: "bg-primary-content  h-4 w-4 rounded-full",
    },
    {
      name: "Support",
      className: "bg-[#9EE157] h-4 w-4 rounded-full",
    },
    {
      name: "Threshold",
      className:
        "w-7 bg-neutral-soft border-t-[1px] border-black border-dashed rotate-90 -mx-2",
    },
  ];

  return (
    <>
      <div className="mt-7 flex flex-col gap-6">
        {/* chart title */}
        <h3>Conviction voting chart</h3>

        <div className="flex gap-4">
          {legend
            .filter((item) => !(isSignalingType && item.name === "Threshold"))
            .map((item) => (
              <Fragment key={item.name}>
                <div className="flex items-center gap-1">
                  <div key={item.name} className={`${item.className}`} />
                  <p className="text-xs font-medium">{item.name}</p>
                </div>
              </Fragment>
            ))}
        </div>

        {/* CVChart - standard */}
        <div className="-my-4 h-20">{children}</div>

        {/* Growth and message to user */}

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
            </>
          )}
          <p>{message}</p>
        </div>
      </div>
    </>
  );
};
