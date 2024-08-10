import { FC, Fragment, useMemo, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { blo } from "blo";
import { Address, mainnet, useEnsAvatar, useEnsName } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  getProposalDisputesDocument,
  getProposalDisputesQuery,
  Maybe,
  ProposalDispute,
  ProposalDisputeMetadata,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DateComponent } from "./DateComponent";
import { InfoBox } from "./InfoBox";
import { InfoIcon } from "./InfoIcon";
import { Modal } from "./Modal";
import { ProposalTimeline } from "./ProposalTimeline";
import { WalletBalance } from "./WalletBalance";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MetadataV1, useIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { cvStrategyABI } from "@/src/generated";
import { DisputeStatus, ProposalStatus } from "@/types";
import { delayAsync } from "@/utils/delayAsync";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";

type Props = {
  proposalData: Maybe<
    Pick<
      CVProposal,
      "id" | "proposalNumber" | "blockLast" | "proposalStatus" | "createdAt"
    > & {
      strategy: Pick<CVStrategy, "id"> & {
        config: Pick<
          CVStrategyConfig,
          | "arbitrator"
          | "challengerCollateralAmount"
          | "defaultRuling"
          | "defaultRulingTimeout"
        >;
      };
    }
  > &
    MetadataV1;
};

export const DisputeButton: FC<Props> = ({ proposalData }) => {
  const [isModalOpened, setIsModalOpened] = useState(false);
  const [reason, setReason] = useState("");
  const [isEnoughBalance, setIsEnoughBalance] = useState(true);
  const { publish } = usePubSubContext();

  // TODO: Remove fake
  const disputeTimestamp = useMemo(() => {
    // timestamp of now -  2days
    return Date.now() / 1000;
  }, []);
  // let dispute = {
  //   id: 1,
  //   reasonHash: "QmSoxngvbp1k1Dy5SV5YchrQFDaNwf94dRHuHXpxFQMNcc",
  //   status: 0, // 0: Waiting, 1: Solved
  //   outcome: 1, // 0: Abstained, 1: Approved, 2: Rejected
  //   maxDelaySec: 259200, // 3 days -> 259200
  //   challenger: "0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6",
  //   abstainOutcome: 2, // 1: Approved, 2: Rejected
  //   timestamp: disputeTimestamp,
  //   ruledAt: disputeTimestamp + 259200,
  // };
  // proposalData.proposalStatus = 5;
  // proposalData.strategy.config.defaultRuling = 1;
  // End of TODO

  const config = proposalData.strategy.config;

  const { data: disputesResult } = useSubgraphQuery<getProposalDisputesQuery>({
    query: getProposalDisputesDocument,
    variables: {
      proposalId: proposalData?.id,
    },
    changeScope: {
      topic: "proposal",
      id: proposalData?.proposalNumber,
      containerId: proposalData?.strategy.id,
      type: "update",
    },
    enabled: !!proposalData,

    // TODO: Remove fake
    // modifier: (x) => {
    //   x.proposalDisputes = [
    //     {
    //       id: "1",
    //       disputeId: 1,
    //       challenger: "0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6",
    //       context: "QmSoxngvbp1k1Dy5SV5YchrQFDaNwf94dRHuHXpxFQMNcc",
    //       createdAt: 1631260400,
    //       status: 1,
    //       rulingOutcome: 1,
    //       ruledAt: 1631270400,
    //       metadata: {
    //         reason:
    //           "This proposal is not in compliance with the community covenant.",
    //       },
    //     },
    //     {
    //       id: "3",
    //       disputeId: 3,
    //       challenger: "0x07AD02e0C1FA0b09fC945ff197E18e9C256838c68",
    //       context: "QmSoxngvbp1k1Dy5SV5YchrQFDaNwf94dRHuHXpxFQMNcc",
    //       createdAt: disputeTimestamp + 1 * 24 * 3600,
    //       status: 0,
    //       // rulingOutcome: 1,
    //       // ruledAt: 1631270400,
    //       metadata: {
    //         reason:
    //           "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent eu commodo odio. Ut venenatis tellus a lectus facilisis tincidunt. Maecenas id porta massa. Vestibulum dapibus dolor leo, et mollis turpis vestibulum id. Aliquam erat volutpat. Vestibulum sed lorem eget nibh eleifend hendrerit a eu eros. Pellentesque nulla mauris, sagittis in erat eget, tincidunt sollicitudin nisi. Pellentesque non mi ac diam pretium mattis in sit amet purus. Suspendisse quis mollis elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Etiam pellentesque lacinia lorem. Ut aliquam risus eros, id feugiat justo tempor non. In varius tellus sit amet est pretium rutrum commodo sed lorem. Phasellus non ornare justo, sit amet rutrum turpis.",
    //       },
    //     },
    //   ];
    //   return x;
    // },
  });

  const arbitrationCost = 500000000000000000n; // TODO: Remove fake
  // const { data: arbitrationCost } = useContractRead({
  //   abi: iArbitratorABI,
  //   functionName: "arbitrationCost",
  //   address: config?.arbitrator as Address,
  //   enabled: !!config?.arbitrator,
  // });

  const totalStake =
    arbitrationCost && config ?
      arbitrationCost + BigInt(config.challengerCollateralAmount)
    : undefined;

  const lastDispute =
    disputesResult?.proposalDisputes[
      disputesResult?.proposalDisputes.length - 1
    ];

  const isDisputed =
    proposalData &&
    ProposalStatus[proposalData.proposalStatus] === "disputed" &&
    lastDispute;
  const isTimeout =
    lastDispute && config && lastDispute.createdAt + config < Date.now() / 1000;
  const disputes = disputesResult?.proposalDisputes ?? [];

  const { write } = useContractWriteWithConfirmations({
    contractName: "CVStrategy",
    functionName: "disputeProposal",
    value: config?.challengerCollateralAmount,
    abi: cvStrategyABI,
    onSuccess: () => {
      setIsModalOpened(false);
    },
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "disputeProposal",
        id: proposalData!.proposalNumber,
        containerId: proposalData!.strategy.id,
      });
    },
  });

  async function handleSubmit() {
    setIsModalOpened(false);
    const reasonHash = await ipfsJsonUpload({ reason }, "disputeReason");
    write({
      args: [proposalData.proposalNumber, reasonHash, "0x"],
    });
  }

  const content =
    isDisputed ?
      <div className="flex md:flex-col gap-20">
        <div className="p-16 rounded-lg">
          {disputes.map((dispute) => (
            <Fragment key={dispute.id}>
              <DisputeMessage dispute={dispute} />
            </Fragment>
          ))}
        </div>
        <ProposalTimeline proposalData={proposalData} disputes={disputes} />
      </div>
    : <>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter your dispute reason here"
          className="textarea textarea-accent w-full  mb-4"
          rows={5}
        />
        <InfoBox
          infoBoxType="info"
          content="Disputing this proposal stops it from being executed but not from growing in support. The Tribunal has one week to settle any disputes before it can be closed and collateral is returned."
        />
      </>;

  const buttons = (
    <div className="modal-action w-full">
      {isDisputed ?
        <div className="w-full flex justify-end gap-4">
          {DisputeStatus[lastDispute.status] === "waiting" && (
            <>
              <Button color="secondary" btnStyle="outline">
                <InfoIcon
                  classNames="[&>svg]:text-secondary-content"
                  tooltip={
                    "Abstain to let other tribunal-safe members decide the outcome."
                  }
                >
                  Abstain
                </InfoIcon>
              </Button>
              {!isTimeout && (
                <>
                  <Button color="primary" btnStyle="outline">
                    <InfoIcon
                      classNames="[&>svg]:text-primary-content"
                      tooltip={
                        "Approve if the dispute is invalid and the proposal should be kept active."
                      }
                    >
                      Approve
                    </InfoIcon>
                  </Button>
                  <Button color="danger" btnStyle="outline">
                    <InfoIcon
                      classNames="[&>svg]:text-danger-content [&:before]:mr-10 tooltip-left"
                      tooltip={
                        "Reject if, regarding the community covenant, the proposal is violating the rules."
                      }
                    >
                      Reject
                    </InfoIcon>
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      : <div className="flex w-full justify-between items-end">
          <div>
            {totalStake && (
              <WalletBalance
                label="Dispute Stake"
                token="native"
                askedAmount={totalStake}
                tooltip={`Collateral: ${0.05} ETH \n Fee: ${0.05} ETH`}
                setIsEnoughBalance={setIsEnoughBalance}
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setIsModalOpened(false)}
              color="danger"
              btnStyle="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              color="danger"
              tooltip={isEnoughBalance ? "" : "Insufficient balance"}
              tooltipSide="tooltip-left"
              disabled={!isEnoughBalance}
            >
              Dispute
            </Button>
          </div>
        </div>
      }
    </div>
  );

  return (
    <>
      <Button
        color="danger"
        btnStyle="outline"
        onClick={() => setIsModalOpened(true)}
      >
        {isDisputed ? "Open dispute" : "Dispute"}
      </Button>
      <Modal
        title={`Disputed Proposal: ${proposalData.title} #${proposalData.proposalNumber}`}
        onClose={() => setIsModalOpened(false)}
        isOpen={isModalOpened}
      >
        {content}
        {buttons}
      </Modal>
    </>
  );
};
type DisputeMetadata = {
  reason: string;
};
const DisputeMessage = ({
  dispute,
  title,
}: {
  dispute: Pick<
    ProposalDispute,
    "id" | "challenger" | "context" | "createdAt"
  > & {
    metadata: Pick<ProposalDisputeMetadata, "reason">;
  };
  title?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const { data: ensName } = useEnsName({
    address: dispute?.challenger as Address,
    chainId: mainnet.id,
    enabled: !!dispute?.challenger,
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    chainId: mainnet.id,
    enabled: !!ensName,
  });

  const { data: disputeMetadata } = useIpfsFetch<DisputeMetadata>({
    hash: dispute.context,
    enabled: !dispute.metadata,
  });

  async function onCopyChallenger() {
    navigator.clipboard.writeText(dispute.challenger);
    setCopied(true);
    await delayAsync(1000);
    setCopied(false);
  }

  return (
    <div className="chat chat-start my-4" key={dispute.id}>
      <div className="chat-header">
        <time className="text-xs opacity-50">
          <span className="mr-2">{title}</span>
          <DateComponent timestamp={dispute.createdAt} />
        </time>
      </div>
      <div className="chat-image">
        {dispute.challenger && (
          <div
            className={`tooltip ${copied ? "" : "[&:before]:max-w-none [&:before]:ml-36"}`}
            data-tip={copied ? "Copied" : `Copy: ${dispute.challenger}`}
          >
            <button
              onClick={() => onCopyChallenger()}
              className="btn btn-circle"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Avatar of wallet address"
                className={"!rounded-full"}
                src={avatarUrl ? avatarUrl : blo(dispute.challenger as Address)}
              />
            </button>
          </div>
        )}
      </div>
      <div className="chat-bubble shadow-lg bg-neutral-200">
        {dispute.metadata.reason ?? disputeMetadata?.reason}
      </div>
    </div>
  );
};
