/**
 * Utility functions for PotFi application
 */

/**
 * Convert a Farcaster cast ID (bytes20) to bytes32 by padding with zeros
 * Farcaster cast IDs are 20 bytes, but Solidity uses bytes32 for storage
 */
export function castIdToBytes32(castId: string): `0x${string}` {
  const cleanCastId = castId.startsWith('0x') ? castId : `0x${castId}`
  
  // If already 32 bytes, return as is
  if (cleanCastId.length === 66) { // 0x + 64 hex chars
    return cleanCastId as `0x${string}`
  }
  
  // Pad to 32 bytes (add zeros to the right)
  const paddingNeeded = 66 - cleanCastId.length
  return (cleanCastId + '0'.repeat(paddingNeeded)) as `0x${string}`
}

/**
 * Convert a bytes32 cast ID back to bytes20 by removing padding zeros
 * Returns the original Farcaster cast ID format
 */
export function bytes32ToCastId(bytes32: string): string {
  if (!bytes32 || bytes32 === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return ''
  }
  
  // Remove 0x prefix
  const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32
  
  // Find the last non-zero character (cast IDs are padded on the right)
  let lastNonZero = hex.length
  for (let i = hex.length - 1; i >= 0; i--) {
    if (hex[i] !== '0') {
      lastNonZero = i + 1
      break
    }
  }
  
  // If the result is 40 chars (20 bytes), it's likely a cast ID
  if (lastNonZero <= 40) {
    return '0x' + hex.slice(0, Math.max(lastNonZero, 40))
  }
  
  // Otherwise return as is
  return '0x' + hex.slice(0, lastNonZero)
}

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
    "header": "eyJmaWQiOjYyOTMyNSwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDE3YmM4QjRjYmY1YWFlMTUxOTNGYzc0ODdBNmE5M0ZCMUEwRmZFNzcifQ",
    "payload": "eyJkb21haW4iOiJwb3RmaS5iYXNlY2l0aXplbnMuY29tIn0",
    "signature": "yYcWbJUwmrzvTnKzw0o812vCwwQC2CTcwcMtUxpxrEUp1ywWMrFPJ4HDoJXxqIOFiw7JWwYvgDULpAH0/l4H+Rs="
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
