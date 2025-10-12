/**
 * Utility functions for PotFi application
 */

/**
 * Get the app domain dynamically from environment variables
 * Works on Vercel with automatic domain detection
 */
export function getAppDomain(): string {
  // For development
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_APP_DOMAIN || 'http://localhost:3000'
  }
  
  // For production, always use the production domain to avoid iframe issues
  // Vercel preview deployments often don't have the same headers configured
  if (process.env.NEXT_PUBLIC_APP_DOMAIN) {
    return process.env.NEXT_PUBLIC_APP_DOMAIN
  }
  
  // Production fallback - always use main domain for Mini App embeds
  return 'https://potfi.basecitizens.com'
}

/**
 * Farcaster Account Association data
 * Used for connecting user accounts with the PotFi app
 */
export const FARCASTER_ACCOUNT_ASSOCIATION = {
  accountAssociation: {
    "header": "eyJmaWQiOjEzNzQ1OTEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg1MGE4NkNiNDNjQzg2NjJDZThmQUMyM0QxMDM1OTg2MjBDYjI0MTczIn0",
    "payload": "eyJkb21haW4iOiJwb3RmaS5iYXNlY2l0aXplbnMuY29tIn0",
    "signature": "MHhkNTM3OWYwZGM0ZmNlMTRlZTk3MDU4NWU4MGQ4M2RlMzRhMDg5MTkxZDRhZWYxNjJjMGRmZmUyOGEwMzY3ODc4MGY3N2Q2NGJkOGIzZjZmZmM2MzAxNzEwNmI1ZjQ5OWU5MzRmYjBkNzZmOGM0OTdlMWIyOThmYTZiMTU5OGIxYTFj"
  }
}

/**
 * Decode base64 payload to get account association details
 */
export function decodeAccountAssociation() {
  try {
    const { header, payload } = FARCASTER_ACCOUNT_ASSOCIATION.accountAssociation
    
    const decodedHeader = JSON.parse(atob(header))
    const decodedPayload = JSON.parse(atob(payload))
    
    return {
      header: decodedHeader,
      payload: decodedPayload,
      signature: FARCASTER_ACCOUNT_ASSOCIATION.accountAssociation.signature
    }
  } catch (error) {
    console.error('Error decoding account association:', error)
    return null
  }
}

/**
 * Verify account association signature
 * TODO: Implement proper cryptographic verification
 */
export function verifyAccountAssociation(): boolean {
  const decoded = decodeAccountAssociation()
  if (!decoded) return false
  
  // TODO: Implement actual signature verification
  // This should verify that the signature matches the header + payload
  console.log('Account association details:', decoded)
  
  return true
}

/**
 * Format USDC amount for display
 */
export function formatUSDC(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(num)
}

/**
 * Truncate Ethereum address for display
 */
export function truncateAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Generate random pot ID (temporary until smart contract integration)
 */
export function generatePotId(): string {
  return Math.random().toString(36).substring(2, 15)
}
