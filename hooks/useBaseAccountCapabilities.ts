/**
 * Base Account Capabilities Hook
 * Detects and provides Base Account enhanced features
 */

import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { base } from 'viem/chains'

export interface BaseAccountCapabilities {
  atomicBatch: boolean
  paymasterService: boolean
  auxiliaryFunds: boolean
  isLoading: boolean
  hasCapabilities: boolean
}

export function useBaseAccountCapabilities(address?: string): BaseAccountCapabilities {
  const [capabilities, setCapabilities] = useState<BaseAccountCapabilities>({
    atomicBatch: false,
    paymasterService: false,
    auxiliaryFunds: false,
    isLoading: true,
    hasCapabilities: false
  })

  const publicClient = usePublicClient()

  useEffect(() => {
    async function detectCapabilities() {
      if (!address || !publicClient) {
        setCapabilities({
          atomicBatch: false,
          paymasterService: false,
          auxiliaryFunds: false,
          isLoading: false,
          hasCapabilities: false
        })
        return
      }

      try {
        // Request wallet capabilities using EIP-5792
        const caps = await publicClient.request({
          method: 'wallet_getCapabilities',
          params: [address]
        } as any) as Record<string, any>

        console.log('Base Account Capabilities:', caps)

        // Base chain ID is 0x2105 (8453 in decimal)
        const baseChainId = '0x2105'
        const baseCapabilities = caps?.[baseChainId] as Record<string, any> | undefined

        if (baseCapabilities) {
          const hasAtomicBatch = baseCapabilities?.atomicBatch?.supported === true
          const hasPaymaster = baseCapabilities?.paymasterService?.supported === true
          const hasAuxFunds = baseCapabilities?.auxiliaryFunds?.supported === true

          setCapabilities({
            atomicBatch: hasAtomicBatch,
            paymasterService: hasPaymaster,
            auxiliaryFunds: hasAuxFunds,
            isLoading: false,
            hasCapabilities: hasAtomicBatch || hasPaymaster || hasAuxFunds
          })

          console.log('✅ Base Account detected:', {
            atomicBatch: hasAtomicBatch,
            paymasterService: hasPaymaster,
            auxiliaryFunds: hasAuxFunds
          })
        } else {
          // No Base Account capabilities
          setCapabilities({
            atomicBatch: false,
            paymasterService: false,
            auxiliaryFunds: false,
            isLoading: false,
            hasCapabilities: false
          })
          console.log('ℹ️ Traditional wallet detected (no Base Account capabilities)')
        }
      } catch (error) {
        console.log('Capability detection not supported by this wallet:', error)
        // Wallet doesn't support capability detection, assume traditional wallet
        setCapabilities({
          atomicBatch: false,
          paymasterService: false,
          auxiliaryFunds: false,
          isLoading: false,
          hasCapabilities: false
        })
      }
    }

    detectCapabilities()
  }, [address, publicClient])

  return capabilities
}

