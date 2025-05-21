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

// Get the Divvi referral data suffix
export const getDivviDataSuffix = (): string => {
  return getDataSuffix({
    consumer: DIVVI_CONSUMER,
    providers: DIVVI_PROVIDERS,
  });
};

// Append Divvi referral data suffix to transaction data
export const appendDivviReferral = (originalData: `0x${string}`): `0x${string}` => {
  const dataSuffix = getDivviDataSuffix();
  // Remove '0x' prefix from the suffix if it exists
  const cleanSuffix = dataSuffix.startsWith('0x') ? dataSuffix.slice(2) : dataSuffix;
  return `${originalData}${cleanSuffix}` as `0x${string}`;
};

// Track a transaction with Divvi
export const trackDivviReferral = async (txHash: Hash, chainId: number): Promise<void> => {
  try {
    await submitReferral({
      txHash,
      chainId,
    });
    // Mark user as tracked in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('divvi_tracked', 'true');
    }
    console.log('Successfully tracked referral with Divvi:', txHash);
  } catch (error) {
    console.error('Error tracking referral with Divvi:', error);
  }
};

// Check if a user has already been tracked with Divvi
export const isUserTrackedWithDivvi = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('divvi_tracked') === 'true';
};

// Send a transaction with Divvi referral tracking
export const sendDivviTransaction = async (
  chainId: number,
  txParams: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
    [key: string]: any;
  }
): Promise<Hash> => {
  try {
    // Get the chain
    const chain = getChainById(chainId);
    
    // Create wallet client
    const walletClient = createDivviWalletClient(chain);
    
    // Get account
    const [account] = await walletClient.getAddresses();
    
    // Check if user has already been tracked
    const isTracked = isUserTrackedWithDivvi();
    
    // Append Divvi data suffix if this is the user's first transaction
    const enhancedData = isTracked 
      ? txParams.data 
      : appendDivviReferral(txParams.data) as `0x${string}`;
    
    // Send transaction
    const txHash = await walletClient.sendTransaction({
      account,
      ...txParams,
      data: enhancedData,
    });
    
    // Track the transaction with Divvi if this is the user's first transaction
    if (!isTracked) {
      await trackDivviReferral(txHash, chainId);
    }
    
    return txHash;
  } catch (error) {
    console.error('Failed to send transaction with Divvi referral:', error);
    throw error;
  }
};
