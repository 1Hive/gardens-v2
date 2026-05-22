import React, { useState } from "react";
import { Address } from "viem";
import { CVProposal, CVStrategy, Maybe } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MetadataV1 } from "@/hooks/useIpfsFetch";
import { cvStrategyABI } from "@/src/generated";

type Props = {
  proposalData: Maybe<
    Pick<CVProposal, "id" | "proposalNumber"> & {
      strategy: Pick<CVStrategy, "id" | "poolId">;
    }
  > &
    MetadataV1;
};

function CancelButton({ proposalData }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const chainId = useChainIdFromPath();
  const { publish } = usePubSubContext();
  const { strategy } = proposalData;
  const [, proposalNumber] = proposalData.id.split("-");

  const { write: writeCancel, isLoading } = useContractWriteWithConfirmations({
    address: strategy.id as Address,
    abi: cvStrategyABI,
    functionName: "cancelProposal",
    contractName: "CV Strategy",
    fallbackErrorMessage: "Error cancelling proposal, please report a bug.",
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "cancelProposal",
        id: +proposalNumber,
        containerId: proposalData.strategy.id,
        chainId: chainId,
      });
    },
  });

  return (
    <>
      <Button
        btnStyle="outline"
        color="danger"
        testId="btn-cancel-proposal"
        onClick={() => setIsModalOpen(true)}
      >
        Cancel
      </Button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={"Cancel proposal"}
      >
        <div>
          This proposal will be cancelled: {proposalData.title}, this action
          cannot be undone.
        </div>

        <div className="modal-action !mt-4">
          <Button
            btnStyle="ghost"
            color="secondary"
            onClick={() => setIsModalOpen(false)}
          >
            Close
          </Button>
          <Button
            btnStyle="filled"
            color="danger"
            isLoading={isLoading}
            onClick={() =>
              writeCancel({ args: [BigInt(proposalData.proposalNumber)] })
            }
            testId="btn-confirm-cancel-proposal"
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default CancelButton;
