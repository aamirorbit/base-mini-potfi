'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { miniKitWallet } from '@/lib/minikit-wallet'

interface UserProfile {
  fid?: number
  username?: string
  displayName?: string
  avatarUrl?: string
}

interface FarcasterContextUser {
  fid?: number
  username?: string
  displayName?: string
  display_name?: string
  pfpUrl?: string
  pfp_url?: string
  avatarUrl?: string
}

interface FarcasterContext {
  user?: FarcasterContextUser
  [key: string]: any
}

interface MiniAppContextType {
  isReady: boolean
  isFarcaster: boolean
  userProfile: UserProfile | null
  context: FarcasterContext | null
}

const MiniAppContext = createContext<MiniAppContextType>({
  isReady: false,
  isFarcaster: false,
  userProfile: null,
  context: null
})

export const useMiniAppContext = () => useContext(MiniAppContext)

interface MiniAppProviderProps {
  children: React.ReactNode
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [context, setContext] = useState<FarcasterContext | null>(null)
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        // Check if we're in a mini app environment (Farcaster or Base app)
        const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
        const isInIframe = typeof window !== 'undefined' && window.parent !== window
        const isFarcasterUA = userAgent.includes('Farcaster')
        const isBaseApp = userAgent.includes('Base') || userAgent.includes('Coinbase')
        const isMiniAppEnv = isInIframe || isFarcasterUA || isBaseApp
        
        setIsFarcaster(isMiniAppEnv)
        
        if (!isMiniAppEnv) {
          console.log('Not in mini app environment, skipping Mini App initialization')
          setIsReady(true)
          return
        }

        // Add timeout to prevent hanging
        const initWithTimeout = Promise.race([
          (async () => {
            // Get context from Farcaster
            const ctx = await sdk.context
            setContext(ctx as FarcasterContext)
            
            // Signal that the app is ready
            await sdk.actions.ready()
            return ctx
          })(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), 5000)
          )
        ])

        const ctx = await initWithTimeout as FarcasterContext
        setIsReady(true)
        console.log('Mini App initialized successfully', ctx)
        
        // Extract user profile from context
        if (ctx?.user) {
          const profile: UserProfile = {
            fid: ctx.user.fid,
            username: ctx.user.username,
            displayName: ctx.user.displayName || ctx.user.display_name,
            avatarUrl: ctx.user.pfpUrl || ctx.user.pfp_url || ctx.user.avatarUrl
          }
          setUserProfile(profile)
          console.log('User profile extracted:', profile)
        }
      } catch (error) {
        console.error('Failed to initialize Mini App:', error)
        // Always set ready to true so the app doesn't hang
        setIsReady(true)
      }
    }

    initializeMiniApp()
  }, [])

  // Auto-connect wallet when in Farcaster environment
  useEffect(() => {
    const autoConnectWallet = async () => {
      if (isReady && isFarcaster) {
        try {
          // Check if already connected
          const walletState = await miniKitWallet.getWalletState()
          if (!walletState.isConnected) {
            console.log('Auto-connecting Farcaster wallet...')
            await miniKitWallet.connectWallet()
            console.log('Farcaster wallet auto-connected successfully')
          }
        } catch (error) {
          console.error('Auto-connect failed:', error)
          // Don't block the app if auto-connect fails
        }
      }
    }

    autoConnectWallet()
  }, [isReady, isFarcaster])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <MiniAppContext.Provider value={{ isReady, isFarcaster, userProfile, context }}>
      <div className="mini-app-container">
        {children}
      </div>
    </MiniAppContext.Provider>
  )
}
