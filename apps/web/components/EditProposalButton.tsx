import React, { useState } from "react";
import { getProposalDataQuery } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { EditProposalForm } from "./Forms/EditProposalForm";
import { Modal } from "./Modal";
import { calculateMinimumConviction } from "./PoolHeader";
import { MetadataV1, useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import { CV_SCALE_PRECISION, MAX_RATIO_CONSTANT } from "@/utils/numbers";

type ProposalData = NonNullable<getProposalDataQuery["cvproposal"]>;

type Props = {
  proposalData: ProposalData & { metadata: MetadataV1 };
  poolToken: ReturnType<typeof usePoolToken>;
};

function EditProposalButton({ proposalData, poolToken }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

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

  const { data: proposalMetadata } = useMetadataIpfsFetch({
    hash: proposalData?.metadataHash,
    enabled:
      proposalData?.metadataHash != null && proposalData?.metadata == null,
  });

  return (
    <>
      <Button
        btnStyle="outline"
        color="primary"
        onClick={() => setIsModalOpen(true)}
        disabled={isDisabled}
        className="w-full"
        tooltip={
          isDisabled ?
            "Editing is disabled once an hour has passed and the proposal has received support."
          : undefined
        }
      >
        Edit
      </Button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Edit proposal: ${proposalMetadata?.title ?? ""} #${proposalData.proposalNumber}`}
        size="ultra-large"
      >
        <div className="modal-action">
          {proposalData != null &&
            (proposalData.metadata ?? proposalMetadata) != null && (
              <EditProposalForm
                proposal={{
                  ...proposalData,
                  metadata: proposalData.metadata ?? proposalMetadata,
                }}
                poolToken={poolToken}
                strategy={proposalData.strategy}
                spendingLimit={spendingLimitValueNum}
                spendingLimitPct={spendingLimitValuePct}
                onClose={() => setIsModalOpen(false)}
                setIsDisabled={setIsDisabled}
              />
            )}
        </div>
      </Modal>
    </>
  );
}

export default EditProposalButton;
