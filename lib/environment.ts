/**
 * Environment Detection for Base Mini App
 * Detects if running inside Base mobile app vs standalone browser
 */

export interface MiniAppEnvironment {
  isBaseApp: boolean
  isMiniApp: boolean
  userAgent: string
  isIframe: boolean
}

/**
 * Detect if running inside Base mini app
 * Base app includes Farcaster protocol support via Coinbase Smart Wallet
 */
export function detectBaseAppEnvironment(): MiniAppEnvironment {
  if (typeof window === 'undefined') {
    return {
      isBaseApp: false,
      isMiniApp: false,
      userAgent: '',
      isIframe: false
    }
  }

  const userAgent = navigator.userAgent || ''
  const isIframe = window.parent !== window || window.location !== window.parent.location
  
  // Detect Base app - includes Farcaster, Base, and Coinbase identifiers
  const isBaseApp = 
    userAgent.includes('Base') || 
    userAgent.includes('Coinbase') ||
    userAgent.includes('Farcaster') || // Base app supports Farcaster protocol
    isIframe // Likely embedded in mini app
  
  // Mini app environment detection
  const isMiniApp = isBaseApp

  console.log('🔍 Environment Detection:', {
    isBaseApp,
    isMiniApp,
    isIframe,
    userAgent: userAgent.substring(0, 100),
    platform: isBaseApp ? 'Base Mobile App' : 'Standalone Browser'
  })

  return {
    isBaseApp,
    isMiniApp,
    userAgent,
    isIframe
  }
}

/**
 * Get cast URL using Base app deep link
 * Always returns farcaster:// protocol which opens within Base app
 * This protocol only works in Base/Farcaster apps, not in browsers
 */
export function getCastUrl(castId: string): string | undefined {
  if (!castId) return undefined
  
  // Clean cast ID
  const cleanCastId = castId.startsWith('0x') ? castId : `0x${castId}`
  
  // Use Farcaster deep link - opens within Base app
  return `farcaster://casts/${cleanCastId}`
}

/**
 * Get shortened cast ID for display
 */
export function getShortCastId(castId: string): string {
  if (!castId) return ''
  const cleanCastId = castId.startsWith('0x') ? castId : `0x${castId}`
  return `${cleanCastId.slice(0, 10)}...${cleanCastId.slice(-8)}`
}

/**
 * Get share URL for creating new casts
 */
export function getShareCastUrl(text: string, embedUrl: string): string {
  const params = new URLSearchParams({
    text,
    'embeds[]': embedUrl
  })
  
  return `https://warpcast.com/~/compose?${params.toString()}`
}

/**
 * Check if we should use MiniKit wallet
 * Use MiniKit in Base app, fallback to wagmi elsewhere
 */
export function shouldUseMiniKitWallet(): boolean {
  const env = detectBaseAppEnvironment()
  return env.isBaseApp
}

