import React, { useState } from "react";
import {
  BoltIcon,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { getPoolDataQuery, TokenGarden } from "#/subgraph/.graphclient";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { EthAddress } from "./EthAddress";
import PoolEditForm from "./Forms/PoolEditForm";
import { Modal } from "./Modal";
import { Statistic } from "./Statistic";
import { blueLand, grassLarge } from "@/assets";
import { chainDataMap } from "@/configs/chainServer";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { pointSystems, poolTypes } from "@/types";
import { proposalStatus } from "@/types";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import {
  CV_SCALE_PRECISION,
  formatTokenAmount,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";

type Props = {
  ipfsResult: Awaited<ReturnType<typeof getIpfsMetadata>> | undefined;
  poolId: number;
  isEnabled: boolean;
  strategy: getPoolDataQuery["cvstrategies"][0];
  token: Pick<TokenGarden, "address" | "name" | "symbol" | "decimals">;
  pointSystem: number;
  chainId: string;
  proposalType: string;
  spendingLimitPct: number;
};

function calculateConvictionGrowthInDays(
  decay: number,
  blockTime: number,
): number {
  const scaledDecay = decay / Math.pow(10, 7);

  const halfLifeInSeconds = blockTime / Math.log2(1 / scaledDecay);

  const convictionGrowth = halfLifeInSeconds / (24 * 60 * 60);

  return convictionGrowth;
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
  token,
  pointSystem,
  chainId,
  proposalType,
  spendingLimitPct,
}: Props) {
  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const { address } = useAccount();

  const blockTime = chainDataMap[chainId].blockTime;
  const isCouncilSafe =
    address?.toLowerCase() ===
    strategy.registryCommunity.councilSafe?.toLowerCase();

  const minimumConviction = calculateMinimumConviction(
    strategy.config.weight,
    spendingLimitPct * MAX_RATIO_CONSTANT,
  );

  const convictionGrowth = calculateConvictionGrowthInDays(
    strategy.config.decay,
    blockTime,
  );

  const minThresholdPoints = formatTokenAmount(
    strategy.config.minThresholdPoints,
    token.decimals,
  );
  const spendingLimit = spendingLimitPct * MAX_RATIO_CONSTANT;

  const proposalOnDispute = strategy.proposals?.some(
    (proposal) => proposalStatus[proposal.proposalStatus] === "disputed",
  );

  const poolConfig = [
    {
      label: "Min conviction",
      value: `${minimumConviction.toFixed(2)} %`,
      info: "% of Pool's voting weight needed to pass the smallest funding proposal possible. Higher funding requests demand greater conviction to pass.",
    },
    {
      label: "Conviction growth",
      value: `${convictionGrowth.toFixed(2)} in days`,
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
    poolTypes[proposalType] === "signaling" ?
      poolConfig.filter(
        (config) => !["Spending limit", "Min Threshold"].includes(config.label),
      )
    : poolConfig;

  return (
    <section className="section-layout flex flex-col gap-0 overflow-hidden">
      <header className="mb-2 flex flex-col">
        <div className="flex justify-between">
          <h2>
            {ipfsResult?.title} #{poolId}
          </h2>
          {isCouncilSafe && (
            <div className="flex gap-2">
              <Button
                btnStyle="outline"
                icon={<Cog6ToothIcon height={24} width={24} />}
                disabled={!isConnected || missmatchUrl || proposalOnDispute}
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
          )}
        </div>
        <div>
          <EthAddress address={strategy.id as Address} />
        </div>
        <Modal
          title={`Edit ${ipfsResult?.title} #${poolId}`}
          isOpen={isOpenModal}
          onClose={() => setIsOpenModal(false)}
        >
          <PoolEditForm
            strategyAddr={strategy.id as Address}
            token={token}
            chainId={chainId}
            initValues={{
              minimumConviction: minimumConviction.toFixed(2),
              convictionGrowth: convictionGrowth.toFixed(2),
              minThresholdPoints: minThresholdPoints,
              spendingLimit: spendingLimit.toFixed(2),
            }}
          />
        </Modal>
      </header>
      <p>{ipfsResult?.description}</p>
      <div className="mb-10 mt-8 flex items-start gap-24">
        <div className="flex flex-col gap-2 max-w-fit">
          <Statistic label="pool type">
            <Badge type={parseInt(proposalType)} />
          </Statistic>
          {poolTypes[proposalType] === "funding" && (
            <Statistic label="funding token">
              <Badge
                isCapitalize
                label={token.symbol}
                icon={<Square3Stack3DIcon />}
              />
            </Statistic>
          )}
          <Statistic label="voting weight system">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Badge
                label="conviction voting"
                classNames="text-secondary-content"
                icon={<ChartBarIcon />}
              />
              <Badge label={pointSystems[pointSystem]} icon={<BoltIcon />} />
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
          src={poolTypes[proposalType] === "funding" ? blueLand : grassLarge}
          alt="pool image"
          className="h-12 w-full rounded-lg object-cover"
        />
      }
    </section>
  );
}
