import { FC, Fragment } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import {
  CVProposal,
  ProposalDispute,
  ProposalDisputeMetadata,
} from "#/subgraph/.graphclient";
import { Countdown } from "./Countdown";
import { DateComponent } from "./DateComponent";
import { InfoIcon } from "./InfoIcon";
import { DisputeOutcome, DisputeStatus, ProposalStatus } from "@/types";

type Props = {
  proposalData: Pick<CVProposal, "createdAt" | "proposalStatus"> & {
    strategy: {
      config: {
        defaultRuling: number;
        defaultRulingTimeout: number;
      };
    };
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
    > & {
      metadata: Pick<ProposalDisputeMetadata, "reason">;
    }
  >;
  className?: string;
};

export const ProposalTimeline: FC<Props> = ({
  proposalData,
  disputes = [],
  className,
}) => {
  const arbitrationConfig = proposalData.strategy.config;
  const defaultRuling = DisputeOutcome[arbitrationConfig.defaultRuling];
  const proposalStatus = ProposalStatus[proposalData.proposalStatus];
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
  // const isRuled =
  //   !!lastDispute && DisputeStatus[lastDispute.status] === "solved";
  // const isRejected =
  //   !!lastDispute &&
  //   isRuled &&
  //   (DisputeOutcome[lastDispute.rulingOutcome] === "rejected" ||
  //     (DisputeOutcome[lastDispute.rulingOutcome] === "abstained" &&
  //       defaultRuling === "rejected"));
  const isLastDisputeTimeout =
    lastDispute.createdAt + arbitrationConfig.defaultRulingTimeout <
    Date.now() / 1000;

  return (
    <ul className={`timeline mt-5 ${className}`}>
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
          dispute.createdAt + arbitrationConfig.defaultRulingTimeout <
          Date.now() / 1000;
        const isLastDispute = index === disputes.length - 1;
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
                  <CheckIcon className="w-4 m-0.5" />
                </div>
                <div className="timeline-start shadow-lg p-2 border border-tertiary-content rounded-lg flex items-center">
                  <InfoIcon
                    classNames="[&>svg]:text-tertiary-content m-0.5"
                    tooltip={`The tribunal safe has 3 days to rule the dispute. Past this delay and considering the abstain behavior on this pool, this proposal will be ${defaultRuling === "rejected" ? "closed as rejected" : "back to active"} and both collateral will be restored.`}
                  >
                    <Countdown
                      timestamp={
                        dispute.createdAt +
                        arbitrationConfig.defaultRulingTimeout
                      }
                    />
                  </InfoIcon>
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
                  : <InfoIcon
                      tooltip={
                        isTimeout && defaultRuling === "approved" ?
                          "Pool default ruling on timeout is to Approve"
                        : "The proposal will be closed as rejected."
                      }
                      classNames={`[&>svg]:text-danger-content [&:before]:ml-[-26px] ${isTimeout && defaultRuling === "approved" && "[&>svg]:opacity-50"}`}
                    >
                      <span
                        className={`${isTimeout && defaultRuling === "approved" && "opacity-50"}`}
                      >
                        Rejected
                      </span>
                    </InfoIcon>
                  }
                </div>
              )}
              {(!isRuled || !isRejected) && (!isTimeout || defaultRuling) && (
                <div className={"timeline-end text-primary-content"}>
                  {isRuled ?
                    "Approved"
                  : <InfoIcon
                      tooltip={
                        isTimeout && defaultRuling === "rejected" ?
                          "Pool default ruling on timeout is to Reject"
                        : "The proposal will keep the accumulated conviction growth and be back to active."
                      }
                      classNames={`${isTimeout && defaultRuling === "rejected" && "[&>svg]:opacity-50 [&:before]:ml-[-38px]"}`}
                    >
                      <span
                        className={`${isTimeout && defaultRuling === "rejected" && "opacity-50"}`}
                      >
                        Approved
                      </span>
                    </InfoIcon>
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
              {isLastDispute ?
                (!isRuled || !isRejected) &&
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
            <div className="timeline-end">Executed</div>
          </li>
        )}
    </ul>
  );
};