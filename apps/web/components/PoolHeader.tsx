import { useState } from "react";
import {
  BoltIcon,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { StopIcon } from "@heroicons/react/24/solid";
import { FetchTokenResult } from "@wagmi/core";
import Image from "next/image";
import { Address } from "viem";
import { useAccount, useContractRead } from "wagmi";
import {
  ArbitrableConfig,
  getPoolDataQuery,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { EthAddress } from "./EthAddress";
import PoolEditForm from "./Forms/PoolEditForm";
import MarkdownWrapper from "./MarkdownWrapper";
import { Modal } from "./Modal";
import { Skeleton } from "./Skeleton";
import { Statistic } from "./Statistic";
import { blueLand, grassLarge } from "@/assets";
import { chainConfigMap } from "@/configs/chains";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { MetadataV1 } from "@/hooks/useIpfsFetch";
import { registryCommunityABI, safeABI } from "@/src/generated";
import { PointSystems, PoolTypes, ProposalStatus } from "@/types";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import {
  convertSecondsToReadableTime,
  CV_SCALE_PRECISION,
  formatTokenAmount,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";

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
  token: Pick<TokenGarden, "address" | "name" | "symbol" | "decimals">;
  poolToken: FetchTokenResult;
  pointSystem: number;
  chainId: string;
  proposalType: string;
  spendingLimitPct: number;
};

function calculateConvictionGrowthInSeconds(
  decay: number,
  blockTime: number,
): number {
  const scaledDecay = decay / Math.pow(10, 7);

  const halfLifeInSeconds = blockTime / Math.log2(1 / scaledDecay);

  return halfLifeInSeconds;
}

function calculateMinimumConviction(weight: number, spendingLimit: number) {
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
  token,
  poolToken,
  pointSystem,
  chainId,
  proposalType,
  spendingLimitPct,
}: Props) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const { address } = useAccount();
  const { publish } = usePubSubContext();

  const blockTime = chainConfigMap[chainId].blockTime;

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

  const minThresholdPoints = formatTokenAmount(
    strategy.config.minThresholdPoints,
    +token.decimals,
  );

  const spendingLimit =
    (strategy.config.maxRatio / CV_SCALE_PRECISION) *
    (1 - Math.sqrt(minimumConviction / 100)) *
    100;

  const communityAddr = strategy.registryCommunity.id as Address;
  const defaultResolution = arbitrableConfig.defaultRuling;
  const proposalCollateral = arbitrableConfig.submitterCollateralAmount;
  const disputeCollateral = arbitrableConfig.challengerCollateralAmount;
  const tribunalAddress = arbitrableConfig.tribunalSafe;
  const rulingTime = arbitrableConfig.defaultRulingTimeout;

  const proposalOnDispute = strategy.proposals?.some(
    (proposal) => ProposalStatus[proposal.proposalStatus] === "disputed",
  );

  const { value, unit } = convertSecondsToReadableTime(convictionGrowthSec);

  const poolConfig = [
    {
      label: "Min conviction",
      value: `${minimumConviction.toPrecision(2)} %`,
      info: "% of Pool's voting weight needed to pass the smallest funding proposal possible. Higher funding requests demand greater conviction to pass.",
    },
    {
      label: "Conviction growth",
      value: `${value} ${unit}${value !== 1 ? "s" : ""}`,
      info: "It's the time for conviction to reach proposal support. This parameter is logarithmic, represented as a half life",
    },
    {
      label: "Min Threshold",
      value: `${minThresholdPoints}`,
      info: `A fixed amount of ${token.symbol} that overrides Minimum Conviction when the Pool's activated governance is low.`,
    },
    {
      label: "Spending limit",
      // TODO: check number for some pools, they have more zeros or another config ?
      value: `${spendingLimit.toFixed(2)} %`,
      info: "Max percentage of the pool funds that can be spent in a single proposal",
    },
  ];

  const filteredPoolConfig =
    PoolTypes[proposalType] === "signaling" ?
      poolConfig.filter(
        (config) =>
          !["Spending limit", "Min Threshold", "Min conviction"].includes(
            config.label,
          ),
      )
    : poolConfig;

  //hooks
  const { data: isCouncilMember } = useContractRead({
    address: strategy.registryCommunity.councilSafe as Address,
    abi: abiWithErrors2(safeABI),
    functionName: "isOwner",
    chainId: Number(chainId),
    enabled: !!address,
    args: [address as Address],
    onError: () => {
      console.error("Error reading isOwner from Coucil Safe");
    },
  });

  const { write: addStrategyByPoolId } = useContractWriteWithConfirmations({
    address: communityAddr,
    abi: abiWithErrors(registryCommunityABI),
    contractName: "Registry Community",
    functionName: "addStrategyByPoolId",
    fallbackErrorMessage: "Error approving pool. Please try again.",
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
    abi: abiWithErrors(registryCommunityABI),
    contractName: "Registry Community",
    functionName: "removeStrategyByPoolId",
    fallbackErrorMessage: "Error disabling pool. Please try again.",
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
      message: "Connect with council safe address",
    },
  ];

  const disableCouncilSafeButtons = disableCouncilSafeBtnCondition.some(
    (cond) => cond.condition,
  );

  const { tooltipMessage, missmatchUrl, isConnected } = useDisableButtons(
    disableCouncilSafeBtnCondition,
  );

  return (
    <section className="section-layout flex flex-col gap-0">
      <header className="mb-2 flex flex-col">
        <div className="flex justify-between flex-wrap">
          <Skeleton isLoading={!ipfsResult} className="!w-96 h-8">
            <h2>
              {ipfsResult?.title} #{poolId}
            </h2>
          </Skeleton>
          {(!!isCouncilMember || isCouncilSafe) && (
            <div className="flex gap-2">
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
              {isEnabled ?
                <Button
                  icon={<StopIcon height={24} width={24} />}
                  disabled={
                    !isConnected || missmatchUrl || disableCouncilSafeButtons
                  }
                  tooltip={tooltipMessage}
                  onClick={() => removeStrategyByPoolId()}
                  btnStyle="outline"
                  color="danger"
                >
                  Disable
                </Button>
              : <Button
                  icon={<CheckIcon height={24} width={24} />}
                  disabled={
                    !isConnected || missmatchUrl || disableCouncilSafeButtons
                  }
                  tooltip={tooltipMessage}
                  onClick={() => addStrategyByPoolId()}
                >
                  Approve
                </Button>
              }
            </div>
          )}
        </div>
        <div>
          <EthAddress icon={false} address={strategy.id as Address} />
        </div>
        <Modal
          title={`Edit ${ipfsResult?.title} #${poolId}`}
          isOpen={isOpenModal}
          onClose={() => setIsOpenModal(false)}
        >
          <PoolEditForm
            strategyAddr={strategy.id as Address}
            token={token}
            proposalType={proposalType}
            chainId={chainId}
            proposalOnDispute={proposalOnDispute}
            initValues={{
              minimumConviction: minimumConviction.toFixed(2),
              convictionGrowth: convictionGrowthSec.toFixed(4),
              minThresholdPoints: minThresholdPoints,
              spendingLimit: spendingLimit.toFixed(2),
              defaultResolution: defaultResolution,
              proposalCollateral: proposalCollateral,
              disputeCollateral: disputeCollateral,
              tribunalAddress: tribunalAddress,
              rulingTime: rulingTime,
            }}
            setModalOpen={setIsOpenModal}
          />
        </Modal>
      </header>
      <Skeleton rows={5} isLoading={!ipfsResult}>
        <MarkdownWrapper>
          {ipfsResult?.description ?? "No description found"}
        </MarkdownWrapper>
      </Skeleton>
      <div className="mb-10 mt-8 flex items-start justify-between gap-8 flex-wrap">
        <div className="flex flex-col gap-2 max-w-fit">
          <Statistic label="pool type">
            <Badge type={parseInt(proposalType)} />
          </Statistic>
          {PoolTypes[proposalType] === "funding" && (
            <Statistic label="funding token">
              <Badge
                isCapitalize
                label={poolToken?.symbol}
                icon={<Square3Stack3DIcon />}
              />
            </Statistic>
          )}
          <Statistic label="voting weight">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Badge
                label="conviction voting"
                className="text-secondary-content"
                icon={<ChartBarIcon />}
              />
              <Badge label={PointSystems[pointSystem]} icon={<BoltIcon />} />
            </div>
          </Statistic>
        </div>
        <div className="flex flex-col gap-4">
          {filteredPoolConfig.map((config) => (
            <div key={config.label} className="flex items-center gap-4">
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
                <p className="text-neutral-content subtitle">{config.value}</p>
              </Statistic>
            </div>
          ))}
        </div>
      </div>
      {!isEnabled ?
        <div className="banner">
          <ClockIcon className="h-8 w-8 text-secondary-content" />
          <h6>Waiting for council approval</h6>
        </div>
      : <Image
          src={PoolTypes[proposalType] === "funding" ? blueLand : grassLarge}
          alt="pool image"
          className="h-12 w-full rounded-lg object-cover"
        />
      }
    </section>
  );
}
