import {
  Badge,
  Proposals,
  PoolMetrics,
  Statistic,
  EthAddress,
} from "@/components";
import Image from "next/image";
import { grassLarge, poolGrassBlue } from "@/assets";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import {
  Allo,
  CVStrategy,
  TokenGarden,
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { pointSystems, poolTypes } from "@/types";
import { CV_SCALE_PRECISION } from "@/utils/numbers";
import {
  InformationCircleIcon,
  ChartBarIcon,
  BoltIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export type AlloQuery = getAlloQuery["allos"][number];

const { urqlClient } = initUrqlClient();

export default async function Pool({
  params: { chain, poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const { data } = await queryByChain<getPoolDataQuery>(
    urqlClient,
    chain,
    getPoolDataDocument,
    { poolId: poolId, garden: garden },
  );
  const strategyObj = data?.cvstrategies?.[0] as CVStrategy;
  //const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();

  if (!strategyObj) {
    return <div>{`Pool ${poolId} not found`}</div>;
  }

  const pointSystem = data?.cvstrategies?.[0].config?.pointSystem;
  const strategyAddr = strategyObj.id as Address;
  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data?.allos[0] as Allo;
  const proposalType = strategyObj?.config?.proposalType as number;
  const poolAmount = strategyObj?.poolAmount as number;
  const tokenGarden = data?.tokenGarden as TokenGarden;
  const metadata = data?.cvstrategies?.[0]?.metadata as string;
  const isEnabled = data?.cvstrategies?.[0]?.isEnabled as boolean;
  const { title, description } = await getIpfsMetadata(metadata);

  const spendingLimitPct =
    (Number(strategyObj?.config?.maxRatio) / CV_SCALE_PRECISION) * 100;

  console.log(
    "maxRatio: " + strategyObj?.config?.maxRatio,
    "minThresholdPoints: " + strategyObj?.config?.minThresholdPoints,
    "poolAmount: " + poolAmount,
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      {/* Header */}
      <section className="section-layout relative flex flex-col gap-3">
        <header>
          <h2>
            Pool #{poolId} {title}
          </h2>
        </header>
        <p>
          {" "}
          <EthAddress address={strategyAddr} />
        </p>
        <p>{description}</p>
        <div className="mb-7 mt-5 flex w-full flex-col items-start gap-5">
          <Statistic label="pool type" icon={<InformationCircleIcon />}>
            <Badge poolType={proposalType} />
          </Statistic>

          {poolTypes[proposalType] == "funding" && (
            <Statistic label="funding token" icon={<InformationCircleIcon />}>
              <Badge label="ETH" icon={<Square3Stack3DIcon />}></Badge>
            </Statistic>
          )}

          <Statistic
            label="voting weight system"
            icon={<InformationCircleIcon />}
          >
            <Badge
              label="conviction voting"
              classNames="text-secondary-content"
              icon={<ChartBarIcon />}
            />
            <Badge label={pointSystems[pointSystem]} icon={<BoltIcon />} />
          </Statistic>
        </div>
        {!isEnabled ? (
          <div className="grid h-10 w-full items-center rounded-xl bg-warning">
            <p className="text-center text-sm font-semibold">
              waiting for council approval
            </p>
          </div>
        ) : (
          <Image
            src={
              poolTypes[proposalType] == "funding" ? poolGrassBlue : grassLarge
            }
            alt="Garden land"
            className="h-12 w-full rounded-lg object-cover"
          />
        )}
      </section>

      {/* Pool metrics: for now we have funds available and spending limit */}
      {isEnabled && (
        <>
          {poolTypes[proposalType] !== "signaling" && (
            <PoolMetrics
              alloInfo={alloInfo}
              poolId={poolId}
              balance={poolAmount}
              strategyAddress={strategyAddr}
              strategy={strategyObj}
              communityAddress={communityAddress}
              tokenGarden={tokenGarden}
              pointSystem={pointSystem}
              chainId={parseInt(chain)}
              spendingLimitPct={spendingLimitPct}
            />
          )}
          {/* Proposals section */}
          <Proposals
            strategy={strategyObj}
            alloInfo={alloInfo}
            communityAddress={communityAddress}
            createProposalUrl={`/gardens/${chain}/${garden}/pool/${poolId}/create-proposal`}
            proposalType={proposalType}
          />
        </>
      )}
    </div>
  );
}
