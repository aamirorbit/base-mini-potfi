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
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  bio?: string
  location?: {
    placeId: string
    description: string
  }
}

interface FarcasterContext {
  user?: FarcasterContextUser
  location?: any
  client?: {
    platformType?: 'web' | 'mobile'
    clientFid: number
    added: boolean
    safeAreaInsets?: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }
  features?: {
    haptics: boolean
    cameraAndMicrophoneAccess?: boolean
  }
}

interface MiniAppContextType {
  isReady: boolean
  isBaseMiniApp: boolean
  userProfile: UserProfile | null
  context: FarcasterContext | null
}

const MiniAppContext = createContext<MiniAppContextType>({
  isReady: false,
  isBaseMiniApp: false,
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
  const [isBaseMiniApp, setIsBaseMiniApp] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        // Check user agent for Base Mini App detection
        const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
        const isInIframe = typeof window !== 'undefined' && window.parent !== window
        const isBaseApp = userAgent.includes('Base') || userAgent.includes('Coinbase')
        const isMiniAppEnv = isInIframe || isBaseApp
        
        console.log('🔍 Environment detection:', {
          userAgent,
          isInIframe,
          isBaseApp,
          isMiniAppEnv
        })
        
        setIsBaseMiniApp(isBaseApp)
        
        if (!isMiniAppEnv) {
          console.log('Not in mini app environment, skipping initialization')
          setIsReady(true)
          return
        }

        console.log('🚀 Initializing Mini App SDK...')

        // Add timeout to prevent hanging
        const initWithTimeout = Promise.race([
          (async () => {
            // Get context from SDK
            console.log('📡 Getting context from SDK...')
            const ctx = await sdk.context
            console.log('✅ Context received:', JSON.stringify(ctx, null, 2))
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
        console.log('✅ Mini App initialized successfully')
        
        // Extract user profile from context
        if (ctx?.user) {
          console.log('👤 User data found:', ctx.user)
          const profile: UserProfile = {
            fid: ctx.user.fid,
            username: ctx.user.username,
            displayName: ctx.user.displayName,
            avatarUrl: ctx.user.pfpUrl
          }
          setUserProfile(profile)
          console.log('✅ User profile extracted:', profile)
        } else {
          console.warn('⚠️ No user data in context')
        }
      } catch (error) {
        console.error('❌ Failed to initialize Mini App:', error)
        // Always set ready to true so the app doesn't hang
        setIsReady(true)
      }
    }

    initializeMiniApp()
  }, [])

  // Auto-connect wallet when in Base Mini App environment
  useEffect(() => {
    const autoConnectWallet = async () => {
      if (isReady && isBaseMiniApp) {
        try {
          // Check if already connected
          const walletState = await miniKitWallet.getWalletState()
          if (!walletState.isConnected) {
            console.log('Auto-connecting Base Mini App wallet...')
            await miniKitWallet.connectWallet()
            console.log('Base Mini App wallet auto-connected successfully')
          }
        } catch (error) {
          console.error('Auto-connect failed:', error)
          // Don't block the app if auto-connect fails
        }
      }
    }

    autoConnectWallet()
  }, [isReady, isBaseMiniApp])

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
    <MiniAppContext.Provider value={{ isReady, isBaseMiniApp, userProfile, context }}>
      <div className="mini-app-container">
        {children}
      </div>
    </MiniAppContext.Provider>
  )
}
