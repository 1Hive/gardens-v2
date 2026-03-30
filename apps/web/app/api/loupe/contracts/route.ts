import { NextResponse } from "next/server";
import { gql } from "urql";
import networksConfig from "#/contracts/config/networks.json";
import { getConfigByChain } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";
import { ChainId } from "@/types";

export const runtime = "nodejs";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const LOUPE_CONTRACTS_QUERY = gql`
  query LoupeContracts {
    registryFactories(first: 1) {
      id
    }
    passportSybilProtections: sybilProtections(
      first: 1
      where: { type: Passport }
    ) {
      id
    }
    goodDollarSybilProtections: sybilProtections(
      first: 1
      where: { type: GoodDollar }
    ) {
      id
    }
    globalPauseControllers(
      first: 1
      orderBy: updatedAt
      orderDirection: desc
    ) {
      id
    }
  }
`;

type NetworksJson = {
  networks: NetworkEntry[];
};

type NetworkEntry = {
  name: string;
  chainId: number;
  ENVS?: Record<string, string | undefined>;
  PROXIES?: {
    REGISTRY_FACTORY?: string;
  };
  IMPLEMENTATIONS?: Record<string, string | undefined>;
};

type LoupeContractsQueryResult = {
  registryFactories?: Array<{ id: string }>;
  passportSybilProtections?: Array<{ id: string }>;
  goodDollarSybilProtections?: Array<{ id: string }>;
  globalPauseControllers?: Array<{ id: string }>;
};

type ResolvedContract = {
  key:
    | "registryFactory"
    | "safeArbitrator"
    | "passportScorer"
    | "goodDollarSybil"
    | "proxyOwner"
    | "streamingEscrowFactory"
    | "pauseController";
  label: string;
  abiLabel: string;
  address: string | null;
  source: "subgraph" | "networks.json" | "chains.tsx" | null;
};

const normalizeAddress = (value: unknown) => {
  if (typeof value !== "string") return null;
  if (!ADDRESS_REGEX.test(value)) return null;
  if (value.toLowerCase() === ZERO_ADDRESS) return null;
  return value;
};

const pickAddress = (
  ...candidates: Array<{
    source: ResolvedContract["source"];
    value: unknown;
  }>
) => {
  for (const candidate of candidates) {
    const normalized = normalizeAddress(candidate.value);
    if (normalized != null) {
      return {
        address: normalized,
        source: candidate.source,
      };
    }
  }

  return {
    address: null,
    source: null,
  };
};

const getNetworkEntry = (chainId: number) => {
  const config = networksConfig as NetworksJson;
  return config.networks.find((network) => network.chainId === chainId);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const chainIdParam = url.searchParams.get("chainId");
  const chainId = Number(chainIdParam);

  if (!Number.isInteger(chainId)) {
    return NextResponse.json(
      { error: "Provide a numeric chainId query parameter." },
      { status: 400 },
    );
  }

  const network = getNetworkEntry(chainId);
  if (network == null) {
    return NextResponse.json(
      { error: `Unsupported chainId: ${chainId}` },
      { status: 404 },
    );
  }

  const chainConfig = getConfigByChain(chainId as ChainId);
  const warnings: string[] = [];
  let subgraphContracts: Partial<Record<ResolvedContract["key"], string | null>> = {};

  if (chainConfig != null) {
    try {
      const result = await queryByChain<LoupeContractsQueryResult>(
        chainConfig,
        LOUPE_CONTRACTS_QUERY,
      );

      if (result.error != null) {
        warnings.push(`Subgraph lookup failed: ${result.error.message}`);
      } else {
        subgraphContracts = {
          registryFactory: result.data?.registryFactories?.[0]?.id ?? null,
          passportScorer:
            result.data?.passportSybilProtections?.[0]?.id ?? null,
          goodDollarSybil:
            result.data?.goodDollarSybilProtections?.[0]?.id ?? null,
          pauseController:
            result.data?.globalPauseControllers?.[0]?.id ?? null,
        };
      }
    } catch (error) {
      warnings.push(
        error instanceof Error ? error.message : "Unknown subgraph lookup error",
      );
    }
  }

  const registryFactory = pickAddress(
    { source: "subgraph", value: subgraphContracts.registryFactory },
    { source: "networks.json", value: network.PROXIES?.REGISTRY_FACTORY },
  );
  const safeArbitrator = pickAddress({
    source: "networks.json",
    value: network.ENVS?.ARBITRATOR,
  });
  const passportScorer = pickAddress(
    { source: "subgraph", value: subgraphContracts.passportScorer },
    { source: "networks.json", value: network.ENVS?.PASSPORT_SCORER },
    { source: "chains.tsx", value: chainConfig?.passportScorer },
  );
  const goodDollarSybil = pickAddress(
    { source: "subgraph", value: subgraphContracts.goodDollarSybil },
    { source: "networks.json", value: network.ENVS?.GOOD_DOLLAR_SYBIL },
    { source: "chains.tsx", value: chainConfig?.goodDollar },
  );
  const proxyOwner = pickAddress({
    source: "networks.json",
    value: network.ENVS?.PROXY_OWNER,
  });
  const streamingEscrowFactory = pickAddress({
    source: "networks.json",
    value: network.ENVS?.STREAMING_ESCROW_FACTORY,
  });
  const pauseController = pickAddress(
    { source: "subgraph", value: subgraphContracts.pauseController },
    { source: "networks.json", value: network.ENVS?.PAUSE_CONTROLLER },
  );

  const contracts: ResolvedContract[] = [
    {
      key: "registryFactory",
      label: "RegistryFactory",
      abiLabel: "RegistryFactory",
      ...registryFactory,
    },
    {
      key: "safeArbitrator",
      label: "SafeArbitrator",
      abiLabel: "SafeArbitrator",
      ...safeArbitrator,
    },
    {
      key: "passportScorer",
      label: "PassportScorer",
      abiLabel: "PassportScorer",
      ...passportScorer,
    },
    {
      key: "goodDollarSybil",
      label: "GoodDollarSybil",
      abiLabel: "GoodDollar",
      ...goodDollarSybil,
    },
    {
      key: "proxyOwner",
      label: "ProxyOwner",
      abiLabel: "ProxyOwner",
      ...proxyOwner,
    },
    {
      key: "streamingEscrowFactory",
      label: "StreamingEscrowFactory",
      abiLabel: "StreamingEscrowFactory",
      ...streamingEscrowFactory,
    },
    {
      key: "pauseController",
      label: "PauseController",
      abiLabel: "GlobalPauseController",
      ...pauseController,
    },
  ];

  return NextResponse.json({
    chainId,
    chainName: network.name,
    contracts,
    warnings,
  });
}