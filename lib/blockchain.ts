import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

// Create a public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

// Helper functions for blockchain data
export const formatUSDC = (amount: bigint): number => {
  return Number(amount) / 1e6 // Convert from 6 decimals to USDC
}

export const formatTimestamp = (timestamp: bigint): number => {
  return Number(timestamp) * 1000 // Convert to milliseconds
}

export const truncateAddress = (address: string): string => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const calculateTimeRemaining = (createdAt: number, timeoutSecs: number): number => {
  const now = Date.now()
  const expiryTime = createdAt + (timeoutSecs * 1000)
  return Math.max(0, Math.floor((expiryTime - now) / 1000))
}

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Expired'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

// Pot status determination
export const determinePotStatus = (
  active: boolean,
  claimed: number,
  winners: number,
  createdAt: number,
  timeoutSecs: number,
  remainingAmount: number
): 'active' | 'completed' | 'expired' => {
  const now = Date.now()
  const expiryTime = createdAt + (timeoutSecs * 1000)
  const isExpired = now > expiryTime
  const jackpotHit = claimed === winners && remainingAmount <= 0.01 // Small tolerance
  
  if (active && !isExpired) {
    return 'active'
  } else if (jackpotHit || claimed === winners) {
    return 'completed'
  } else {
    return 'expired'
  }
}
