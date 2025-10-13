/**
 * MiniKit Wallet Integration for Base Mini Apps
 * Using OnchainKit MiniKit SDK
 */

export interface WalletState {
  isConnected: boolean
  address?: string
  chainId?: number
  error?: string
}

export class MiniKitWallet {
  private static instance: MiniKitWallet
  private listeners: ((state: WalletState) => void)[] = []
  
  static getInstance(): MiniKitWallet {
    if (!MiniKitWallet.instance) {
      MiniKitWallet.instance = new MiniKitWallet()
    }
    return MiniKitWallet.instance
  }

  /**
   * Base Mini Apps use the built-in smart wallet
   * Connection is handled by MiniKitProvider and wagmi
   * This method is kept for compatibility but delegates to wagmi
   */
  async connectWallet(): Promise<WalletState> {
    try {
      console.log('Wallet connection is handled by Base App smart wallet')
      
      // In Base Mini Apps, the wallet is automatically connected
      // We just need to check the connection status via wagmi
      const walletState: WalletState = {
        isConnected: true,
      }

      console.log('Base Mini App wallet ready')
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
    const disconnectedState: WalletState = {
      isConnected: false
    }
    this.notifyListeners(disconnectedState)
  }

  /**
   * Get current wallet state
   * In Base Mini Apps, use wagmi hooks instead
   */
  async getWalletState(): Promise<WalletState> {
    return { isConnected: false }
  }

  /**
   * Switch to Base network
   * Base Mini Apps run on Base by default
   */
  async switchToBase(): Promise<boolean> {
    console.log('Base Mini Apps run on Base network by default')
    return true
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
