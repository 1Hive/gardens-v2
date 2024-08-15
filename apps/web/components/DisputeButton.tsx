import { FC, Fragment, useState } from "react";
// @ts-ignore - no types available
import { blo } from "blo";
import { formatEther } from "viem";
import {
  Address,
  mainnet,
  useAccount,
  useContractRead,
  useEnsAvatar,
  useEnsName,
} from "wagmi";
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
import { InfoWrapper } from "./InfoWrapper";
import { Modal } from "./Modal";
import { ProposalTimeline } from "./ProposalTimeline";
import { WalletBalance } from "./WalletBalance";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MetadataV1, useIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import {
  cvStrategyABI,
  iArbitratorABI,
  safeArbitratorABI,
} from "@/src/generated";
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
          | "tribunalSafe"
          | "challengerCollateralAmount"
          | "defaultRuling"
          | "defaultRulingTimeout"
        >;
      };
    }
  > &
    MetadataV1;
};

const ABSTAINED_RULING = 0;
const APPROVED_RULING = 1;
const REJECTED_RULING = 2;

export const DisputeButton: FC<Props> = ({ proposalData }) => {
  const [isModalOpened, setIsModalOpened] = useState(false);
  const [reason, setReason] = useState("");
  const [isEnoughBalance, setIsEnoughBalance] = useState(true);
  const { publish } = usePubSubContext();
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Remove fake
  // const disputeTimestamp = useMemo(() => {
  //   // timestamp of now -  2days
  //   return Date.now() / 1000;
  // }, []);
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

  // const arbitrationCost = 500000000000000000n; // TODO: Remove fake
  const { data: arbitrationCost } = useContractRead({
    abi: iArbitratorABI,
    functionName: "arbitrationCost",
    address: config?.arbitrator as Address,
    enabled: !!config?.arbitrator,
    args: ["0x0"],
  });

  const { data: disputeCooldown } = useContractRead({
    abi: cvStrategyABI,
    functionName: "DISPUTE_COOLDOWN_SEC",
    address: proposalData.strategy.id as Address,
  });

  const totalStake =
    arbitrationCost && config ?
      arbitrationCost + BigInt(config.challengerCollateralAmount)
    : undefined;

  const lastDispute =
    disputesResult?.proposalDisputes[
      disputesResult?.proposalDisputes.length - 1
    ];

  const isCooldown =
    !!lastDispute &&
    !!disputeCooldown &&
    +lastDispute.ruledAt + Number(disputeCooldown) > Date.now() / 1000;

  const isDisputed =
    proposalData &&
    lastDispute &&
    ProposalStatus[proposalData.proposalStatus] === "disputed";
  const isTimeout =
    lastDispute &&
    config &&
    +lastDispute.createdAt + +config.defaultRulingTimeout < Date.now() / 1000;
  const disputes = disputesResult?.proposalDisputes ?? [];

  const isCouncilSafe = config.tribunalSafe === address?.toLowerCase();

  const { writeAsync: writeDisputeProposalAsync } =
    useContractWriteWithConfirmations({
      contractName: "CVStrategy",
      functionName: "disputeProposal",
      value: totalStake,
      abi: cvStrategyABI,
      address: proposalData?.strategy.id as Address,
      onSuccess: () => {
        setIsModalOpened(false);
      },
      onConfirmations: () => {
        publish({
          topic: "proposal",
          type: "update",
          function: "disputeProposal",
          id: proposalData.id,
          containerId: proposalData.strategy.id,
        });
      },
    });

  async function handleSubmit() {
    setIsLoading(true);
    const reasonHash = await ipfsJsonUpload({ reason }, "disputeReason");
    if (!reasonHash) {
      return;
    }
    await writeDisputeProposalAsync({
      args: [BigInt(proposalData.proposalNumber), reasonHash, "0x0"],
    });
    setIsLoading(false);
  }

  const { write: writeSubmitRuling } = useContractWriteWithConfirmations({
    contractName: "SafeArbitrator",
    functionName: "executeRuling",
    abi: safeArbitratorABI,
    address: config?.arbitrator as Address,
    onSuccess: () => {
      setIsModalOpened(false);
    },
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "executeRuling",
        id: proposalData.id,
        containerId: proposalData.strategy.id,
      });
    },
  });

  const { write: writeRuleAbstain } = useContractWriteWithConfirmations({
    contractName: "CVStrategy",
    functionName: "rule",
    abi: cvStrategyABI,
    address: proposalData.strategy.id as Address,
    args: [BigInt(lastDispute?.disputeId ?? 0), BigInt(ABSTAINED_RULING)],
    onSuccess: () => {
      setIsModalOpened(false);
    },
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "rule",
        id: proposalData.id,
        containerId: proposalData.strategy.id,
      });
    },
  });

  const handleSubmitRuling = (ruling: number) => {
    if (isTimeout) {
      writeRuleAbstain();
    } else {
      writeSubmitRuling({
        args: [
          BigInt(lastDispute?.disputeId),
          BigInt(ruling),
          proposalData.strategy.id as Address,
        ],
      });
    }
  };

  const content = (
    <div className="flex md:flex-col gap-10">
      {isDisputed ?
        <div className="p-16 rounded-lg">
          {disputes.map((dispute) => (
            <Fragment key={dispute.id}>
              <DisputeMessage dispute={dispute} />
            </Fragment>
          ))}
        </div>
      : <div>
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
        </div>
      }
      <ProposalTimeline proposalData={proposalData} disputes={disputes} />
    </div>
  );

  const buttons = (
    <div className="modal-action w-full">
      {isDisputed ?
        <div className="w-full flex justify-end gap-4">
          {DisputeStatus[lastDispute.status] === "waiting" &&
            (isCouncilSafe || isTimeout) && (
              <>
                <Button
                  color="secondary"
                  btnStyle="outline"
                  onClick={() => handleSubmitRuling(ABSTAINED_RULING)}
                >
                  <InfoWrapper
                    classNames={`[&>svg]:text-secondary-content ${isTimeout ? "tooltip-left" : ""}`}
                    tooltip={
                      "Abstain to let other tribunal-safe members decide the outcome."
                    }
                  >
                    Abstain
                  </InfoWrapper>
                </Button>
                {!isTimeout && (
                  <>
                    <Button
                      color="primary"
                      btnStyle="outline"
                      onClick={() => handleSubmitRuling(APPROVED_RULING)}
                    >
                      <InfoWrapper
                        classNames="[&>svg]:text-primary-content"
                        tooltip={
                          "Approve if the dispute is invalid and the proposal should be kept active."
                        }
                      >
                        Approve
                      </InfoWrapper>
                    </Button>
                    <Button
                      color="danger"
                      btnStyle="outline"
                      onClick={() => handleSubmitRuling(REJECTED_RULING)}
                    >
                      <InfoWrapper
                        classNames="[&>svg]:text-error-content [&:before]:mr-10 tooltip-left"
                        tooltip={
                          "Reject if, regarding the community covenant, the proposal is violating the rules."
                        }
                      >
                        Reject
                      </InfoWrapper>
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
                tooltip={`Collateral: ${formatEther(config.challengerCollateralAmount)} ETH \n Fee: ${formatEther(arbitrationCost ?? 0n)} ETH`}
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
              tooltip={
                isEnoughBalance ?
                  isCooldown ?
                    "Need to wait for 2 hours before disputin again"
                  : ""
                : "Insufficient balance"
              }
              tooltipSide="tooltip-left"
              disabled={!isEnoughBalance || isCooldown}
              isLoading={isLoading}
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
