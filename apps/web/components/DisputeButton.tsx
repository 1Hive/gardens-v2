import { FC, useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { blo } from "blo";
import ReactDOM from "react-dom";
import { Address, mainnet, useEnsAvatar, useEnsName } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  Maybe,
} from "#/subgraph/.graphclient";
import { EthAddress } from ".";
import { Button } from "./Button";
import { InfoBox } from "./InfoBox";
import { InfoIcon } from "./InfoIcon";
import { WalletBalance } from "./WalletBalance";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MetadataV1, useIpfsFetch } from "@/hooks/useIpfsFetch";
import { cvStrategyABI } from "@/src/generated";
import { DisputeStatus, ProposalStatus } from "@/types";
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

  // TODO: Remove fake
  let dispute = {
    id: "1",
    reasonHash: "QmSoxngvbp1k1Dy5SV5YchrQFDaNwf94dRHuHXpxFQMNcc",
    status: 0,
    outcome: 0,
    expiration: 0,
    challenger: "0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6",
  };
  proposalData.proposalStatus = 2;
  // End of TODO

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

  return (
    <>
      <Button
        btnStyle="outline"
        color="danger"
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
                      //  eslint-disable-next-line @next/next/no-img-element
                      <EthAddress
                        address={dispute.challenger as Address}
                        actions="none"
                        icon="ens"
                      />
                    )}
                  </div>
                  <div className="chat-bubble bg-neutral-content text-neutral">
                    {disputeMetadata?.reason}
                  </div>
                </div>
              </div>
              <div className="modal-action justify-end">
                {DisputeStatus[dispute.status] === "waiting" && (
                  <>
                    <Button color="secondary" btnStyle="outline">
                      Abstain
                    </Button>
                    <Button color="primary" btnStyle="outline">
                      Approve
                    </Button>
                    <Button color="danger" btnStyle="outline">
                      Reject
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
                    btnStyle="outline"
                    color="danger"
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
