"use client";

import { useEffect, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { Address, formatUnits, isAddress, parseUnits } from "viem";
import { useContractRead } from "wagmi";
import { Button, InfoBox, Modal } from "@/components";
import { FormAddressInput } from "@/components/Forms/FormAddressInput";
import { FormCheckBox } from "@/components/Forms/FormCheckBox";
import { FormInput } from "@/components/Forms/FormInput";
import { FormPreview, FormRow } from "@/components/Forms/FormPreview";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useFlag } from "@/hooks/useFlag";
import { registryCommunityABI } from "@/src/generated";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

type CommunityEditFormValues = {
  communityName: string;
  communityFee: string;
  feeReceiver: string;
  councilSafe: string;
  registerStakeAmount: string;
  isKickEnabled: boolean;
  covenant: string;
};

type Props = {
  communityAddress: Address;
  communityName: string;
  communityMembersCount: number;
  currentCommunityName: string;
  currentCouncilSafe: Address;
  currentCovenant: string;
  tokenDecimals: number;
  tokenSymbol: string;
  isCouncilSafe: boolean;
  isCouncilMember: boolean;
  className?: string;
};

export function EditCommunityButton({
  communityAddress,
  communityName,
  communityMembersCount,
  currentCommunityName,
  currentCouncilSafe,
  currentCovenant,
  tokenDecimals,
  tokenSymbol,
  isCouncilSafe,
  isCouncilMember,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const showEditCommunity = useFlag("showEditCommunity");

  if (!showEditCommunity || (!isCouncilMember && !isCouncilSafe)) return null;

  return (
    <>
      <Button
        btnStyle="outline"
        color="primary"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        Edit
      </Button>
      <CommunityEditModal
        communityAddress={communityAddress}
        communityName={communityName}
        communityMembersCount={communityMembersCount}
        currentCommunityName={currentCommunityName}
        currentCouncilSafe={currentCouncilSafe}
        currentCovenant={currentCovenant}
        tokenDecimals={tokenDecimals}
        tokenSymbol={tokenSymbol}
        isCouncilSafe={isCouncilSafe}
        isCouncilMember={isCouncilMember}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

function CommunityEditModal({
  communityAddress,
  communityName,
  communityMembersCount,
  currentCommunityName,
  currentCouncilSafe,
  currentCovenant,
  tokenDecimals,
  tokenSymbol,
  isCouncilSafe,
  isCouncilMember,
  isOpen,
  onClose,
}: Props & {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { publish } = usePubSubContext();
  const { tooltipMessage, isButtonDisabled } = useDisableButtons();
  const emptyCommunityOnlyDisabled = communityMembersCount > 0;
  const isReadonlyForCouncilMember = isCouncilMember && !isCouncilSafe;

  const { data: communityFeeData } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "communityFee",
    enabled: isOpen,
  });
  const { data: feeReceiverData } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "feeReceiver",
    enabled: isOpen,
  });
  const { data: registerStakeAmountData } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "registerStakeAmount",
    enabled: isOpen,
  });
  const { data: isKickEnabledData } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "isKickEnabled",
    enabled: isOpen,
  });
  const { data: covenantIpfsHashData } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "covenantIpfsHash",
    enabled: isOpen,
  });
  const { data: councilSafeData } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "councilSafe",
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CommunityEditFormValues>({
    mode: "onBlur",
    defaultValues: {
      communityName: currentCommunityName,
      communityFee: "0",
      feeReceiver: "",
      councilSafe: currentCouncilSafe,
      registerStakeAmount: "0",
      isKickEnabled: false,
      covenant: currentCovenant,
    },
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<CommunityEditFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackCommunityFee =
    communityFeeData != null ? formatUnits(communityFeeData, 4) : "0";
  const fallbackCouncilSafe = councilSafeData ?? currentCouncilSafe;
  const fallbackFeeReceiver =
    (
      feeReceiverData != null &&
      feeReceiverData.toLowerCase() !== ZERO_ADDRESS.toLowerCase()
    ) ?
      feeReceiverData
    : fallbackCouncilSafe;
  const fallbackRegisterStakeAmount =
    registerStakeAmountData != null ?
      formatUnits(registerStakeAmountData, tokenDecimals)
    : "0";
  const fallbackKickEnabled = isKickEnabledData ?? false;
  const fallbackCovenant = currentCovenant;

  const buildCompleteValues = (
    values?: Partial<CommunityEditFormValues>,
  ): CommunityEditFormValues => {
    const currentValues = getValues();

    return {
      communityName:
        values?.communityName ??
        currentValues.communityName ??
        currentCommunityName,
      communityFee:
        values?.communityFee ??
        currentValues.communityFee ??
        fallbackCommunityFee,
      feeReceiver:
        values?.feeReceiver ?? currentValues.feeReceiver ?? fallbackFeeReceiver,
      councilSafe:
        values?.councilSafe ?? currentValues.councilSafe ?? fallbackCouncilSafe,
      registerStakeAmount:
        values?.registerStakeAmount ??
        currentValues.registerStakeAmount ??
        fallbackRegisterStakeAmount,
      isKickEnabled:
        values?.isKickEnabled ??
        currentValues.isKickEnabled ??
        fallbackKickEnabled,
      covenant: values?.covenant ?? currentValues.covenant ?? fallbackCovenant,
    };
  };

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      return;
    }
    setShowPreview(false);
    reset({
      communityName: currentCommunityName,
      communityFee: fallbackCommunityFee,
      feeReceiver: fallbackFeeReceiver,
      councilSafe: fallbackCouncilSafe,
      registerStakeAmount: fallbackRegisterStakeAmount,
      isKickEnabled: fallbackKickEnabled,
      covenant: fallbackCovenant,
    });
  }, [
    currentCommunityName,
    fallbackCommunityFee,
    fallbackCouncilSafe,
    fallbackCovenant,
    fallbackFeeReceiver,
    fallbackKickEnabled,
    fallbackRegisterStakeAmount,
    isOpen,
    reset,
  ]);

  const watchedKickEnabled = watch("isKickEnabled", fallbackKickEnabled);
  const watchedCovenant = watch("covenant", fallbackCovenant);
  const watchedCommunityFee = watch("communityFee", fallbackCommunityFee);
  const watchedFeeReceiver = watch("feeReceiver", fallbackFeeReceiver);
  const watchedCouncilSafe = watch("councilSafe", fallbackCouncilSafe);
  const watchedCommunityName = watch("communityName", currentCommunityName);
  const watchedRegisterStakeAmount = watch(
    "registerStakeAmount",
    fallbackRegisterStakeAmount,
  );
  const shouldShowFeeReceiverField = (() => {
    try {
      return parseUnits(watchedCommunityFee || "0", 4) > 0n;
    } catch {
      return true;
    }
  })();

  const {
    write: writeSetCommunityParams,
    isLoading: isSetCommunityParamsLoading,
  } = useContractWriteWithConfirmations({
    address: communityAddress,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "setCommunityParams",
    onConfirmations: () => {
      setIsSubmitting(false);
      publish({
        topic: "community",
        type: "update",
        id: communityAddress,
        function: "setCommunityParams",
        containerId: communityAddress,
      });
      onClose();
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!shouldShowFeeReceiverField) return;
    if (watchedFeeReceiver.trim().length > 0) return;
    setValue("feeReceiver", watchedCouncilSafe, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [
    setValue,
    shouldShowFeeReceiverField,
    watchedCouncilSafe,
    watchedFeeReceiver,
  ]);

  const normalizedWatchedFeeReceiver =
    watchedFeeReceiver.trim().length > 0 ? watchedFeeReceiver : ZERO_ADDRESS;
  const normalizedFallbackFeeReceiver =
    fallbackFeeReceiver.trim().length > 0 ? fallbackFeeReceiver : ZERO_ADDRESS;
  const hasChanges =
    watchedCommunityName.trim() !== currentCommunityName.trim() ||
    watchedCommunityFee !== fallbackCommunityFee ||
    normalizedWatchedFeeReceiver.toLowerCase() !==
      normalizedFallbackFeeReceiver.toLowerCase() ||
    watchedCouncilSafe.toLowerCase() !== fallbackCouncilSafe.toLowerCase() ||
    watchedRegisterStakeAmount !== fallbackRegisterStakeAmount ||
    watchedKickEnabled !== fallbackKickEnabled ||
    watchedCovenant.trim() !== fallbackCovenant.trim();

  const submitDisabled =
    isButtonDisabled || isReadonlyForCouncilMember || !hasChanges || isSubmitting;
  const submitTooltip =
    isReadonlyForCouncilMember ? "Connect with Council Safe" : tooltipMessage;

  const handlePreview = () => {
    if (!hasChanges) return;
    setPreviewData(buildCompleteValues());
    setShowPreview(true);
  };

  const onSubmit = async (values: CommunityEditFormValues) => {
    setIsSubmitting(true);
    const completeValues = buildCompleteValues(values);
    let covenantIpfsHash = covenantIpfsHashData ?? "";
    const nextCovenant = completeValues.covenant.trim();
    const currentCovenantTrimmed = currentCovenant.trim();

    if (nextCovenant !== currentCovenantTrimmed) {
      const uploadedHash = await ipfsJsonUpload({
        covenant: completeValues.covenant,
      });
      if (!uploadedHash) {
        setIsSubmitting(false);
        return;
      }
      covenantIpfsHash = uploadedHash;
    }

    writeSetCommunityParams({
      args: [
        {
          communityName: completeValues.communityName.trim(),
          communityFee: parseUnits(completeValues.communityFee || "0", 4),
          feeReceiver:
            completeValues.feeReceiver.trim().length > 0 ?
              (completeValues.feeReceiver as Address)
            : ZERO_ADDRESS,
          councilSafe: completeValues.councilSafe as Address,
          registerStakeAmount: parseUnits(
            completeValues.registerStakeAmount || "0",
            tokenDecimals,
          ),
          isKickEnabled: completeValues.isKickEnabled,
          covenantIpfsHash,
        },
      ],
    });
  };

  let shouldShowPreviewFeeReceiver = true;
  if (previewData != null) {
    try {
      shouldShowPreviewFeeReceiver =
        parseUnits(previewData.communityFee || "0", 4) > 0n;
    } catch {
      shouldShowPreviewFeeReceiver = true;
    }
  }

  const previewRows: FormRow[] =
    previewData == null ?
      []
    : [
        { label: "Community name", data: previewData.communityName },
        { label: "Community fee", data: `${previewData.communityFee}%` },
        ...(shouldShowPreviewFeeReceiver ?
          [
            {
              label: "Fee receiver",
              data:
                previewData.feeReceiver.trim().length > 0 ?
                  previewData.feeReceiver
                : ZERO_ADDRESS,
            },
          ]
        : []),
        { label: "Council safe", data: previewData.councilSafe },
        {
          label: `Registration stake (${tokenSymbol})`,
          data: previewData.registerStakeAmount || "0",
        },
        {
          label: "Council can expel members",
          data: previewData.isKickEnabled ? "Enabled" : "Disabled",
        },
      ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="ultra-large"
      title={`Edit ${communityName}`}
      footer={
        <div className="flex w-full justify-end gap-3">
          {showPreview ?
            <>
              <Button
                btnStyle="ghost"
                color="tertiary"
                onClick={() => setShowPreview(false)}
              >
                Back to edit
              </Button>
              <Button
                btnStyle="filled"
                color="primary"
                disabled={submitDisabled}
                tooltip={submitTooltip}
                isLoading={isSubmitting || isSetCommunityParamsLoading}
                onClick={() => {
                  if (previewData == null) return;
                  void onSubmit(previewData);
                }}
              >
                Submit
              </Button>
            </>
          : <>
              <Button btnStyle="ghost" color="tertiary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                btnStyle="filled"
                color="primary"
                disabled={!hasChanges}
                onClick={handleSubmit(handlePreview)}
              >
                Preview
              </Button>
            </>
          }
        </div>
      }
    >
      {showPreview ?
        <div className="flex flex-col gap-6">
          <FormPreview
            title={previewData?.communityName}
            formRows={previewRows}
            onEdit={() => setShowPreview(false)}
            onSubmit={() => {
              if (previewData == null || submitDisabled) return;
              void onSubmit(previewData);
            }}
          />
          <div className="rounded-2xl border border-neutral-soft-content/20 px-4 py-4">
            <p className="mb-3 text-lg font-medium text-neutral-content">
              Covenant
            </p>
            {previewData?.covenant.trim() ?
              <MarkdownWrapper source={previewData.covenant} />
            : <p className="text-neutral-soft-content">No covenant</p>}
          </div>
        </div>
      : <div className="flex flex-col gap-6">
          {isReadonlyForCouncilMember && (
            <InfoBox infoBoxType="info" className="rounded-2xl px-4 py-4">
              These fields are read-only. Connect with the council safe to edit
              community settings.
            </InfoBox>
          )}
          <div className="grid gap-4">
            <FormInput
              label="Community name"
              register={register}
              registerKey="communityName"
              errors={errors}
              required
              readOnly={isReadonlyForCouncilMember}
            />
            <FormInput
              label="Community fee (%)"
              register={register}
              registerKey="communityFee"
              errors={errors}
              required
              readOnly={isReadonlyForCouncilMember}
              otherProps={{ inputMode: "decimal" }}
              registerOptions={{
                validate: (value: string) => {
                  try {
                    return parseUnits(value || "0", 4) <= BigInt(100000) ?
                        true
                      : "Community fee cannot exceed 10%.";
                  } catch {
                    return "Enter a valid percentage.";
                  }
                },
              }}
            />
            {shouldShowFeeReceiverField && (
              <FormAddressInput
                label="Fee receiver"
                placeholder="0x.."
                register={register}
                registerKey="feeReceiver"
                errors={errors}
                required
                value={watch("feeReceiver")}
                readOnly={isReadonlyForCouncilMember}
                registerOptions={{
                  validate: (value: string) =>
                    value.trim().length === 0 ||
                    isAddress(value) ||
                    "Enter a valid address.",
                }}
              />
            )}
            <div className="w-full">
              <FormAddressInput
                label="Council safe"
                register={register}
                registerKey="councilSafe"
                errors={errors}
                required
                value={watch("councilSafe")}
                readOnly={isReadonlyForCouncilMember}
                validateSafe
                registerOptions={{
                  validate: (value: string) =>
                    isAddress(value) || "Enter a valid address.",
                }}
                tooltip="If changed, the new council safe will need to accept the handover."
                tooltipClassName="tooltip-top-right text-warning-content"
              />
            </div>
          </div>

          {emptyCommunityOnlyDisabled && (
            <div className="rounded-2xl border border-warning-content/25 bg-warning-soft px-4 py-4 text-sm text-warning-content">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold">Empty community only fields</p>
                  <p>
                    {`The fields below can only be changed when the community doesn't have members. This community currently has ${communityMembersCount} member${communityMembersCount === 1 ? "" : "s"}, so these fields are disabled.`}
                  </p>
                  {!watchedKickEnabled && (
                    <p>
                      Ask current members to leave the community before you can
                      change these fields.
                    </p>
                  )}
                  {watchedKickEnabled && (
                    <p>
                      With kick enabled, members can be removed from the
                      Community Staking Leaderboard modal, and their staked
                      amount will be returned to their address.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            <FormInput
              label={`Registration stake (${tokenSymbol})`}
              register={register}
              registerKey="registerStakeAmount"
              errors={errors}
              required
              readOnly={
                emptyCommunityOnlyDisabled || isReadonlyForCouncilMember
              }
              otherProps={{ inputMode: "decimal" }}
              registerOptions={{
                validate: (value: string) => {
                  try {
                    return parseUnits(value || "0", tokenDecimals) > 0n ? true
                      : "Registration stake must be greater than zero.";
                  } catch {
                    return "Enter a valid token amount.";
                  }
                },
              }}
            />
            <FormInput
              label="Covenant"
              register={register}
              registerKey="covenant"
              errors={errors}
              type="markdown"
              value={watchedCovenant}
              readOnly={
                emptyCommunityOnlyDisabled || isReadonlyForCouncilMember
              }
            />
          </div>

          <FormCheckBox
            label="Council can expel members"
            register={register}
            registerKey="isKickEnabled"
            errors={errors}
            disabled={emptyCommunityOnlyDisabled || isReadonlyForCouncilMember}
          />
        </div>
      }
    </Modal>
  );
}
