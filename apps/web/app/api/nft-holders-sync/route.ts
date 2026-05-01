import { type DocumentNode, print } from "graphql";
import { NextResponse } from "next/server";
import {
  type Address,
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import networksConfig from "#/contracts/config/networks.json";
import { nftHoldersMembersDocument } from "#/subgraph/.graphclient";
import { chainConfigMap } from "@/configs/chains";
import {
  getNftHoldersByAddress,
  type NftHolderFlags,
} from "@/services/alchemy";
import { registryFactoryABI } from "@/src/generated";
import { ChainId } from "@/types";
import { getViemChain } from "@/utils/web3";

const PAGE_SIZE = 1000;

type NftHolderMember = {
  id: string;
  isProtopian?: boolean | null;
  isKeeper?: boolean | null;
};

type NftHolderType = "protopian" | "keeper";

type ChainSyncResult = {
  chainId: number;
  nftHolderType: NftHolderType;
  additions: string[];
  removals: string[];
  txHashes: string[];
  dryRun: boolean;
};

type ChainSyncFailure = {
  chainId: number;
  error: string;
  dryRun: boolean;
};

type IndexedNftHolderMap = Record<Address, NftHolderFlags>;
type RoleConflictMap = Record<Address, NftHolderFlags>;

function queryText(document: DocumentNode): string {
  return print(document);
}

const NFT_HOLDERS_MEMBERS_QUERY = queryText(nftHoldersMembersDocument);

function getConfiguredChainIds(): ChainId[] {
  return Object.values(chainConfigMap)
    .filter((config, index, items) => {
      return (
        config.rpcUrl != null &&
        items.findIndex((entry) => entry.id === config.id) === index
      );
    })
    .map((config) => config.id as ChainId);
}

function getChainIdParam(request: Request): string | null {
  const searchParams = new URL(request.url).searchParams;
  return (
    searchParams.get("chainId") ??
    searchParams.get("targetChainId") ??
    searchParams.get("targetChain")
  );
}

function getTargetChainIds(request: Request): ChainId[] | string {
  const chainIdParam = getChainIdParam(request);
  const configuredChainIds = getConfiguredChainIds();

  if (chainIdParam == null) {
    return configuredChainIds;
  }

  if (
    chainIdParam.toLowerCase() === "all" ||
    chainIdParam.toLowerCase() === "all-chains"
  ) {
    return configuredChainIds;
  }

  const chainId = Number(chainIdParam);
  if (!Number.isInteger(chainId)) {
    return `Invalid chainId: ${chainIdParam}`;
  }

  if (!configuredChainIds.includes(chainId as ChainId)) {
    return `Unsupported configured chainId: ${chainIdParam}`;
  }

  return [chainId as ChainId];
}

function isDryRun(request: Request): boolean {
  const value = new URL(request.url).searchParams.get("dryRun");
  return value === "1" || value === "true";
}

function getRegistryFactoryAddress(chainId: number): Address | undefined {
  const network = networksConfig.networks.find(
    (entry) => Number(entry.chainId) === Number(chainId),
  );
  const value = network?.PROXIES?.REGISTRY_FACTORY;
  return isAddress(value ?? "") ? (value as Address) : undefined;
}

async function querySubgraph<T>(
  primaryUrl: string,
  query: string,
  variables: Record<string, unknown>,
  fallbackUrl?: string,
): Promise<T> {
  const run = async (url: string) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Subgraph HTTP error (${response.status})`);
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: Array<{ message?: string }>;
    };

    const errors = json.errors ?? [];
    if (errors.length > 0) {
      throw new Error(
        `Subgraph query failed: ${errors.map((error) => error.message).join("; ")}`,
      );
    }

    if (json.data == null) {
      throw new Error("Subgraph response missing data");
    }

    return json.data;
  };

  try {
    return await run(primaryUrl);
  } catch (error) {
    if (!fallbackUrl || fallbackUrl === primaryUrl) {
      throw error;
    }

    return run(fallbackUrl);
  }
}

function getSubgraphUrls(chainId: ChainId) {
  const config = chainConfigMap[chainId];
  const primaryUrl = config?.publishedSubgraphUrl ?? config?.subgraphUrl;
  const fallbackUrl =
    config?.subgraphUrl && config.subgraphUrl !== primaryUrl ?
      config.subgraphUrl
    : undefined;

  if (primaryUrl == null) {
    throw new Error(`Missing subgraph URL for chain ${String(chainId)}`);
  }

  return { primaryUrl, fallbackUrl };
}

async function fetchNftHolderMembers(
  chainId: ChainId,
): Promise<NftHolderMember[]> {
  const { primaryUrl, fallbackUrl } = getSubgraphUrls(chainId);
  let skip = 0;
  const members: NftHolderMember[] = [];

  while (true) {
    const data = await querySubgraph<{ members: NftHolderMember[] }>(
      primaryUrl,
      NFT_HOLDERS_MEMBERS_QUERY,
      { first: PAGE_SIZE, skip },
      fallbackUrl,
    );

    const page = data.members ?? [];
    if (!page.length) break;

    members.push(...page);

    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return members;
}

function normalizeAddress(address: string | null | undefined): Address | null {
  if (!isAddress(address ?? "")) {
    return null;
  }

  return (address ?? "").toLowerCase() as Address;
}

function indexMembers(members: NftHolderMember[]): IndexedNftHolderMap {
  return members.reduce<IndexedNftHolderMap>((acc, member) => {
    const address = normalizeAddress(member.id);

    if (!address) {
      return acc;
    }

    const previous = acc[address] ?? { isProtopian: false, isKeeper: false };
    acc[address] = {
      isProtopian: previous.isProtopian || member.isProtopian === true,
      isKeeper: previous.isKeeper || member.isKeeper === true,
    };
    return acc;
  }, {});
}

function getRoleFlag(
  nftHolderType: NftHolderType,
  flags: NftHolderFlags | undefined,
): boolean {
  return nftHolderType === "protopian" ?
      !!flags?.isProtopian
    : !!flags?.isKeeper;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isReplacementUnderpricedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("replacement transaction underpriced")
  );
}

async function writeWithNonceRetry(
  write: () => Promise<`0x${string}`>,
): Promise<`0x${string}`> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await write();
    } catch (error) {
      if (
        !isReplacementUnderpricedError(error) ||
        attempt === maxAttempts - 1
      ) {
        throw error;
      }

      await delay(3000 * (attempt + 1));
    }
  }

  throw new Error("NFT holders sync transaction retry failed");
}

function getAddressUniverse(
  desiredByAddress: Record<Address, NftHolderFlags>,
  indexedByChain: Partial<Record<ChainId, IndexedNftHolderMap>>,
): Address[] {
  const addresses = new Set<Address>(
    Object.keys(desiredByAddress) as Address[],
  );

  for (const membersByAddress of Object.values(indexedByChain)) {
    if (!membersByAddress) continue;

    for (const address of Object.keys(membersByAddress) as Address[]) {
      addresses.add(address);
    }
  }

  return Array.from(addresses);
}

function getRoleConflicts(
  indexedByChain: Partial<Record<ChainId, IndexedNftHolderMap>>,
  universeAddresses: Address[],
): RoleConflictMap {
  return universeAddresses.reduce<RoleConflictMap>((acc, address) => {
    let sawProtopian = false;
    let missedProtopian = false;
    let sawKeeper = false;
    let missedKeeper = false;

    for (const membersByAddress of Object.values(indexedByChain)) {
      if (!membersByAddress) continue;

      const flags = membersByAddress[address];
      if (flags?.isProtopian) {
        sawProtopian = true;
      } else {
        missedProtopian = true;
      }

      if (flags?.isKeeper) {
        sawKeeper = true;
      } else {
        missedKeeper = true;
      }
    }

    acc[address] = {
      isProtopian: sawProtopian && missedProtopian,
      isKeeper: sawKeeper && missedKeeper,
    };
    return acc;
  }, {});
}

async function syncNftHolderTypeForChain(params: {
  chainId: ChainId;
  privateKey?: string;
  dryRun: boolean;
  nftHolderType: NftHolderType;
  desiredByAddress: Record<Address, NftHolderFlags>;
  indexedByAddress: IndexedNftHolderMap;
  conflictingByAddress: RoleConflictMap;
  universeAddresses: Address[];
}): Promise<ChainSyncResult | null> {
  const {
    chainId,
    privateKey,
    dryRun,
    nftHolderType,
    desiredByAddress,
    indexedByAddress,
    conflictingByAddress,
    universeAddresses,
  } = params;
  const chainConfig = chainConfigMap[chainId];
  const registryFactory = getRegistryFactoryAddress(Number(chainId));

  if (!chainConfig?.rpcUrl || !registryFactory) {
    return null;
  }

  const publicClient = createPublicClient({
    chain: getViemChain(chainId),
    transport: http(chainConfig.rpcUrl),
  });

  const candidateAdditions = universeAddresses.filter((address) => {
    return (
      getRoleFlag(nftHolderType, desiredByAddress[address]) &&
      (!getRoleFlag(nftHolderType, indexedByAddress[address]) ||
        getRoleFlag(nftHolderType, conflictingByAddress[address]))
    );
  });
  const candidateRemovals = universeAddresses.filter((address) => {
    return (
      !getRoleFlag(nftHolderType, desiredByAddress[address]) &&
      (getRoleFlag(nftHolderType, indexedByAddress[address]) ||
        getRoleFlag(nftHolderType, conflictingByAddress[address]))
    );
  });

  if (dryRun) {
    return {
      chainId: Number(chainId),
      nftHolderType,
      additions: candidateAdditions,
      removals: candidateRemovals,
      txHashes: [],
      dryRun: true,
    };
  }

  const additions = candidateAdditions;
  const removals = candidateRemovals;

  const txHashes: string[] = [];

  if (!dryRun && additions.length > 0) {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: getViemChain(chainId),
      transport: http(chainConfig.rpcUrl),
    });
    const functionName =
      nftHolderType === "protopian" ?
        "setProtopianAddress"
      : "setKeeperAddress";
    const simulation = await publicClient.simulateContract({
      account,
      address: registryFactory,
      abi: registryFactoryABI,
      functionName,
      args: [additions, true],
    });
    const hash = await writeWithNonceRetry(() =>
      walletClient.writeContract(simulation.request),
    );
    await publicClient.waitForTransactionReceipt({ hash });
    txHashes.push(hash);
  }

  if (!dryRun && removals.length > 0) {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: getViemChain(chainId),
      transport: http(chainConfig.rpcUrl),
    });
    const functionName =
      nftHolderType === "protopian" ?
        "setProtopianAddress"
      : "setKeeperAddress";
    const simulation = await publicClient.simulateContract({
      account,
      address: registryFactory,
      abi: registryFactoryABI,
      functionName,
      args: [removals, false],
    });
    const hash = await writeWithNonceRetry(() =>
      walletClient.writeContract(simulation.request),
    );
    await publicClient.waitForTransactionReceipt({ hash });
    txHashes.push(hash);
  }

  return {
    chainId: Number(chainId),
    nftHolderType,
    additions,
    removals,
    txHashes,
    dryRun,
  };
}

export async function GET(request: Request) {
  const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dryRun = isDryRun(request);
  const privateKey = process.env.KEEPER_WALLET_PK;
  if (!dryRun && !privateKey) {
    return NextResponse.json(
      { message: "KEEPER_WALLET_PK is missing or invalid" },
      { status: 500 },
    );
  }

  try {
    if (!dryRun) {
      privateKeyToAccount(privateKey as `0x${string}`);
    }
    const targetChainIds = getTargetChainIds(request);
    if (typeof targetChainIds === "string") {
      return NextResponse.json({ message: targetChainIds }, { status: 400 });
    }

    const allChainIds = getConfiguredChainIds();
    const desiredByAddress = await getNftHoldersByAddress();
    const indexedByChainEntries = await Promise.all(
      allChainIds.map(async (chainId) => {
        const members = await fetchNftHolderMembers(chainId);
        return [chainId, indexMembers(members)] as const;
      }),
    );
    const indexedByChain = Object.fromEntries(indexedByChainEntries) as Partial<
      Record<ChainId, IndexedNftHolderMap>
    >;
    const universeAddresses = getAddressUniverse(
      desiredByAddress,
      indexedByChain,
    );
    const conflictingByAddress = getRoleConflicts(
      indexedByChain,
      universeAddresses,
    );
    const results: ChainSyncResult[] = [];
    const failures: ChainSyncFailure[] = [];

    for (const chainId of targetChainIds) {
      const indexedByAddress = indexedByChain[chainId] ?? {};
      try {
        const protopianResult = await syncNftHolderTypeForChain({
          chainId,
          privateKey,
          dryRun,
          nftHolderType: "protopian",
          desiredByAddress,
          indexedByAddress,
          conflictingByAddress,
          universeAddresses,
        });
        if (protopianResult) {
          results.push(protopianResult);
        }

        const keeperResult = await syncNftHolderTypeForChain({
          chainId,
          privateKey,
          dryRun,
          nftHolderType: "keeper",
          desiredByAddress,
          indexedByAddress,
          conflictingByAddress,
          universeAddresses,
        });
        if (keeperResult) {
          results.push(keeperResult);
        }
      } catch (error) {
        console.error(
          `NFT holders sync failed for chain ${String(chainId)}`,
          error,
        );
        failures.push({
          chainId: Number(chainId),
          error: error instanceof Error ? error.message : "Unknown error",
          dryRun,
        });
      }
    }

    return NextResponse.json({
      message:
        dryRun ?
          "NFT holders sync dry run completed"
        : "NFT holders sync completed",
      dryRun,
      indexedChains: allChainIds,
      targetChains: targetChainIds,
      sourceSummary: {
        addresses: universeAddresses.length,
        protopians: Object.values(desiredByAddress).filter(
          (holder) => holder.isProtopian,
        ).length,
        keepers: Object.values(desiredByAddress).filter(
          (holder) => holder.isKeeper,
        ).length,
      },
      results,
      failures,
    });
  } catch (error) {
    console.error("NFT holders sync failed", error);
    return NextResponse.json(
      {
        message: "NFT holders sync failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
