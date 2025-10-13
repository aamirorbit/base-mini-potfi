/**
 * Paymaster Service Integration
 * Enables sponsored gas transactions for Base Accounts
 */

import { base } from 'viem/chains'

// Coinbase Paymaster Service URL for Base Mainnet
// Replace with your actual Coinbase Developer Platform API key
const PAYMASTER_SERVICE_URL = process.env.NEXT_PUBLIC_COINBASE_PAYMASTER_URL || 
  'https://api.developer.coinbase.com/rpc/v1/base/v7HqDLjJY4e28qgIDAAN4JNYXnz88mJZ'

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
  // Only provide paymaster for Base mainnet (8453)
  if (chainId !== base.id) {
    console.log('Paymaster not available for chain:', chainId)
    return undefined
  }

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

