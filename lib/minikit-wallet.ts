/**
 * MiniKit Wallet Integration for Farcaster Mini Apps
 * 2025 Best Practices Implementation
 */

import { sdk } from '@farcaster/miniapp-sdk'

export interface WalletState {
  isConnected: boolean
  address?: string
  chainId?: number
  error?: string
}

export class MiniKitWallet {
  private static instance: MiniKitWallet
  private provider: any = null
  private listeners: ((state: WalletState) => void)[] = []
  
  static getInstance(): MiniKitWallet {
    if (!MiniKitWallet.instance) {
      MiniKitWallet.instance = new MiniKitWallet()
    }
    return MiniKitWallet.instance
  }

  /**
   * Get Ethereum provider using MiniKit SDK
   * This is the proper 2025 way to connect wallets in Farcaster Mini Apps
   */
  async connectWallet(): Promise<WalletState> {
    try {
      console.log('Attempting to connect wallet via MiniKit SDK...')
      
      // Use MiniKit SDK to get the Ethereum provider
      const provider = await sdk.wallet.getEthereumProvider()
      
      if (!provider) {
        throw new Error('No Ethereum provider available in Farcaster client')
      }

      this.provider = provider
      
      // Request account access
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet')
      }

      // Get chain ID
      const chainId = await provider.request({
        method: 'eth_chainId'
      })

      const walletState: WalletState = {
        isConnected: true,
        address: accounts[0],
        chainId: parseInt(chainId, 16)
      }

      console.log('Wallet connected successfully:', walletState)
      this.notifyListeners(walletState)
      
      return walletState
      
    } catch (error) {
      console.error('Wallet connection failed:', error)
      
      const errorState: WalletState = {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown wallet connection error'
      }
      
      this.notifyListeners(errorState)
      return errorState
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    this.provider = null
    const disconnectedState: WalletState = {
      isConnected: false
    }
    this.notifyListeners(disconnectedState)
  }

  /**
   * Get current wallet state
   */
  async getWalletState(): Promise<WalletState> {
    if (!this.provider) {
      return { isConnected: false }
    }

    try {
      const accounts = await this.provider.request({
        method: 'eth_accounts'
      })
      
      const chainId = await this.provider.request({
        method: 'eth_chainId'
      })

      return {
        isConnected: accounts && accounts.length > 0,
        address: accounts[0],
        chainId: parseInt(chainId, 16)
      }
    } catch (error) {
      console.error('Error getting wallet state:', error)
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Switch to Base network
   */
  async switchToBase(): Promise<boolean> {
    if (!this.provider) {
      console.error('No provider available')
      return false
    }

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base mainnet
      })
      return true
    } catch (error: any) {
      // If the chain is not added, add it
      if (error.code === 4902) {
        try {
          await this.provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              rpcUrls: ['https://mainnet.base.org'],
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://basescan.org'],
            }],
          })
          return true
        } catch (addError) {
          console.error('Failed to add Base network:', addError)
          return false
        }
      }
      console.error('Failed to switch to Base network:', error)
      return false
    }
  }

  /**
   * Get the raw provider for wagmi integration
   */
  getProvider() {
    return this.provider
  }

  /**
   * Add state change listener
   */
  addListener(callback: (state: WalletState) => void) {
    this.listeners.push(callback)
  }

  /**
   * Remove state change listener
   */
  removeListener(callback: (state: WalletState) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback)
  }

  private notifyListeners(state: WalletState) {
    this.listeners.forEach(listener => listener(state))
  }
}

export const miniKitWallet = MiniKitWallet.getInstance()
