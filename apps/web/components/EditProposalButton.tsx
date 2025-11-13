import React, { useState } from "react";
import {
  ExclamationTriangleIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { FetchTokenResult } from "@wagmi/core";
import { Address } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  Maybe,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { EditProposalForm } from "./Forms/EditProposalForm";
import { Modal } from "./Modal";
import { calculateMinimumConviction } from "./PoolHeader";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MetadataV1 } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import { cvStrategyABI } from "@/src/generated";
import {
  CV_SCALE_PRECISION,
  formatTokenAmount,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";

type Props = {
  proposalData: Pick<
    CVProposal,
    "metadataHash" | "requestedAmount" | "beneficiary" | "id" | "proposalNumber"
  > & {
    strategy: Pick<
      CVStrategy,
      | "id"
      | "poolId"
      | "token"
      | "maxCVSupply"
      | "totalEffectiveActivePoints"
      | "registryCommunity"
    > & {
      config: Pick<
        CVStrategyConfig,
        "maxRatio" | "weight" | "decay" | "proposalType"
      >;
    };
  } & MetadataV1;
  poolToken: ReturnType<typeof usePoolToken>;
};

function EditProposalButton({ proposalData, poolToken }: Props) {
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

  const spendingLimitPctValue =
    (Number(proposalData.strategy.config.maxRatio || 0) / CV_SCALE_PRECISION) *
    100;

  const minimumConviction = calculateMinimumConviction(
    proposalData.strategy.config.weight,
    spendingLimitPctValue * MAX_RATIO_CONSTANT,
  );

  const spendingLimitValuePct =
    (proposalData.strategy.config.maxRatio / CV_SCALE_PRECISION) *
    (1 - Math.sqrt(minimumConviction / 100)) *
    100;

  const spendingLimitValueNum =
    poolToken &&
    ((+poolToken.formatted * +Math.round(spendingLimitValuePct)) / 100).toFixed(
      2,
    );

  const poolBalanceFormatted = formatTokenAmount(
    poolToken?.balance,
    poolToken?.decimals ?? 18,
    2,
  );

  return (
    <>
      <Button
        btnStyle="outline"
        color="primary"
        onClick={() => setIsModalOpen(true)}
      >
        Edit
      </Button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Edit proposal: ${proposalData.title} #${proposalData.proposalNumber}`}
      >
        <div>
          <div>
            This action cannot be undone.
            <span className="font-semibold ml-1">
              Are you sure you want to confirm edit?
            </span>
          </div>

          <div className="modal-action">
            <EditProposalForm
              poolBalance={poolBalanceFormatted}
              strategy={proposalData.strategy}
              // poolId={+proposalData.strategy.poolId}
              // poolParams={data.cvstrategies[0].config}
              // proposalType={proposalType}
              // tokenGarden={tokenGarden}
              spendingLimit={spendingLimitValueNum}
              spendingLimitPct={spendingLimitValuePct}
            />
            {/* <Button
              btnStyle="filled"
              color="primary"
              isLoading={isLoading}
              onClick={() =>
                writeCancel({ args: [BigInt(proposalData.proposalNumber)] })
              }
            >
              Confirm
            </Button> */}
          </div>
        </div>
      </Modal>
    </>
  );
}

export default EditProposalButton;
