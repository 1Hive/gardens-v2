import React, { useState } from "react";
import { CheckIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { Address } from "viem";
import { getPoolDataQuery } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { EthAddress } from "./EthAddress";
import { Modal } from "./Modal";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { getIpfsMetadata } from "@/utils/ipfsUtils";

type Props = {
  ipfsResult: Awaited<ReturnType<typeof getIpfsMetadata>> | undefined;
  poolId: number;
  isEnabled: boolean;
  strategy: getPoolDataQuery["cvstrategies"][0];
};

export default function PoolHeader({
  ipfsResult,
  poolId,
  isEnabled,
  strategy,
}: Props) {
  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();
  const [isOpenModal, setIsOpenModal] = useState(false);

  return (
    <header className="mb-2 flex flex-col">
      <div className="flex justify-between">
        <h2>
          {ipfsResult?.title} #{poolId}
        </h2>
        {/* TODO: council safe wallet connected && */}
        {/* change isConnected to also check if council safe wallet */}
        <div className="flex gap-2">
          <Button
            btnStyle="outline"
            icon={<Cog6ToothIcon height={24} width={24} />}
            disabled={!isConnected || missmatchUrl}
            tooltip={tooltipMessage}
            onClick={() => setIsOpenModal(true)}
          >
            Edit
          </Button>
          {!isEnabled && (
            <Button
              icon={<CheckIcon height={24} width={24} />}
              disabled={!isConnected || missmatchUrl}
              tooltip={tooltipMessage}
              onClick={() => console.log("write approve...")}
            >
              Approve
            </Button>
          )}
        </div>
      </div>
      <div>
        <EthAddress address={strategy.id as Address} />
      </div>
      <Modal
        title={`Edit ${ipfsResult?.title} #${poolId}`}
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
      >
        form
      </Modal>
    </header>
  );
}
