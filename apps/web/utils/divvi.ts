// utils/divvi.ts
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';
import { createWalletClient, custom, type Chain, type WalletClient, type Hash } from 'viem';
import { mainnet, arbitrum, optimism, polygon, base, gnosis, celo } from 'viem/chains';

// Divvi configuration constants
const DIVVI_CONSUMER = '0x809C9f8dd8CA93A41c3adca4972Fa234C28F7714' as `0x${string}`;
const DIVVI_PROVIDERS = [
  '0x0423189886d7966f0dd7e7d256898daeee625dca',
  '0x5f0a55fad9424ac99429f635dfb9bf20c3360ab8'
] as `0x${string}`[];

// Create a wallet client for the given chain
export const createDivviWalletClient = (chain: Chain): WalletClient => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum provider not available');
  }
  
  return createWalletClient({
    chain,
    transport: custom(window.ethereum),
  });
};

// Get the appropriate chain object based on the chain ID
export const getChainById = (chainId: number): Chain => {
  switch (chainId) {
    case 1:
      return mainnet;
    case 42161:
      return arbitrum;
    case 10:
      return optimism;
    case 137:
      return polygon;
    case 100:
      return gnosis;
    case 8453:
      return base;
    case 42220:
      return celo;
    default:
      throw new Error(`Chain ID ${chainId} not supported`);
  }
};

// Rest of the file remains unchanged
