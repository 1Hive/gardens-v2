import { FC } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { CVProposal } from "#/subgraph/.graphclient";
import { Countdown } from "./Countdown";
import { DateComponent } from "./DateComponent";
import { InfoIcon } from "./InfoIcon";
import { DisputeOutcome, DisputeStatus } from "@/types";

type Props = {
  proposalData: Pick<CVProposal, "createdAt">;
  dispute?: {
    id: number;
    reasonHash: string;
    status: number;
    outcome: number; // 0: Abstained, 1: Approved, 2: Rejected
    maxDelaySec: number;
    challenger: string;
    abstainOutcome: number; // 1: Approved, 2: Rejected
    timestamp: number;
    ruledAt: number;
  };
  className?: string;
};

export const ProposalTimeline: FC<Props> = ({
  proposalData,
  dispute,
  className,
}) => {
  const isRuled = !!dispute && DisputeStatus[dispute.status] === "solved";
  const isRejected =
    !!dispute &&
    isRuled &&
    DisputeOutcome[dispute.outcome] === "rejected" &&
    DisputeOutcome[dispute.outcome] === "abstained" &&
    DisputeOutcome[dispute.abstainOutcome] === "rejected";
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

  const isTimeout =
    !!dispute && dispute.timestamp + dispute.maxDelaySec < Date.now() / 1000;

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
      {dispute && (
        <li className="flex-grow">
          {pastHR}
          <div className="timeline-start text-sm opacity-60">
            <DateComponent timestamp={dispute.timestamp} />
          </div>
          {pastNode}
          <div className="timeline-end">Disputed</div>
          {pastHR}
        </li>
      )}
      {dispute && DisputeStatus[dispute.status] === "waiting" && (
        <li className="flex-grow">
          <hr className="bg-tertiary-content rounded-tr-none rounded-br-none" />
          <div className="timeline-middle rounded-full text-tertiary-soft bg-tertiary-content my-0.5">
            <CheckIcon className="w-4 m-0.5" />
          </div>
          <div className="timeline-start shadow-lg p-2 border border-tertiary-content rounded-lg flex items-center">
            <InfoIcon
              classNames="[&>svg]:text-tertiary-content m-0.5"
              tooltip={`The tribunal safe has 3 days to rule the dispute. Past this delay and considering the abstain behavior on this pool, this proposal will be ${dispute.abstainOutcome ? "cancelled" : "back to active"} and both collateral will be restored.`}
            >
              <Countdown timestamp={dispute.timestamp + dispute.maxDelaySec} />
            </InfoIcon>
          </div>
          <div className="timeline-end">Ruling...</div>
          <hr className="bg-neutral-soft-content rounded-tl-none rounded-bl-none" />
        </li>
      )}
      {dispute && (
        <li className="flex-grow">
          {isRuled ? pastHR : futureHR}
          {isRuled && (
            <div className="timeline-start text-sm opacity-60">
              <DateComponent timestamp={dispute.ruledAt} />
            </div>
          )}
          {(!isRuled || isRejected) &&
            (!isTimeout ||
              DisputeOutcome[dispute.abstainOutcome] === "rejected") && (
              <div
                className={`${isRuled || isTimeout ? "timeline-end" : "timeline-start"}  text-danger-content`}
              >
                {isRuled ?
                  "Rejected"
                : <InfoIcon tooltip="The proposal will be cancelled.">
                    Rejected
                  </InfoIcon>
                }
              </div>
            )}
          {(!isRuled || !isRejected) &&
            (!isTimeout ||
              DisputeOutcome[dispute.abstainOutcome] === "approved") && (
              <div className={"timeline-end text-primary-content"}>
                {isRuled ?
                  "Approved"
                : <InfoIcon tooltip="The proposal will keep the accumulated growth and be back to active.">
                    Approved
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
          {(!isRuled || !isRejected) &&
            (!isTimeout ||
              DisputeOutcome[dispute.abstainOutcome] === "approved") &&
            futureHR}
        </li>
      )}
      {(!isRuled || !isRejected) &&
        (!isTimeout ||
          DisputeOutcome[dispute.abstainOutcome] === "approved") && (
          <li className="flex-grow">
            {futureHR}
            {futureNode}
            <div className="timeline-end">Executed</div>
          </li>
        )}
    </ul>
  );
};
