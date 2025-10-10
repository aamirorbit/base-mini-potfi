/**
 * React hook for MiniKit wallet integration
 * 2025 Farcaster Mini App best practices
 */

import { useState, useEffect, useCallback } from 'react'
import { miniKitWallet, WalletState } from '@/lib/minikit-wallet'

export function useMiniKitWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false
  })
  const [isConnecting, setIsConnecting] = useState(false)

  // Update wallet state listener
  useEffect(() => {
    const handleStateChange = (state: WalletState) => {
      setWalletState(state)
      setIsConnecting(false)
    }

    miniKitWallet.addListener(handleStateChange)

    // Initialize current state
    miniKitWallet.getWalletState().then(handleStateChange)

    return () => {
      miniKitWallet.removeListener(handleStateChange)
    }
  }, [])

  const connect = useCallback(async () => {
    if (isConnecting) return
    
    setIsConnecting(true)
    try {
      await miniKitWallet.connectWallet()
    } catch (error) {
      console.error('Connection failed:', error)
      setIsConnecting(false)
    }
  }, [isConnecting])

  const disconnect = useCallback(async () => {
    await miniKitWallet.disconnectWallet()
  }, [])

  const switchToBase = useCallback(async () => {
    return await miniKitWallet.switchToBase()
  }, [])

  return {
    // State
    address: walletState.address,
    chainId: walletState.chainId,
    isConnected: walletState.isConnected,
    isConnecting,
    error: walletState.error,
    
    // Actions
    connect,
    disconnect,
    switchToBase,
    
    // Utils
    isOnBase: walletState.chainId === 8453,
    truncatedAddress: walletState.address 
      ? `${walletState.address.slice(0, 6)}...${walletState.address.slice(-4)}`
      : undefined
  }
}
