import { FC, useMemo, useRef, useState } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { blo } from "blo";
import { Address, mainnet, useEnsAvatar, useEnsName } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  Maybe,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { Countdown } from "./Countdown";
import { DateComponent } from "./DateComponent";
import { InfoBox } from "./InfoBox";
import { InfoIcon } from "./InfoIcon";
import { ProposalTimeline } from "./ProposalTimeline";
import { WalletBalance } from "./WalletBalance";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MetadataV1, useIpfsFetch } from "@/hooks/useIpfsFetch";
import { cvStrategyABI } from "@/src/generated";
import { DisputeOutcome, DisputeStatus, ProposalStatus } from "@/types";
import { delayAsync } from "@/utils/delayAsync";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";

type Props = {
  proposalData: Maybe<
    Pick<
      CVProposal,
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
  const disputeTimestamp = useMemo(() => {
    // timestamp of now -  2days
    return (Date.now() - 1 * 24 * 3600_000) / 1000;
  }, []);
  let dispute = {
    id: 1,
    reasonHash: "QmSoxngvbp1k1Dy5SV5YchrQFDaNwf94dRHuHXpxFQMNcc",
    status: 0, // 0: Waiting, 1: Solved
    outcome: 1, // 0: Abstained, 1: Approved, 2: Rejected
    maxDelaySec: 259200, // 3 days -> 259200
    challenger: "0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6",
    abstainOutcome: 2, // 1: Approved, 2: Rejected
    timestamp: disputeTimestamp,
    ruledAt: disputeTimestamp + 259200,
  };
  proposalData.proposalStatus = 2;
  // End of TODO

  const { data: ensName } = useEnsName({
    address: dispute.challenger as Address,
    chainId: mainnet.id,
    enabled: !!dispute.challenger,
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    chainId: mainnet.id,
    enabled: !!ensName,
  });

  const { data: disputeMetadata } = useIpfsFetch<DisputeMetadata>(
    dispute.reasonHash,
  );
  //  const { data: dispute } = useSubgraphQuery<getDisputeQuery>({
  //    query: getDisputeDocument,
  //    variables: {
  //      proposalId: proposalData?.proposalNumber,
  //      poolId: proposalData?.strategy.id,
  //    },
  //    changeScope: {
  //      topic: "proposal",
  //      id: proposalData?.proposalNumber,
  //      containerId: proposalData?.strategy.id,
  //      type: "update",
  //    },
  //    enabled: !!proposalData,
  //  });

  const collateral = 0.002;
  const disputeFee = 0.001;

  const isDisputed =
    proposalData && ProposalStatus[proposalData.proposalStatus] === "disputed";
  const isTimeout = dispute.timestamp + dispute.maxDelaySec < Date.now() / 1000;

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
    navigator.clipboard.writeText(dispute.challenger);
    setCopied(true);
    await delayAsync(1000);
    setCopied(false);
  }

  const content =
    isDisputed ?
      <div className="flex flex-col gap-10">
        <div className="p-4 border rounded-lg">
          <div className="chat chat-start">
            <div className="chat-image">
              {dispute?.challenger && (
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
                      src={
                        avatarUrl ? avatarUrl : (
                          blo(dispute.challenger as Address)
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
        <ProposalTimeline proposalData={proposalData} dispute={dispute} />
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
          content="disputing this proposal will prevent its execution but not its
growth and support, and the Tribunal will have one week to resolve
any dispute before it can be closed and collateral restored."
        />
      </>;

  const buttons = (
    <div className="modal-action w-full">
      {isDisputed ?
        <div className="w-full flex justify-end gap-2">
          {DisputeStatus[dispute.status] === "waiting" && (
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
      : <div className="flex w-full justify-between items-center">
          {/* <WalletBalance
            label="Fees + Collateral"
            token="native"
            askedAmount={collateral + disputeFee}
            tooltip={`Collateral: ${collateral} ETH \n Dispute Fee: ${disputeFee} ETH`}
            setIsEnoughBalance={setIsEnoughBalance}
          /> */}
          <div>Arbitration cost</div>
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
        <div className="modal-box w-full md:w-6/12 md:max-w-3xl overflow-x-clip flex flex-col">
          <form
            className="flex flex-row justify-between items-start mb-4"
            method="dialog"
          >
            <h3 className="font-bold text-lg">
              Disputed Proposal: {proposalData.title} #
              {proposalData.proposalNumber}
            </h3>
            <button>
              <XMarkIcon className="w-4" />
            </button>
          </form>
          {content}
          {buttons}
        </div>
      </dialog>
    </>
  );
};
