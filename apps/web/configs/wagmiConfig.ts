// "use client";
import { configureChains } from "wagmi";

import { publicProvider } from "wagmi/providers/public";
import { alchemyProvider } from "wagmi/providers/alchemy";

import { chains as chainsServer } from "@/configs/chainServer";

export const { chains, publicClient } = configureChains(chainsServer, [
  publicProvider(),
  alchemyProvider({
    apiKey: process.env.NEXT_PUBLIC_RPC_URL_ARB_TESTNET || "",
  }),
]);
