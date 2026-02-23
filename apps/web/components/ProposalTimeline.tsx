import { FC, Fragment } from "react";
import { CheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import {
  ArbitrableConfig,
  CVProposal,
  ProposalDispute,
} from "#/subgraph/.graphclient";
import { Countdown } from "./Countdown";
import { DateComponent } from "./DateComponent";
import { InfoWrapper } from "./InfoWrapper";
import { DisputeOutcome, DisputeStatus, PoolTypes, ProposalStatus } from "@/types";
import { convertSecondsToReadableTime } from "@/utils/numbers";

type Props = {
  proposalData: Pick<CVProposal, "createdAt" | "proposalStatus"> & {
    strategy?: {
      id?: string | null;
      poolId?: string | number | null;
      config?: {
        proposalType?: string | number | null;
      } | null;
    } | null;
    arbitrableConfig: Pick<
      ArbitrableConfig,
      "defaultRulingTimeout" | "defaultRuling"
    >;
  };
  disputes: Array<
    Pick<
      ProposalDispute,
      | "id"
      | "disputeId"
      | "status"
      | "challenger"
      | "context"
      | "createdAt"
      | "ruledAt"
      | "rulingOutcome"
    >
  >;
  className?: string;
};

export const ProposalTimeline: FC<Props> = ({
  proposalData,
  disputes = [],
  className = "",
}) => {
  const arbitrationConfig = proposalData.arbitrableConfig;
  const defaultRuling = DisputeOutcome[arbitrationConfig.defaultRuling];
  const proposalStatus = ProposalStatus[proposalData.proposalStatus];
  const proposalType = proposalData.strategy?.config?.proposalType;
  const poolType =
    proposalType != null ? PoolTypes[String(proposalType)] : undefined;
  const isStreamingType = poolType === "streaming";
  const isFundingType = poolType === "funding";
  const endNodeLabel = isFundingType ? "Executed" : "Ended";
  const endNodeTooltip =
    proposalStatus === "cancelled" ?
      "Cancelled by proposal creator."
    : proposalStatus === "rejected" ?
      "Rejected after dispute resolution."
    : undefined;

  const pastHR = <hr className="bg-tertiary-content w-8" />;
  const pastNode = (
    <div className="timeline-middle rounded-full text-tertiary-soft bg-tertiary-content m-0.5">
      <CheckIcon className="w-4 m-0.5" />
    </div>
  );
  const futureHR = <hr className="bg-neutral-soft-content w-8" />;
  const futureNode = (
    <div className="timeline-middle rounded-full text-neutral-soft-content border border-neutral-soft-content bg-transparent m-0.5">
      <CheckIcon className="w-4 m-0.5" />
    </div>
  );

  const lastDispute = disputes[disputes.length - 1];
  const isLastDisputeTimeout =
    lastDispute != null &&
    +lastDispute.createdAt + +arbitrationConfig.defaultRulingTimeout <
      Date.now() / 1000;

  const isEnded = proposalStatus !== "active" && proposalStatus !== "disputed";

  return (
    <ul
      className={`timeline timeline-vertical sm:timeline-horizontal mt-5 w-full ${className}`}
    >
      <li className="flex-grow">
        <div className="timeline-start text-sm opacity-60">
          <DateComponent timestamp={proposalData.createdAt} />
        </div>
        <div className="timeline-end">Proposal created</div>
        {pastNode}
        {pastHR}
      </li>
      {disputes.map((dispute, index) => {
        const isRuled = DisputeStatus[dispute.status] === "solved";
        const isRejected =
          DisputeOutcome[dispute.rulingOutcome] === "rejected" ||
          (DisputeOutcome[dispute.rulingOutcome] === "abstained" &&
            defaultRuling === "rejected");
        const isTimeout =
          +dispute.createdAt + +arbitrationConfig.defaultRulingTimeout <
          Date.now() / 1000;
        const isLastDispute = index === disputes.length - 1;
        const timeoutTimestamp =
          +dispute.createdAt + +arbitrationConfig.defaultRulingTimeout;

        const rulingTimeout = convertSecondsToReadableTime(
          arbitrationConfig.defaultRulingTimeout,
        );

        return (
          <Fragment key={dispute.id}>
            <li className="flex-grow">
              {pastHR}
              <div className="timeline-start text-sm opacity-60">
                <DateComponent timestamp={dispute.createdAt} />
              </div>
              {pastNode}
              <div className="timeline-end">Disputed</div>
              {pastHR}
            </li>
            {DisputeStatus[dispute.status] === "waiting" && (
              <li className="flex-grow">
                <hr className="bg-tertiary-content rounded-tr-none rounded-br-none" />
                <div className="timeline-middle rounded-full text-tertiary-soft bg-tertiary-content my-0.5">
                  <CheckIcon className="w-4 m-0.5 text-tertiary-content" />
                </div>
                <div className="timeline-start shadow-lg p-2 border border-tertiary-content rounded-lg flex items-center">
                  <InfoWrapper
                    className="[&>svg]:text-tertiary-content m-0.5 tooltip-bottom"
                    tooltip={`The tribunal safe has ${rulingTimeout.value} ${rulingTimeout.unit} to rule the dispute. Past this delay and considering the abstain behavior on this pool, this proposal will be ${defaultRuling === "rejected" ? "closed as rejected" : "back to active"} and both collateral will be restored.`}
                  >
                    <Countdown endTimestamp={timeoutTimestamp} />
                  </InfoWrapper>
                </div>
                <div className="timeline-end">Ruling...</div>
                <hr className="bg-neutral-soft-content rounded-tl-none rounded-bl-none" />
              </li>
            )}
            <li className="flex-grow">
              {isRuled ? pastHR : futureHR}
              {isRuled && (
                <div className="timeline-start text-sm opacity-60">
                  <DateComponent timestamp={dispute.ruledAt} />
                </div>
              )}
              {(!isRuled || isRejected) && (
                <div
                  className={`${isRuled ? "timeline-end" : "timeline-start"} text-danger-content`}
                >
                  {isRuled ?
                    "Rejected"
                  : <InfoWrapper
                      tooltip={
                        isTimeout && defaultRuling === "approved" ?
                          "Pool default ruling on timeout is to Approve"
                        : `The proposal will be closed as rejected${defaultRuling === "rejected" ? " (default on abstain)" : ""}`
                      }
                      className={`[&>svg]:!text-error-content [&:before]:ml-[-26px] ${isTimeout && defaultRuling === "approved" && "[&>svg]:opacity-50"}`}
                    >
                      <div className="flex items-center gap-1">
                        {!isTimeout && defaultRuling === "rejected" && (
                          <div
                            className="tooltip w-full"
                            data-tip="Pool default ruling on abstain is to Reject"
                          >
                            <ClockIcon className="w-4 text-secondary-content" />
                          </div>
                        )}
                        <span
                          className={`${isTimeout && defaultRuling === "approved" && "opacity-50"}`}
                        >
                          Rejected
                        </span>
                      </div>
                    </InfoWrapper>
                  }
                </div>
              )}
              {(!isRuled || !isRejected) && (
                <div className={"timeline-end text-primary-content"}>
                  {isRuled ?
                    "Approved"
                  : <InfoWrapper
                      tooltip={
                        isTimeout && defaultRuling === "rejected" ?
                          "Pool default ruling on timeout is to Reject"
                        : `The proposal will keep the accumulated conviction growth and be back to active ${defaultRuling === "approved" ? " (default on abstain)" : ""}`
                      }
                      className={`${isTimeout && defaultRuling === "rejected" && "[&>svg]:opacity-50 [&:before]:ml-[-38px]"}`}
                    >
                      <div className="flex items-center gap-1">
                        {!isTimeout && defaultRuling === "approved" && (
                          <div
                            className="tooltip w-full"
                            data-tip="Pool default ruling on abstain is to Approve"
                          >
                            <ClockIcon className="w-4 text-secondary-content" />
                          </div>
                        )}
                        <span
                          className={`${isTimeout && defaultRuling === "rejected" && "opacity-50"}`}
                        >
                          Approved
                        </span>
                      </div>
                    </InfoWrapper>
                  }
                </div>
              )}
              {isRuled ?
                <div
                  className={`timeline-middle rounded-full text-primary ${isRejected ? "bg-danger-content" : "bg-primary-content"} m-0.5`}
                >
                  <CheckIcon className="w-4 m-0.5" />
                </div>
              : futureNode}
              {isLastDispute && proposalStatus !== "active" ?
                !isRuled &&
                !isEnded &&
                (!isTimeout || defaultRuling === "approved") &&
                futureHR
              : pastHR}
            </li>
          </Fragment>
        );
      })}

      {proposalStatus !== "rejected" &&
        !(
          proposalStatus === "disputed" &&
          isLastDisputeTimeout &&
          defaultRuling === "rejected"
        ) && (
          <li className="flex-grow">
            {futureHR}
            {futureNode}
            {endNodeTooltip ?
              <InfoWrapper tooltip={endNodeTooltip}>
                <div className="timeline-end">{endNodeLabel}</div>
              </InfoWrapper>
            : <div className="timeline-end">{endNodeLabel}</div>}
          </li>
        )}
    </ul>
  );
};
