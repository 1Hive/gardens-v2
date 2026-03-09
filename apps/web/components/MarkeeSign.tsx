'use client'

import { useReadContracts } from 'wagmi'
import { formatEther } from 'viem'
import { FixedPriceStrategyABI, MarkeeABI } from '@/lib/contracts/abis'
import { CONTRACTS, CANONICAL_CHAIN_ID } from '@/lib/contracts/addresses'

export type FixedMarkee = {
  name: string
  strategyAddress: string
  message: string
  price: string
  owner: string
  chainId: number
}

const fixedStrategies = CONTRACTS[CANONICAL_CHAIN_ID]?.fixedPriceStrategies ?? []

export function useFixedMarkees() {
  // Phase 1: static data — fetches once, never refetches
  const phase1Contracts = fixedStrategies.flatMap((s) => [
    {
      address: s.address as `0x${string}`,
      abi: FixedPriceStrategyABI,
      functionName: 'markeeAddress' as const,
    },
    {
      address: s.address as `0x${string}`,
      abi: FixedPriceStrategyABI,
      functionName: 'price' as const,
    },
    {
      address: s.address as `0x${string}`,
      abi: FixedPriceStrategyABI,
      functionName: 'owner' as const,
    },
  ])

  const { data: phase1Data, isLoading: isLoadingPhase1 } = useReadContracts({
    contracts: phase1Contracts,
    query: { staleTime: Infinity },
  })

  const markeeAddresses: (`0x${string}` | null)[] = phase1Data
    ? fixedStrategies.map((_, i) => (phase1Data[i * 3]?.result as `0x${string}`) ?? null)
    : fixedStrategies.map(() => null)

  const allResolved = markeeAddresses.every(Boolean)

  // Phase 2: messages — fetches once on load; call refetch() after a purchase
  const phase2Contracts = allResolved
    ? markeeAddresses.map((addr) => ({
        address: addr as `0x${string}`,
        abi: MarkeeABI,
        functionName: 'message' as const,
      }))
    : []

  const { data: phase2Data, refetch } = useReadContracts({
    contracts: phase2Contracts,
    query: {
      enabled: allResolved,
      staleTime: Infinity,
    },
  })

  const markees: FixedMarkee[] = phase2Data
    ? fixedStrategies.map((s, i) => {
        const priceRaw = phase1Data?.[i * 3 + 1]?.result as bigint | undefined
        const owner = (phase1Data?.[i * 3 + 2]?.result as string) ?? ''
        const message = (phase2Data[i]?.result as string) ?? ''
        return {
          name: s.name,
          strategyAddress: s.address,
          message,
          price: priceRaw ? formatEther(priceRaw) : '0',
          owner,
          chainId: CANONICAL_CHAIN_ID,
        }
      })
    : []

  return {
    markees,
    isLoading: isLoadingPhase1 || !phase2Data,
    refetch,
  }
}
