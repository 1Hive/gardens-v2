import { Fragment, ReactNode } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  FlagIcon,
} from "@heroicons/react/24/solid";
import { InfoWrapper } from "../InfoWrapper";
import { getChartColors } from "@/components/Charts/ConvictionBarChart";
import { useTheme } from "@/providers/ThemeProvider";

type ChartWrapperProps = {
  children?: ReactNode;
  message?: string;
  growing?: boolean | null;
  isSignalingType?: boolean;
  proposalStatus?: string;
};

export const ChartWrapper = ({
  children,
  message,
  growing,
  isSignalingType,
  proposalStatus,
}: ChartWrapperProps) => {
  const growthClassname =
    growing ? "text-primary-content" : "text-danger-content";
  const iconClassname = `h-3 w-3 ${growthClassname}`;
  const { isDarkTheme } = useTheme();
  const chartColors = getChartColors(isDarkTheme);
  const legend = [
    {
      name: "Support",
      className: "h-3 w-8 rounded-md",
      style: { backgroundColor: chartColors.support },
      info: "Represents the total pool weight currently allocated to a proposal.",
    },
    {
      name: "Conviction",
      className: "h-3 w-8 rounded-md",
      style: { backgroundColor: chartColors.conviction },
      info: "Accumulated pool weight for a proposal, increasing over time, based on the conviction growth.",
    },
    {
      name: "Threshold",
      style: {
        borderColor: chartColors.markLine,
      },
      className: "w-5 border-t-[1px] border-dashed rotate-90 -mx-3",
      info: "The minimum level of conviction required for a proposal to pass.",
    },
  ] as const;

  return (
    <>
      <div className="flex flex-col gap-6 mt-2">
        <div className="flex gap-4 flex-wrap">
          {legend
            .filter((item) => !(isSignalingType && item.name === "Threshold"))
            .map((item) => (
              <Fragment key={item.name}>
                <InfoWrapper tooltip={item.info} size="sm">
                  <div className="flex items-center gap-1">
                    {item.name === "Threshold" ?
                      <div className="relative">
                        <div
                          className={`${item.className}`}
                          style={item.style}
                        />
                        <FlagIcon
                          className="absolute -left-[3.5px] -top-5 h-3 w-3"
                          style={{ color: chartColors.markLine }}
                        />
                      </div>
                    : <div className={`${item.className}`} style={item.style} />
                    }
                    <p className="text-sm">{item.name}</p>
                  </div>
                </InfoWrapper>
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
                  {growing ?
                    <ArrowUpRightIcon className={iconClassname} />
                  : <ArrowDownRightIcon className={iconClassname} />}{" "}
                </span>
              </p>
            </>
          )}
          <p>
            {proposalStatus === "disputed" ?
              "Proposal is awaiting dispute resolution."
            : message}
          </p>
        </div>
      </div>
    </>
  );
};
