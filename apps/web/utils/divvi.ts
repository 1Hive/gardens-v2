// utils/divvi.ts
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';

// Divvi configuration constants
const DIVVI_CONSUMER = '0x809C9f8dd8CA93A41c3adca4972Fa234C28F7714';
const DIVVI_PROVIDERS = [
  '0x0423189886d7966f0dd7e7d256898daeee625dca',
  '0x5f0a55fad9424ac99429f635dfb9bf20c3360ab8'
];

// Get the Divvi referral data suffix
export const getDivviDataSuffix = () => {
  return getDataSuffix({
    consumer: DIVVI_CONSUMER,
    providers: DIVVI_PROVIDERS,
  });
};

// Track a transaction with Divvi
export const trackDivviReferral = async (txHash: `0x${string}`, chainId: number) => {
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
