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
  return 'https://base-mini-app-jackpot.vercel.app'
}

/**
 * Farcaster Account Association data
 * Used for connecting user accounts with the PotFi app
 */
export const FARCASTER_ACCOUNT_ASSOCIATION = {
  accountAssociation: {
    header: "eyJmaWQiOjYyOTMyNSwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDE3YmM4QjRjYmY1YWFlMTUxOTNGYzc0ODdBNmE5M0ZCMUEwRmZFNzcifQ",
    payload: "eyJkb21haW4iOiJiYXNlLW1pbmktYXBwLWphY2twb3QudmVyY2VsLmFwcCJ9",
    signature: "G24ULr44JF+cCxor6Fs8lukSSAfvUOOy6qplgHloE/1kQDLtFnrA0z4S2941o1aZ6P1Z22q7FRuEl9CZyqtItBw="
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
