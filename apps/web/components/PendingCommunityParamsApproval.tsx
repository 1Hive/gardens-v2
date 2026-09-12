"use client";

import { useMemo, useState } from "react";
import { Address, formatUnits } from "viem";
import { useAccount, useContractRead } from "wagmi";
import { Button, InfoBox, Modal } from "@/components";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useIpfsFetch } from "@/hooks/useIpfsFetch";
import { registryCommunityABI } from "@/src/generated";
import {
  PENDING_COVENANT_IPFS_HASH,
  PENDING_KICK_ENABLED,
  PENDING_REGISTER_STAKE_AMOUNT,
  buildCovenantDiff,
  canReviewPendingCommunityParams,
  hasPendingField,
  normalizePendingCommunityParams,
} from "@/utils/communityPendingParams";

type Props = {
  communityAddress: Address;
  communityName: string;
  tokenDecimals: number;
  tokenSymbol: string;
  className?: string;
};

type CovenantDocument = { covenant?: string };

export function PendingCommunityParamsApproval({
  communityAddress,
  communityName,
  tokenDecimals,
  tokenSymbol,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { address: connectedAddress } = useAccount();
  const { isButtonDisabled, tooltipMessage } = useDisableButtons();
  const { publishAfterIndexed } = usePubSubContext();

  const { data: ownerData } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "owner",
  });
  const { data: pendingData, refetch: refetchPending } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "getPendingCommunityParams",
  });
  const { data: registerStakeAmountData, refetch: refetchStake } =
    useContractRead({
      address: communityAddress,
      abi: registryCommunityABI,
      functionName: "registerStakeAmount",
      enabled: isOpen,
    });
  const { data: isKickEnabledData, refetch: refetchKickEnabled } =
    useContractRead({
      address: communityAddress,
      abi: registryCommunityABI,
      functionName: "isKickEnabled",
      enabled: isOpen,
    });
  const { data: covenantIpfsHashData, refetch: refetchCovenant } =
    useContractRead({
      address: communityAddress,
      abi: registryCommunityABI,
      functionName: "covenantIpfsHash",
      enabled: isOpen,
    });

  const pending = normalizePendingCommunityParams(pendingData);
  const hasStakeChange = hasPendingField(
    pending.fields,
    PENDING_REGISTER_STAKE_AMOUNT,
  );
  const hasKickChange = hasPendingField(
    pending.fields,
    PENDING_KICK_ENABLED,
  );
  const hasCovenantChange = hasPendingField(
    pending.fields,
    PENDING_COVENANT_IPFS_HASH,
  );

  const activeCovenantHash = covenantIpfsHashData ?? "";
  const pendingCovenantHash = pending.covenantIpfsHash;
  const activeCovenant = useIpfsFetch<CovenantDocument>({
    hash: activeCovenantHash,
    enabled: isOpen && hasCovenantChange && activeCovenantHash.length > 0,
  });
  const pendingCovenant = useIpfsFetch<CovenantDocument>({
    hash: pendingCovenantHash,
    enabled: isOpen && hasCovenantChange && pendingCovenantHash.length > 0,
  });

  const activeCovenantText =
    activeCovenantHash.length === 0 ? "" : activeCovenant.data?.covenant;
  const pendingCovenantText =
    pendingCovenantHash.length === 0 ? "" : pendingCovenant.data?.covenant;
  const covenantDiff = useMemo(
    () =>
      activeCovenantText != null && pendingCovenantText != null ?
        buildCovenantDiff(activeCovenantText, pendingCovenantText)
      : null,
    [activeCovenantText, pendingCovenantText],
  );

  const { write: approvePending, isLoading: isApproving } =
    useContractWriteWithConfirmations({
      address: communityAddress,
      abi: registryCommunityABI,
      contractName: "Registry Community",
      functionName: "approvePendingCommunityParams",
      onConfirmations: (receipt) => {
        setIsOpen(false);
        void Promise.all([
          refetchPending(),
          refetchStake(),
          refetchKickEnabled(),
          refetchCovenant(),
        ]);
        publishAfterIndexed(receipt, {
          topic: "community",
          type: "update",
          id: communityAddress,
          function: "approvePendingCommunityParams",
          containerId: communityAddress,
        });
      },
    });

  if (
    !canReviewPendingCommunityParams(
      connectedAddress,
      ownerData,
      pending.fields,
    )
  ) {
    return null;
  }

  return (
    <>
      <Button
        btnStyle="outline"
        color="primary"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        Review pending changes
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="large"
        title={`Review ${communityName} changes`}
        footer={
          <div className="flex w-full justify-end gap-3">
            <Button
              btnStyle="ghost"
              color="secondary"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
            <Button
              btnStyle="filled"
              color="primary"
              disabled={isButtonDisabled || pending.fields === 0}
              tooltip={tooltipMessage}
              isLoading={isApproving}
              onClick={() => approvePending()}
            >
              Approve all
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <InfoBox infoBoxType="info">
            Approval applies every pending guarded parameter in one transaction.
          </InfoBox>

          {hasStakeChange && (
            <ChangeRow
              label={`Registration stake (${tokenSymbol})`}
              current={formatUnits(
                registerStakeAmountData ?? 0n,
                tokenDecimals,
              )}
              pending={formatUnits(
                pending.registerStakeAmount,
                tokenDecimals,
              )}
            />
          )}
          {hasKickChange && (
            <ChangeRow
              label="Council can expel members"
              current={isKickEnabledData ? "Enabled" : "Disabled"}
              pending={pending.isKickEnabled ? "Enabled" : "Disabled"}
            />
          )}
          {hasCovenantChange && (
            <section className="rounded-2xl border border-neutral-soft-content/20 p-4">
              <h3 className="mb-3 text-lg font-medium text-neutral-content">
                Covenant changes
              </h3>
              {covenantDiff != null ?
                <div className="whitespace-pre-wrap rounded-xl bg-neutral-soft px-4 py-3 text-neutral-content">
                  {covenantDiff.map((part) => (
                    <span
                      key={part.id}
                      className={
                        part.kind === "added" ?
                          "bg-success-soft text-success-content"
                        : part.kind === "removed" ?
                          "bg-error-soft text-error-content line-through"
                        : undefined
                      }
                    >
                      {part.value}
                    </span>
                  ))}
                </div>
              : <div className="space-y-2 text-sm text-neutral-content">
                  <p>Unable to resolve both covenant documents from IPFS.</p>
                  <p className="break-all">Current: {activeCovenantHash || "None"}</p>
                  <p className="break-all">Pending: {pendingCovenantHash || "None"}</p>
                </div>
              }
            </section>
          )}
        </div>
      </Modal>
    </>
  );
}

function ChangeRow({
  label,
  current,
  pending,
}: {
  label: string;
  current: string;
  pending: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-soft-content/20 p-4">
      <p className="mb-2 font-medium text-neutral-content">{label}</p>
      <div className="grid gap-2 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <span className="rounded-lg bg-neutral-soft px-3 py-2">{current}</span>
        <span aria-hidden="true">→</span>
        <span className="rounded-lg bg-success-soft px-3 py-2 text-success-content">
          {pending}
        </span>
      </div>
    </div>
  );
}
