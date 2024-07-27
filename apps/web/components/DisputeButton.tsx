import { FC, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  Maybe,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { InfoBox } from "./InfoBox";
import { WalletBalance } from "./WalletBalance";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { cvStrategyABI } from "@/src/generated";
import { getIpfsMetadata, ipfsJsonUpload } from "@/utils/ipfsUtils";
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
    Awaited<ReturnType<typeof getIpfsMetadata>>;
};

export const DisputeButton: FC<Props> = ({ proposalData }) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [isEnoughBalance, setIsEnoughBalance] = useState(false);
  const { publish } = usePubSubContext();

  const collateral = 0.002;
  const disputeFee = 0.001;

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
        id: proposalData.proposalNumber,
        containerId: proposalData.strategy.id,
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
        Dispute
      </Button>
      <dialog ref={modalRef} className="modal">
        <div className="modal-box w-full md:w-6/12 md:max-w-3xl overflow-x-clip">
          <form
            className="flex flex-row justify-between items-start mb-4"
            method="dialog"
          >
            <h3 className="font-bold text-lg ">
              Dispute proposal{" "}
              {`${proposalData.title} #${proposalData.proposalNumber}`}
            </h3>
            <button>
              <XMarkIcon className="w-4" />
            </button>
          </form>
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
        </div>
      </dialog>
    </>
  );
};
