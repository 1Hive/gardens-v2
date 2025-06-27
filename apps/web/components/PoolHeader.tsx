import { useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  Battery50Icon,
  CheckIcon,
  ClockIcon,
  ArchiveBoxIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  NoSymbolIcon,
  StopIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Address, zeroAddress } from "viem";
import { useAccount, useContractRead } from "wagmi";
import {
  ArbitrableConfig,
  getPassportStrategyDocument,
  getPassportStrategyQuery,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { EthAddress } from "./EthAddress";
import PoolEditForm from "./Forms/PoolEditForm";
import { InfoBox } from "./InfoBox";
import MarkdownWrapper from "./MarkdownWrapper";
import { Modal } from "./Modal";
import { Skeleton } from "./Skeleton";
import { Statistic } from "./Statistic";
import { blueLand, grassLarge } from "@/assets";
import { chainConfigMap } from "@/configs/chains";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { VOTING_POINT_SYSTEM_DESCRIPTION } from "@/globals";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { MetadataV1 } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";

import { registryCommunityABI, safeABI } from "@/src/generated";
import {
  PointSystems,
  PoolTypes,
  ProposalStatus,
  SybilResistanceType,
} from "@/types";
import {
  convertSecondsToReadableTime,
  CV_PASSPORT_THRESHOLD_SCALE,
  CV_SCALE_PRECISION,
  formatTokenAmount,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";
import { shortenAddress } from "@/utils/text";

type Props = {
  ipfsResult: MetadataV1 | null;
  poolId: number;
  isEnabled: boolean;
  strategy: getPoolDataQuery["cvstrategies"][0];
  arbitrableConfig: Pick<
    ArbitrableConfig,
    | "defaultRuling"
    | "tribunalSafe"
    | "submitterCollateralAmount"
    | "challengerCollateralAmount"
    | "defaultRulingTimeout"
  >;
  poolToken?: {
    address: Address;
    symbol: string;
    decimals: number;
    balance: bigint;
  };
  maxAmount: number;
};

export function calculateConvictionGrowthInSeconds(
  decay: number,
  blockTime: number,
): number {
  const scaledDecay = decay / Math.pow(10, 7);

  const halfLifeInSeconds = blockTime / Math.log2(1 / scaledDecay);

  return halfLifeInSeconds;
}

export function calculateMinimumConviction(
  weight: number,
  spendingLimit: number,
) {
  const weightNum = Number(weight) / CV_SCALE_PRECISION;

  const spendingLimitFraction = spendingLimit / 100;
  const maxRatioNum = spendingLimitFraction / MAX_RATIO_CONSTANT;

  let minimumConviction = weightNum / maxRatioNum ** 2;

  minimumConviction = minimumConviction * 100;

  return minimumConviction;
}
export default function PoolHeader({
  ipfsResult,
  poolId,
  isEnabled,
  strategy,
  arbitrableConfig,
  poolToken,
  maxAmount,
}: Props) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const { address } = useAccount();
  const { publish } = usePubSubContext();
  const { id: chainId, safePrefix } = useChainFromPath()!;
  const router = useRouter();
  const path = usePathname();
  const isArchived = strategy.archived;

  const { data: passportStrategyData } =
    useSubgraphQuery<getPassportStrategyQuery>({
      query: getPassportStrategyDocument,
      variables: { strategyId: strategy.id.toLowerCase() as Address },
      changeScope: {
        topic: "pool",
        type: "update",
        id: strategy.poolId,
        chainId: chainId,
      },
    });
  const pointSystemType = Number(strategy.config.pointSystem);
  const passportStrategy = passportStrategyData?.passportStrategy;
  const passportScore =
    passportStrategy?.threshold ?
      Number(passportStrategy?.threshold) / CV_PASSPORT_THRESHOLD_SCALE
    : null;
  const blockTime = chainConfigMap[chainId!].blockTime;
  const spendingLimitPct =
    (Number(strategy.config.maxRatio || 0) / CV_SCALE_PRECISION) * 100;

  const isCouncilSafe =
    address?.toLowerCase() ===
    strategy.registryCommunity.councilSafe?.toLowerCase();

  const minimumConviction = calculateMinimumConviction(
    strategy.config.weight,
    spendingLimitPct * MAX_RATIO_CONSTANT,
  );

  const convictionGrowthSec = calculateConvictionGrowthInSeconds(
    strategy.config.decay,
    blockTime,
  );

  const minThresholdPoints =
    poolToken ?
      formatTokenAmount(strategy.config.minThresholdPoints, +poolToken.decimals)
    : "0";

  const totalPointsActivatedInPool =
    poolToken ?
      formatTokenAmount(
        strategy.totalEffectiveActivePoints,
        +poolToken.decimals,
      )
    : 0;

  const maxVotingWeight =
    poolToken ? formatTokenAmount(maxAmount, poolToken.decimals) : 0;
  const minThGtTotalEffPoints =
    +minThresholdPoints > +totalPointsActivatedInPool;

  const spendingLimit =
    (strategy.config.maxRatio / CV_SCALE_PRECISION) *
    (1 - Math.sqrt(minimumConviction / 100)) *
    100;

  const communityAddr = strategy.registryCommunity.id as Address;
  const defaultResolution = arbitrableConfig.defaultRuling;
  const proposalCollateral = arbitrableConfig.submitterCollateralAmount;
  const disputeCollateral = arbitrableConfig.challengerCollateralAmount;
  const tribunalAddress = arbitrableConfig.tribunalSafe;
  const proposalType = strategy.config.proposalType;
  const pointSystem = strategy.config.pointSystem;
  const allowList = strategy.config.allowlist;
  const rulingTime = arbitrableConfig.defaultRulingTimeout;

  const proposalOnDispute = strategy.proposals?.some(
    (proposal) => ProposalStatus[proposal.proposalStatus] === "disputed",
  );

  const { value, unit } = convertSecondsToReadableTime(convictionGrowthSec);

  let sybilResistanceType: SybilResistanceType;
  let sybilResistanceValue: Address[] | number | undefined;
  if (passportScore && passportScore > 0) {
    sybilResistanceType = "gitcoinPassport";
    sybilResistanceValue = passportScore;
  } else {
    sybilResistanceType = "allowList";
    sybilResistanceValue = allowList as Address[] | undefined;
  }

  const poolConfig = [
    {
      label: "Spending limit",
      value: `${spendingLimit > 99 ? "100" : spendingLimit.toPrecision(2)} %`,
      info: "Max percentage of the pool funds that can be spent in a single proposal.",
    },
    {
      label: "Min conviction",
      value: `${minimumConviction.toPrecision(2)} %`,
      info: "% of Pool's voting weight needed to pass the smallest funding proposal possible. Higher funding requests demand greater conviction to pass.",
    },
    {
      label: "Conviction growth",
      value: `${value} ${unit}`,
      info: "It's the time for conviction to reach proposal support. This parameter is logarithmic, represented as a half life and may vary slightly over time depending on network block times.",
    },
    {
      label: "Min threshold",
      value: `${minThresholdPoints}`,
      info: `A fixed amount of ${poolToken?.symbol} that overrides Minimum Conviction when the Pool's activated governance is low.`,
    },
    {
      label: "Max voting weight",
      value: `${maxVotingWeight} ${poolToken?.symbol}`,
      info: "Staking above this specified limit won’t increase your voting weight.",
    },
    {
      label: "Protection",
      value:
        sybilResistanceType ?
          sybilResistanceType === "gitcoinPassport" ? "Gitcoin Passport"
          : (sybilResistanceValue as Array<Address>)?.[0] === zeroAddress ?
            "None"
          : "Allowlist"
        : "",
      info:
        sybilResistanceType ?
          sybilResistanceType === "gitcoinPassport" ?
            `Only users with a Gitcoin Passport above the threshold can interact with this pool: \n Threshold: ${(sybilResistanceValue as number).toFixed(2)}`
          : (sybilResistanceValue as Array<Address>)?.[0] === zeroAddress ?
            "Any wallet can interact with this pool"
          : `Only users in the allowlist can interact with this pool: \n -${(sybilResistanceValue as Array<string>).map((x) => shortenAddress(x)).join("\n- ")}`
        : "",
    },
  ];
  const filteredPoolConfig =
    (
      PoolTypes[proposalType] === "signaling" &&
      PointSystems[pointSystem] !== "capped"
    ) ?
      poolConfig.filter(
        (config) =>
          !!config.value &&
          ![
            "Spending limit",
            "Min threshold",
            "Min conviction",
            "Max voting weight",
          ].includes(config.label),
      )
    : PoolTypes[proposalType] === "signaling" ?
      poolConfig.filter(
        (config) =>
          !!config.value &&
          !["Spending limit", "Min threshold", "Min conviction"].includes(
            config.label,
          ),
      )
    : PointSystems[pointSystem] === "capped" ? poolConfig
    : poolConfig.filter((config) => config.label !== "Max voting weight");

  //hooks
  const { data: isCouncilMember } = useContractRead({
    address: strategy.registryCommunity.councilSafe as Address,
    abi: safeABI,
    functionName: "isOwner",
    chainId: Number(chainId),
    enabled: !!address && !!safePrefix, // SafePrefix undefined means not supported
    args: [address as Address],
    onError: () => {
      console.error("Error reading isOwner from Coucil Safe");
    },
  });

  const { write: rejectPoolWrite } = useContractWriteWithConfirmations({
    address: communityAddr,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "rejectPool",
    fallbackErrorMessage: "Error rejecting pool, please report a bug.",
    args: [strategy.id as Address],
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "rejectPool",
        type: "update",
        containerId: communityAddr,
        chainId: chainId,
      });
      const pathSegments = path.split("/");
      pathSegments.pop();
      if (pathSegments.length === 6) {
        pathSegments.pop();
      }
      const newPath = pathSegments.join("/");
      router.push(newPath);
    },
  });

  const { write: addStrategyByPoolId } = useContractWriteWithConfirmations({
    address: communityAddr,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "addStrategyByPoolId",
    fallbackErrorMessage: "Error approving pool, please report a bug.",
    args: [BigInt(poolId)],
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "addStrategyByPoolId",
        type: "update",
        containerId: communityAddr,
        chainId: chainId,
      });
    },
  });

  const { write: removeStrategyByPoolId } = useContractWriteWithConfirmations({
    address: communityAddr,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "removeStrategyByPoolId",
    fallbackErrorMessage: "Error disabling pool, please report a bug.",
    args: [BigInt(poolId)],
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "removeStrategyByPoolId",
        type: "update",
        containerId: communityAddr,
        chainId: chainId,
      });
    },
  });

  //Disable Council Safe Buttons: Edit, Disable and Approve
  const disableCouncilSafeBtnCondition: ConditionObject[] = [
    {
      condition: !isCouncilSafe,
      message: "Connect with Council safe",
    },
  ];

  const disableCouncilSafeButtons = disableCouncilSafeBtnCondition.some(
    (cond) => cond.condition,
  );

  const { tooltipMessage, missmatchUrl, isConnected } = useDisableButtons(
    disableCouncilSafeBtnCondition,
  );

  return (
    <>
      <div
        className={`col-span-12 ${PoolTypes[proposalType] === "funding" ? "lg:col-span-9" : "lg:col-span-12"}`}
      >
        <section className="section-layout flex flex-col gap-6">
          {/* Title - Badge poolType - Addresses and Button(when council memeber is connected) */}
          <header className="flex flex-col gap-2">
            <div className="flex justify-between items-center flex-wrap">
              <h2>
                <Skeleton isLoading={!ipfsResult} className="sm:!w-96 h-8">
                  {ipfsResult?.title}
                </Skeleton>
              </h2>
              <div>
                <Badge type={parseInt(proposalType)} />
              </div>
            </div>
            {(!!isCouncilMember || isCouncilSafe) && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  btnStyle="outline"
                  icon={<Cog6ToothIcon height={24} width={24} />}
                  disabled={
                    !isConnected || missmatchUrl || disableCouncilSafeButtons
                  }
                  tooltip={tooltipMessage}
                  onClick={() => setIsOpenModal(true)}
                >
                  Edit
                </Button>
                {isArchived ?
                  <Button
                    icon={<CheckIcon height={24} width={24} />}
                    disabled={
                      !isConnected || missmatchUrl || disableCouncilSafeButtons
                    }
                    tooltip={
                      tooltipMessage ?? "Restore the pool will also enable it."
                    }
                    showToolTip={true}
                    onClick={() => addStrategyByPoolId()}
                  >
                    Restore
                  </Button>
                : isEnabled ?
                  <>
                    <Button
                      icon={<StopIcon height={24} width={24} />}
                      disabled={
                        !isConnected ||
                        missmatchUrl ||
                        disableCouncilSafeButtons
                      }
                      tooltip={
                        tooltipMessage ??
                        "Disable pool will pause all interactions with this pool. It is possible to enable it back."
                      }
                      showToolTip={true}
                      onClick={() => removeStrategyByPoolId()}
                      btnStyle="outline"
                      color="secondary"
                    >
                      Disable
                    </Button>
                    <Button
                      icon={<ArchiveBoxIcon height={24} width={24} />}
                      disabled={
                        !isConnected ||
                        missmatchUrl ||
                        disableCouncilSafeButtons
                      }
                      tooltip={
                        tooltipMessage ??
                        "Archive pool will remove it from the list of pools. Need to contact the Gardens team to restore it."
                      }
                      showToolTip={true}
                      onClick={() => rejectPoolWrite()}
                      btnStyle="outline"
                      color="danger"
                    >
                      Archive
                    </Button>
                  </>
                : <>
                    <Button
                      icon={<CheckIcon height={24} width={24} />}
                      disabled={
                        !isConnected ||
                        missmatchUrl ||
                        disableCouncilSafeButtons
                      }
                      tooltip={tooltipMessage ?? "Approve pool to enable it."}
                      showToolTip={true}
                      onClick={() => addStrategyByPoolId()}
                    >
                      Approve
                    </Button>
                    <Button
                      icon={<NoSymbolIcon height={24} width={24} />}
                      disabled={
                        !isConnected ||
                        missmatchUrl ||
                        disableCouncilSafeButtons
                      }
                      tooltip={
                        tooltipMessage ??
                        "Reject pool will remove it from the list. \nNeed to contact the Gardens team to\n restore it."
                      }
                      showToolTip={true}
                      onClick={() => rejectPoolWrite()}
                      btnStyle="outline"
                      color="danger"
                    >
                      Reject
                    </Button>
                  </>
                }
              </div>
            )}
            <div className="flex px-1 flex-col sm:flex-row bg-neutral-soft-2 py-2 rounded-lg items-baseline justify-between">
              <EthAddress
                icon={false}
                address={strategy.id as Address}
                label="Pool address"
                textColor="var(--color-grey-800)"
              />
              <div className="flex">
                <a
                  href={`https://app.safe.global/transactions/queue?safe=${safePrefix}:${strategy.registryCommunity.councilSafe}`}
                  className="whitespace-nowrap flex flex-nowrap gap-1 items-center"
                  target="_blank"
                  rel="noreferrer"
                >
                  Council safe
                  <ArrowTopRightOnSquareIcon width={16} height={16} />:
                </a>
                <EthAddress
                  address={strategy.registryCommunity.councilSafe as Address}
                  shortenAddress={true}
                  actions="copy"
                  icon={false}
                  textColor="var(--color-grey-800)"
                />
              </div>
              <div className="flex">
                <a
                  href={`https://app.safe.global/transactions/queue?safe=${safePrefix}:${tribunalAddress}`}
                  className="whitespace-nowrap flex flex-nowrap gap-1 items-center"
                  target="_blank"
                  rel="noreferrer"
                >
                  Tribunal safe
                  <ArrowTopRightOnSquareIcon width={16} height={16} />:
                </a>
                <EthAddress
                  address={tribunalAddress as Address}
                  shortenAddress={true}
                  actions="copy"
                  icon={false}
                  textColor="var(--color-grey-800)"
                />
              </div>
            </div>
            <Modal
              title={`Edit ${ipfsResult?.title} #${poolId}`}
              isOpen={isOpenModal}
              onClose={() => setIsOpenModal(false)}
            >
              {!!passportStrategyData && poolToken && (
                <PoolEditForm
                  strategy={strategy}
                  pointSystemType={pointSystemType}
                  token={poolToken}
                  proposalType={proposalType}
                  proposalOnDispute={proposalOnDispute}
                  initValues={{
                    sybilResistanceValue: sybilResistanceValue,
                    sybilResistanceType: sybilResistanceType,
                    spendingLimit: spendingLimit.toFixed(2),
                    minimumConviction: minimumConviction.toFixed(2),
                    convictionGrowth: convictionGrowthSec.toFixed(4),
                    minThresholdPoints: minThresholdPoints,
                    defaultResolution: defaultResolution,
                    proposalCollateral: proposalCollateral,
                    disputeCollateral: disputeCollateral,
                    tribunalAddress: tribunalAddress,
                    rulingTime,
                  }}
                  setModalOpen={setIsOpenModal}
                />
              )}
            </Modal>
          </header>

          {/* Description */}
          <Skeleton rows={5} isLoading={!ipfsResult}>
            <MarkdownWrapper>
              {ipfsResult?.description ?? "No description found"}
            </MarkdownWrapper>
          </Skeleton>

          {/* Pool Params */}
          <h4>Pool Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredPoolConfig.map((config) => (
              <div
                key={config.label}
                className="flex items-center gap-4 bg-primary px-2 py-4 rounded-lg"
              >
                <Statistic
                  label={config.label}
                  icon={
                    <InformationCircleIcon
                      className="stroke-2 text-primary-content"
                      width={22}
                      height={22}
                    />
                  }
                  tooltip={config.info}
                >
                  <p className="text-neutral-content subtitle">
                    {config.value}
                  </p>
                </Statistic>
              </div>
            ))}
          </div>

          {/* Voting weight + Dispute Address */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2 flex-wrap">
            <div className="flex flex-col gap-2 sm:flex-row items-start sm:items-center">
              <h4>Voting System</h4>
              <div className="flex gap-2 items-center">
                <Badge
                  label="conviction voting"
                  className="text-secondary-content"
                  icon={<Battery50Icon />}
                />
                <Badge
                  label={PointSystems[pointSystem]}
                  tooltip={
                    VOTING_POINT_SYSTEM_DESCRIPTION[PointSystems[pointSystem]]
                  }
                  icon={<BoltIcon />}
                />
              </div>
            </div>
          </div>

          {/* InfoBox - Banner or Image */}
          {minThGtTotalEffPoints && isEnabled && (
            <InfoBox
              infoBoxType="warning"
              content="Activated governance in this pool is too low. No proposals will pass unless more members activate their governance. You can still create and support proposals."
              className="mb-4"
            />
          )}
          {
            !isEnabled && (
              <div className="banner">
                {isArchived ?
                  <ArchiveBoxIcon className="h-8 w-8 text-secondary-content" />
                : <ClockIcon className="h-8 w-8 text-secondary-content" />}
                <h6>
                  {isArchived ?
                    "This pool has been archived"
                  : "Waiting for council approval"}
                </h6>
              </div>
            )
            // : <Image
            //     src={
            //       PoolTypes[proposalType] === "funding" ? blueLand : grassLarge
            //     }
            //     alt="pool image"
            //     className="h-12 w-full rounded-lg object-cover"
            //   />
          }
        </section>
      </div>
    </>
  );
}
