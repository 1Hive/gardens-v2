import { FC, useMemo, useRef, useState } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { blo } from "blo";
import { Address, mainnet, useEnsAvatar, useEnsName } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  getProposalDisputesDocument,
  getProposalDisputesQuery,
  getStrategyArbitrationConfigDocument,
  getStrategyArbitrationConfigQuery,
  Maybe,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { Countdown } from "./Countdown";
import { DateComponent } from "./DateComponent";
import { InfoBox } from "./InfoBox";
import { InfoIcon } from "./InfoIcon";
import { LoadingSpinner } from "./LoadingSpinner";
// import { ProposalTimeline } from "./ProposalTimeline";
import { WalletBalance } from "./WalletBalance";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MetadataV1, useIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { cvStrategyABI } from "@/src/generated";
import { DisputeOutcome, DisputeStatus, ProposalStatus } from "@/types";
import { delayAsync } from "@/utils/delayAsync";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";

type Props = {
  proposalData: Maybe<
    Pick<
      CVProposal,
      | "id"
      | "proposalNumber"
      | "beneficiary"
      | "blockLast"
      | "convictionLast"
      | "createdAt"
      | "metadata"
      | "proposalStatus"
      | "requestedAmount"
      | "requestedToken"
      | "stakedAmount"
      | "submitter"
      | "threshold"
      | "updatedAt"
      | "version"
    > & {
      strategy: Pick<CVStrategy, "id"> & {
        config: Pick<
          CVStrategyConfig,
          "proposalType" | "pointSystem" | "minThresholdPoints"
        >;
      };
    }
  > &
    MetadataV1;
};

type DisputeMetadata = {
  reason: string;
};

export const DisputeButton: FC<Props> = ({ proposalData }) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [isEnoughBalance, setIsEnoughBalance] = useState(false);
  const { publish } = usePubSubContext();
  const [copied, setCopied] = useState(false);

  // TODO: Remove fake
  // const disputeTimestamp = useMemo(() => {
  //   // timestamp of now -  2days
  //   return (Date.now() - 1 * 24 * 3600_000) / 1000;
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
  // proposalData.proposalStatus = 2;
  // End of TODO

  const { data: disputes } = useSubgraphQuery<getProposalDisputesQuery>({
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
  });

  const { data: arbitrationConfig } =
    useSubgraphQuery<getStrategyArbitrationConfigQuery>({
      query: getStrategyArbitrationConfigDocument,
      variables: {
        strategyId: proposalData!.strategy.id,
      },
      changeScope: {
        topic: "pool",
        id: proposalData?.strategy.id,
        type: "update",
      },
      enabled: !!proposalData,
    });

  const lastDispute = disputes?.proposalDisputes[0];

  const { data: ensName } = useEnsName({
    address: lastDispute?.challenger as Address,
    chainId: mainnet.id,
    enabled: !!lastDispute?.challenger,
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    chainId: mainnet.id,
    enabled: !!ensName,
  });

  const { data: disputeMetadata } = useIpfsFetch<DisputeMetadata>({
    hash: lastDispute?.context,
    enabled: !lastDispute?.metadata,
  });

  const config = arbitrationConfig?.cvstrategy?.config;

  const isDisputed =
    proposalData &&
    ProposalStatus[proposalData.proposalStatus] === "disputed" &&
    lastDispute;
  const isTimeout =
    lastDispute && config && lastDispute.createdAt + config < Date.now() / 1000;

  const { write } = useContractWriteWithConfirmations({
    contractName: "CVStrategy",
    // functionName: "disputeProposal",
    // value: parseEther(askedAmount.toString()),
    abi: cvStrategyABI,
    onSuccess: () => {
      modalRef.current?.close();
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
    modalRef.current?.close();
    const reasonHash = await ipfsJsonUpload({ reason }, "disputeReason");
    // write({
    //   args: [proposalData.proposalNumber, reasonHash],
    // });
  }

  async function onCopyChallenger() {
    if (!lastDispute) {
      return;
    }
    navigator.clipboard.writeText(lastDispute.challenger);
    setCopied(true);
    await delayAsync(1000);
    setCopied(false);
  }

  const content =
    isDisputed ?
      <div className="flex flex-col gap-20">
        <div className="p-16 rounded-lg">
          <div className="chat chat-start">
            <div className="chat-image">
              {lastDispute?.challenger && (
                <div
                  className={`tooltip ${copied ? "" : "[&:before]:max-w-none [&:before]:ml-36"}`}
                  data-tip={
                    copied ? "Copied" : `Copy: ${lastDispute.challenger}`
                  }
                >
                  <button
                    onClick={() => onCopyChallenger()}
                    className="btn btn-circle"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Avatar of wallet address"
                      className={"!rounded-full"}
                      src={
                        avatarUrl ? avatarUrl : (
                          blo(lastDispute.challenger as Address)
                        )
                      }
                    />
                  </button>
                </div>
              )}
            </div>
            <div className="chat-bubble shadow-lg bg-neutral-200">
              {disputeMetadata?.reason}
            </div>
          </div>
        </div>
        {/* {lastDispute && (
          <ProposalTimeline proposalData={proposalData} dispute={lastDispute} />
        )} */}
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
        <div className="w-full flex justify-end gap-2">
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
                      classNames="[&>svg]:text-danger-content [&:before]:mr-10"
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
          <WalletBalance
            label="Fees + Collateral"
            token="native"
            askedAmount={0.1 + 0.01}
            tooltip={`Collateral: ${0.05} ETH \n Fee: ${0.05} ETH`}
            setIsEnoughBalance={setIsEnoughBalance}
          />

          <div className="flex gap-2">
            <Button
              onClick={() => modalRef.current?.close()}
              color="danger"
              btnStyle="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              color="danger"
              tooltip={isEnoughBalance ? "" : "Insufficient balance"}
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
        onClick={() => modalRef.current?.showModal()}
      >
        {isDisputed ? "Open dispute" : "Dispute"}
      </Button>
      <dialog ref={modalRef} className="modal">
        <div className="modal-backdrop">Close</div>
        <div className="modal-box w-full md:w-6/12 md:max-w-3xl overflow-x-clip flex flex-col gap-4">
          <form
            className="flex flex-row justify-between items-start mb-4"
            method="dialog"
          >
            <h3>
              Disputed Proposal: {proposalData.title} #
              {proposalData.proposalNumber}
            </h3>
            <button>
              <XMarkIcon className="w-6" />
            </button>
          </form>
          {content}
          {buttons}
        </div>
      </dialog>
    </>
  );
};
