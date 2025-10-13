/**
 * Smart Wallet Hook - Unified wallet integration with Base Account capabilities
 * Combines MiniKit wallet with Base Account features
 */

import { useMiniKitWallet } from './useMiniKitWallet'
import { useBaseAccountCapabilities } from './useBaseAccountCapabilities'
import { useAccount } from 'wagmi'
import { canUseGasSponsorship, getGasSponsorshipMessage } from '@/lib/paymaster'

export interface SmartWalletState {
  // Wallet connection
  address?: string
  chainId?: number
  isConnected: boolean
  isConnecting: boolean
  error?: string
  
  // Base Account capabilities
  capabilities: {
    atomicBatch: boolean
    paymasterService: boolean
    auxiliaryFunds: boolean
    isLoading: boolean
    hasCapabilities: boolean
  }
  
  // Gas sponsorship
  canSponsorGas: boolean
  gasSponsorshipMessage: string
  
  // Actions
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  switchToBase: () => Promise<boolean>
  
  // Utils
  isOnBase: boolean
  truncatedAddress?: string
  isFarcasterWallet: boolean
}

/**
 * Unified wallet hook that detects and provides Base Account capabilities
 * @param isFarcasterEnv - Whether running in Farcaster environment
 */
export function useSmartWallet(isFarcasterEnv: boolean = false): SmartWalletState {
  // Get wallet connection state
  const miniKitWallet = useMiniKitWallet()
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  
  // Determine which wallet to use
  const address = isFarcasterEnv ? miniKitWallet.address : wagmiAddress
  const isConnected = isFarcasterEnv ? miniKitWallet.isConnected : wagmiConnected
  const chainId = isFarcasterEnv ? miniKitWallet.chainId : undefined
  
  // Detect Base Account capabilities
  const capabilities = useBaseAccountCapabilities(address)
  
  // Calculate gas sponsorship availability
  const canSponsorGas = canUseGasSponsorship(
    capabilities.paymasterService,
    chainId
  )
  const gasSponsorshipMessage = getGasSponsorshipMessage(canSponsorGas)
  
  return {
    // Wallet state
    address,
    chainId,
    isConnected,
    isConnecting: miniKitWallet.isConnecting,
    error: miniKitWallet.error,
    
    // Base Account capabilities
    capabilities,
    
    // Gas sponsorship
    canSponsorGas,
    gasSponsorshipMessage,
    
    // Actions
    connect: miniKitWallet.connect,
    disconnect: miniKitWallet.disconnect,
    switchToBase: miniKitWallet.switchToBase,
    
    // Utils
    isOnBase: miniKitWallet.isOnBase,
    truncatedAddress: miniKitWallet.truncatedAddress,
    isFarcasterWallet: isFarcasterEnv
  }
}

