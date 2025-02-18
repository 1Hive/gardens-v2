import { FC, Fragment, useMemo, useState } from "react";
// @ts-ignore - no types available
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
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
  ArbitrableConfig,
  CVProposal,
  CVStrategy,
  getProposalDisputesDocument,
  getProposalDisputesQuery,
  Maybe,
  ProposalDispute,
  ProposalDisputeMetadata,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DateComponent } from "./DateComponent";
import { EthAddress } from "./EthAddress";
import { InfoBox } from "./InfoBox";
import { InfoWrapper } from "./InfoWrapper";
import { Modal } from "./Modal";
import { ProposalTimeline } from "./ProposalTimeline";
import { WalletBalance } from "./WalletBalance";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { MetadataV1, useIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import {
  cvStrategyABI,
  iArbitratorABI,
  safeABI,
  safeArbitratorABI,
} from "@/src/generated";
import { DisputeStatus, ProposalStatus } from "@/types";
import { delayAsync } from "@/utils/delayAsync";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import { convertSecondsToReadableTime } from "@/utils/numbers";

type Props = {
  proposalData: Maybe<
    Pick<
      CVProposal,
      "id" | "proposalNumber" | "blockLast" | "proposalStatus" | "createdAt"
    > & {
      strategy: Pick<CVStrategy, "id" | "poolId">;
      arbitrableConfig: Pick<
        ArbitrableConfig,
        | "defaultRulingTimeout"
        | "defaultRuling"
        | "arbitrator"
        | "challengerCollateralAmount"
        | "submitterCollateralAmount"
        | "tribunalSafe"
      >;
    }
  > &
    MetadataV1;
  isMemberCommunity: boolean;
};

const ABSTAINED_RULING = 0;
const APPROVED_RULING = 1;
const REJECTED_RULING = 2;

export const DisputeButton: FC<Props> = ({
  proposalData,
  isMemberCommunity,
}) => {
  const [isModalOpened, setIsModalOpened] = useState(false);
  const [reason, setReason] = useState("");
  const [isEnoughBalance, setIsEnoughBalance] = useState(true);
  const { publish } = usePubSubContext();
  const { address } = useAccount();
  const [isDisputeCreateLoading, setIsDisputeCreateLoading] = useState(false);
  const { id: chainId, safePrefix } = useChainFromPath()!;
  const [rulingLoading, setisRulingLoading] = useState<number | false>(false);
  const [error, setError] = useState("");

  const arbitrationConfig = proposalData.arbitrableConfig;

  const { data: disputesResult } = useSubgraphQuery<getProposalDisputesQuery>({
    query: getProposalDisputesDocument,
    variables: {
      proposalId: proposalData?.id.toLowerCase(),
    },
    changeScope: {
      topic: "proposal",
      id: proposalData?.proposalNumber,
      containerId: proposalData?.strategy.poolId,
      type: "update",
    },
    enabled: !!proposalData,
  });

  const { data: arbitrationCost } = useContractRead({
    chainId,
    abi: iArbitratorABI,
    functionName: "arbitrationCost",
    address: arbitrationConfig?.arbitrator as Address,
    enabled: !!arbitrationConfig?.arbitrator,
    args: ["0x0"],
  });

  const { data: disputeCooldown } = useContractRead({
    chainId,
    abi: cvStrategyABI,
    functionName: "DISPUTE_COOLDOWN_SEC",
    address: proposalData.strategy.id as Address,
  });

  const totalStake =
    arbitrationCost != null && arbitrationConfig ?
      arbitrationCost + BigInt(arbitrationConfig.challengerCollateralAmount)
    : undefined;
  const lastDispute =
    disputesResult?.proposalDisputes[
      disputesResult?.proposalDisputes.length - 1
    ];
  const isCooldown =
    !!lastDispute &&
    !!disputeCooldown &&
    +lastDispute.ruledAt + Number(disputeCooldown) > Date.now() / 1000;
  const proposalStatus = ProposalStatus[proposalData.proposalStatus];
  const isDisputed =
    proposalData && lastDispute && proposalStatus === "disputed";
  const isTimeout =
    lastDispute &&
    arbitrationConfig &&
    +lastDispute.createdAt + +arbitrationConfig.defaultRulingTimeout <
      Date.now() / 1000;
  const disputes = disputesResult?.proposalDisputes ?? [];
  const isProposalEnded = proposalStatus !== "active" && !isDisputed;
  const isTribunalSafe =
    arbitrationConfig.tribunalSafe === address?.toLowerCase();

  const { data: isTribunalMember } = useContractRead({
    address: arbitrationConfig.tribunalSafe as Address,
    abi: safeABI,
    functionName: "isOwner" as any,
    chainId: Number(chainId),
    enabled: !!address,
    args: [address as Address],
    onError: () => {
      console.error("Error reading isOwner from Tribunal Safe");
    },
  });

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
      onSettled: () => {
        setIsDisputeCreateLoading(false);
      },
      onConfirmations: () => {
        publish({
          topic: "proposal",
          type: "update",
          function: "disputeProposal",
          id: proposalData.proposalNumber,
          containerId: proposalData.strategy.poolId,
          chainId,
        });
      },
    });

  async function handleSubmit() {
    if (!reason) {
      setError("The dispute reason is required.");
    } else {
      setIsDisputeCreateLoading(true);
      const reasonHash = await ipfsJsonUpload({ reason }, "disputeReason");
      if (!reasonHash) {
        return;
      }
      await writeDisputeProposalAsync({
        args: [BigInt(proposalData.proposalNumber), reasonHash, "0x0"],
      });
    }
  }

  const { write: writeSubmitRuling } = useContractWriteWithConfirmations({
    contractName: "SafeArbitrator",
    functionName: "executeRuling",
    abi: safeArbitratorABI,
    address: arbitrationConfig?.arbitrator as Address,
    onSuccess: () => {
      setIsModalOpened(false);
    },
    onSettled: () => setisRulingLoading(false),
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "executeRuling",
        id: proposalData.proposalNumber,
        containerId: proposalData.strategy.poolId,
        chainId,
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
    onSettled: () => setisRulingLoading(false),
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "rule",
        id: proposalData.proposalNumber,
        containerId: proposalData.strategy.poolId,
        chainId,
      });
    },
  });

  const handleSubmitRuling = (ruling: number) => {
    setisRulingLoading(ruling);
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

  const disableDisputeSubmitBtn = useMemo<ConditionObject[]>(
    () => [
      {
        condition: !isMemberCommunity,
        message: "Join community to dispute",
      },
      {
        condition: !isEnoughBalance,
        message: "Insufficient balance",
      },
      {
        condition: isCooldown,
        message: "Please wait 2 hours before submitting another dispute",
      },
      {
        condition: isCooldown,
        message: "Please wait 2 hours before submitting another dispute",
      },
    ],
    [isEnoughBalance, isCooldown],
  );

  const { isConnected, missmatchUrl, tooltipMessage } = useDisableButtons(
    disableDisputeSubmitBtn,
  );

  const rulingTimeout = convertSecondsToReadableTime(
    arbitrationConfig.defaultRulingTimeout,
  );

  const content = (
    <div className="flex md:flex-col gap-10 flex-wrap overflow-x-hidden">
      {proposalStatus !== "active" ?
        <div className="p-16 rounded-lg">
          {disputes.map((dispute) => (
            <Fragment key={dispute.id}>
              <DisputeMessage dispute={dispute} />
            </Fragment>
          ))}
        </div>
      : <div>
          <div className="w-full mb-4">
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter your dispute reason here"
              className="textarea textarea-accent w-full"
              rows={5}
              required
            />
            <div className="text-error ml-4 mt-1">{error}</div>
          </div>
          <InfoBox
            infoBoxType="info"
            content={`Disputing this proposal stops it from being executed but not from growing in support. The Tribunal has ${rulingTimeout.value} ${rulingTimeout.unit} to settle any disputes before it can be closed and collateral is returned.`}
          />
        </div>
      }
      <ProposalTimeline proposalData={proposalData} disputes={disputes} />
    </div>
  );

  //Disable only tribunal safe  buttons: Reject and Approve
  const disableTribunalSafeBtnCondition: ConditionObject[] = [
    {
      condition: !isTribunalSafe,
      message: "Connect with Tribunal safe",
    },
  ];

  const disableTribunalSafeButtons = disableTribunalSafeBtnCondition.find(
    (cond) => cond.condition,
  );

  const buttons = (
    <div className="modal-action w-full">
      {isDisputed ?
        <>
          {DisputeStatus[+lastDispute.status] === "waiting" &&
            (!!isTribunalMember || isTribunalSafe) && (
              <div className="flex flex-col gap-1 p-1 w-48">
                <a
                  href={`https://app.safe.global/transactions/queue?safe=${safePrefix}:${arbitrationConfig.tribunalSafe}`}
                  className="text-info whitespace-nowrap flex flex-nowrap gap-1 items-center"
                  target="_blank"
                  rel="noreferrer"
                >
                  Tribunal safe
                  <ArrowTopRightOnSquareIcon width={16} height={16} />
                </a>
                <EthAddress
                  address={arbitrationConfig.tribunalSafe as Address}
                  shortenAddress={true}
                  actions="copy"
                  showPopup={false}
                />
              </div>
            )}
          <div className="w-full flex justify-end gap-4 flex-wrap">
            {(
              DisputeStatus[+lastDispute.status] === "waiting" &&
              (!!isTribunalMember || isTribunalSafe || isTimeout)
            ) ?
              <>
                <Button
                  color="secondary"
                  btnStyle="outline"
                  onClick={() => handleSubmitRuling(ABSTAINED_RULING)}
                  isLoading={rulingLoading === ABSTAINED_RULING}
                  disabled={!!disableTribunalSafeButtons}
                  tooltip={disableTribunalSafeButtons?.message}
                >
                  <InfoWrapper
                    className={"[&>svg]:text-secondary-content"}
                    tooltip={`Abstain to follow the pool's default resolution (${arbitrationConfig.defaultRuling === APPROVED_RULING ? "approved" : "rejected"}) and return collaterals to both parties.`}
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
                      isLoading={rulingLoading === APPROVED_RULING}
                      disabled={!!disableTribunalSafeButtons}
                      tooltip={disableTribunalSafeButtons?.message}
                    >
                      <InfoWrapper
                        className="[&>svg]:text-primary-content"
                        tooltip={
                          "Approve if the dispute is invalid and the proposal should remain active."
                        }
                      >
                        Approve
                      </InfoWrapper>
                    </Button>
                    <Button
                      color="danger"
                      btnStyle="outline"
                      onClick={() => handleSubmitRuling(REJECTED_RULING)}
                      isLoading={rulingLoading === REJECTED_RULING}
                      disabled={!!disableTribunalSafeButtons}
                      tooltip={disableTribunalSafeButtons?.message}
                      tooltipSide="tooltip-left"
                    >
                      <InfoWrapper
                        className="[&>svg]:!text-danger-content tooltip-left"
                        tooltip={
                          "Reject if the proposal violates the rules outlined in the community covenant."
                        }
                      >
                        Reject
                      </InfoWrapper>
                    </Button>
                  </>
                )}
              </>
            : <InfoBox
                infoBoxType="info"
                content="Waiting for dispute resolution"
              />
            }
          </div>
        </>
      : <div className="flex w-full justify-between items-end flex-wrap gap-2">
          <div>
            {totalStake && (
              <WalletBalance
                label="Dispute Stake"
                token="native"
                askedAmount={totalStake}
                tooltip={`Collateral: ${formatEther(arbitrationConfig.challengerCollateralAmount)} ETH \n Fee: ${formatEther(arbitrationCost ?? 0n)} ETH`}
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
              disabled={
                !isConnected ||
                missmatchUrl ||
                !isMemberCommunity ||
                !isEnoughBalance ||
                isCooldown
              }
              tooltip={tooltipMessage}
              tooltipSide="tooltip-left"
              isLoading={isDisputeCreateLoading}
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
      {(proposalStatus === "active" || lastDispute != null) && (
        <>
          <Button
            color="danger"
            btnStyle="outline"
            onClick={() => setIsModalOpened(true)}
          >
            {isDisputed ?? isProposalEnded ? "Open dispute" : "Dispute"}
          </Button>
          <Modal
            title={`Disputed Proposal: ${proposalData.title} #${proposalData.proposalNumber}`}
            onClose={() => setIsModalOpened(false)}
            isOpen={isModalOpened}
            size="extra-large"
          >
            {content}
            {!isProposalEnded && buttons}
          </Modal>
        </>
      )}
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
    metadata?: Maybe<Pick<ProposalDisputeMetadata, "reason">>;
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
        {dispute.metadata?.reason ?? disputeMetadata?.reason}
      </div>
    </div>
  );
};
