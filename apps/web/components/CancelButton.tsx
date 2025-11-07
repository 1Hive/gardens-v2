import React, { useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Address } from "wagmi";
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
        containerId: proposalData.strategy.poolId,
        chainId: chainId,
      });
    },
  });

  return (
    <>
      <Button
        btnStyle="outline"
        color="danger"
        onClick={() => setIsModalOpen(true)}
      >
        Cancel
      </Button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Cancel proposal: ${proposalData.title} #${proposalData.proposalNumber}`}
        icon={<ExclamationTriangleIcon color="#e74b4d" />}
      >
        <div>
          <div>
            This action cannot be undone.
            <span className="font-semibold ml-1">
              Are you sure you want to cancel?
            </span>
          </div>

          <div className="modal-action">
            <Button
              btnStyle="outline"
              color="danger"
              onClick={() => setIsModalOpen(false)}
            >
              No, close
            </Button>
            <Button
              btnStyle="filled"
              color="danger"
              isLoading={isLoading}
              onClick={() =>
                writeCancel({ args: [BigInt(proposalData.proposalNumber)] })
              }
            >
              Yes, cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default CancelButton;
