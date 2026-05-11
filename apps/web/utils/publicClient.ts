import { Chain, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import type { PublicClient } from "wagmi";
import { getChain, getConfigByChain } from "@/configs/chains";

const envPublicClients = new Map<number, PublicClient>();

export function resolveClientChain(chainId?: number): Chain {
  return (chainId != null ? getChain(chainId as never) : undefined) ?? mainnet;
}

export function getRpcUrlForChain(chainId?: number) {
  const chain = resolveClientChain(chainId);
  return (
    getConfigByChain(chain.id)?.rpcUrl?.trim() ?? chain.rpcUrls.default.http[0]
  );
}

export function getEnvPublicClient(chainId?: number): PublicClient {
  const chain = resolveClientChain(chainId);
  const cachedClient = envPublicClients.get(chain.id);

  if (cachedClient) {
    return cachedClient;
  }

  const rpcUrl = getRpcUrlForChain(chain.id);
  const client = createPublicClient({
    chain,
    transport: rpcUrl ? http(rpcUrl) : http(),
  }) as PublicClient;

  envPublicClients.set(chain.id, client);

  return client;
}
