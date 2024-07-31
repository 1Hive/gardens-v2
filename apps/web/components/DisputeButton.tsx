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
import { InfoBox } from "./InfoBox";
import { InfoIcon } from "./InfoIcon";
import { WalletBalance } from "./WalletBalance";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MetadataV1, useIpfsFetch } from "@/hooks/useIpfsFetch";
import { cvStrategyABI } from "@/src/generated";
import { DisputeStatus, ProposalStatus } from "@/types";
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
  let dispute = {
    id: "1",
    reasonHash: "QmSoxngvbp1k1Dy5SV5YchrQFDaNwf94dRHuHXpxFQMNcc",
    status: 0,
    outcome: 0,
    expiration: 0,
    challenger: "0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6",
    abstainOutcome: 1, // 1: Challenger, 2: Supporter
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

  const isDisputed = false;
  // proposalData && ProposalStatus[proposalData.proposalStatus] === "disputed";

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

  const countdown = useMemo(() => {
    // timestamp of now + 1 min
    return (Date.now() + 60 * 1000 * 2) / 1000;
  }, []);

  const timeline = (
    <ul className="timeline mt-5">
      <li className="w-1/4">
        <div className="timeline-end">Proposal created</div>
        <div className="timeline-middle rounded-full text-tertiary-soft bg-tertiary-content m-0.5">
          <CheckIcon className="w-4 m-0.5" />
        </div>
        <hr className="bg-tertiary-content" />
      </li>
      <li>
        <hr className="bg-tertiary-content w-8" />
        <div className="timeline-middle rounded-full text-tertiary-soft bg-tertiary-content m-0.5">
          <CheckIcon className="w-4 m-0.5" />
        </div>
        <div className="timeline-end">Disputed</div>
        <hr className="bg-tertiary-content" />
      </li>
      <li className="flex-grow">
        <hr className="bg-tertiary-content" />
        <div className="timeline-middle rounded-full text-tertiary-content bg-transparent border border-tertiary-content">
          <CheckIcon className="w-4 m-0.5" />
        </div>
        <div className="timeline-start shadow-lg p-2 border border-tertiary-content rounded-lg flex items-center gap-2">
          <InfoIcon
            classNames="[&>svg]:text-tertiary-content"
            content={`The tribunal safe has 3 days to rule the dispute. Past this delay and considering the abstain behavior on this pool, this proposal will be ${dispute.abstainOutcome ? "cancelled" : "back to active"} and both collateral will be restored.`}
          >
            <Countdown timestamp={countdown} />
          </InfoIcon>
        </div>
        <hr className="bg-neutral-soft-content" />
      </li>
      <li>
        <hr className="bg-neutral-soft-content" />
        <div className="timeline-end">Ruled</div>
        <div className="timeline-middle rounded-full text-primary bg-neutral-soft-content m-0.5">
          <CheckIcon className="w-4 m-0.5" />
        </div>
        <hr className="bg-neutral-soft-content" />
      </li>
      <li className="w-1/4">
        <hr className="bg-neutral-soft-content" />
        <div className="timeline-start">
          <InfoIcon
            classNames="[&:before]:mr-8 [&>svg]:text-primary-content"
            content="The proposal will keep the accumulated growth and be back to active."
          >
            <div className="text-primary-content">Approved</div>
          </InfoIcon>
        </div>
        <div className="timeline-end">
          <InfoIcon
            content="The proposal will be cancelled."
            classNames="[&>svg]:text-danger-content"
          >
            <div className="text-danger-content">Rejected</div>
          </InfoIcon>
        </div>
        <div className="timeline-middle rounded-full text-primary bg-neutral-soft-content m-0.5">
          <CheckIcon className="w-4 m-0.5" />
        </div>
      </li>
    </ul>
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
        <div className="modal-box w-full md:w-6/12 md:max-w-3xl overflow-x-clip">
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
          {isDisputed ?
            <>
              <div className="p-4 border rounded-lg">
                <div className="chat chat-start">
                  <div className="chat-image">
                    {dispute?.challenger && (
                      <div
                        className={`tooltip ${copied ? "" : "[&:before]:max-w-none [&:before]:ml-36"}`}
                        data-tip={
                          copied ? "Copied" : `Copy: ${dispute.challenger}`
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
              {timeline}
              <div className="modal-action justify-end">
                {DisputeStatus[dispute.status] === "waiting" && (
                  <>
                    <Button color="secondary" btnStyle="outline">
                      <InfoIcon
                        classNames="[&>svg]:text-secondary-content"
                        content={
                          "Abstain to let other tribunal-safe members decide the outcome."
                        }
                      >
                        Abstain
                      </InfoIcon>
                    </Button>
                    <Button color="primary" btnStyle="outline">
                      <InfoIcon
                        classNames="[&>svg]:text-primary-content"
                        content={
                          "Approve if the dispute is invalid and the proposal should be kept active."
                        }
                      >
                        Approve
                      </InfoIcon>
                    </Button>
                    <Button color="danger" btnStyle="outline">
                      <InfoIcon
                        classNames="[&>svg]:text-danger-content [&:before]:mr-10"
                        content={
                          "Reject if, regarding the community covenant, the proposal is violating the rules."
                        }
                      >
                        Reject
                      </InfoIcon>
                    </Button>
                  </>
                )}
              </div>
            </>
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
                content="Disputing this proposal will prevent its execution but not its
        growth and support, and the Tribunal will have one week to resolve
        any dispute before it can be closed and collateral restored."
              />
              <div className="modal-action justify-between items-end flex-wrap gap-4">
                <WalletBalance
                  label="Fees + Collateral"
                  token="native"
                  askedAmount={collateral + disputeFee}
                  tooltip={`Collateral: ${collateral} ETH \n Dispute Fee: ${disputeFee} ETH`}
                  setIsEnoughBalance={setIsEnoughBalance}
                />
                {/* Buttons */}
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
            </>
          }
        </div>
      </dialog>
    </>
  );
};
