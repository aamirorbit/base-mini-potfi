/**
 * Paymaster Service Integration
 * Enables sponsored gas transactions for Base Accounts
 */

import { base } from 'viem/chains'

// Coinbase Paymaster Service URL
// Get this from Coinbase Developer Platform: https://portal.cdp.coinbase.com/
const PAYMASTER_SERVICE_URL = process.env.NEXT_PUBLIC_COINBASE_PAYMASTER_URL

export interface PaymasterCapability {
  paymasterService: {
    url: string
  }
}

/**
 * Get paymaster capabilities for sponsored transactions
 * @param chainId - The chain ID to get paymaster for
 * @returns Paymaster capability object or undefined if not available
 */
export function getPaymasterCapability(chainId: number): PaymasterCapability | undefined {
  // Check if paymaster URL is configured
  if (!PAYMASTER_SERVICE_URL) {
    console.log('Paymaster URL not configured. Set NEXT_PUBLIC_COINBASE_PAYMASTER_URL to enable gas sponsorship.')
    return undefined
  }

  // Only support Base mainnet for now
  if (chainId !== base.id) {
    console.log('Paymaster not available for chain:', chainId, '(only Base mainnet supported)')
    return undefined
  }

  console.log('✅ Paymaster available for Base Mainnet')
  
  return {
    paymasterService: {
      url: PAYMASTER_SERVICE_URL
    }
  }
}

/**
 * Check if sponsored transactions are available
 * @param hasPaymasterCapability - Whether the wallet supports paymaster
 * @param chainId - Current chain ID
 * @returns True if sponsored transactions can be used
 */
export function canUseGasSponsorship(
  hasPaymasterCapability: boolean,
  chainId?: number
): boolean {
  if (!chainId) return false
  return hasPaymasterCapability && chainId === base.id
}

/**
 * Get user-friendly message about gas sponsorship status
 * @param canSponsor - Whether gas sponsorship is available
 * @returns User-friendly message
 */
export function getGasSponsorshipMessage(canSponsor: boolean): string {
  if (canSponsor) {
    return '⚡ Gas-free transaction enabled'
  }
  return 'Gas required for this transaction'
}

