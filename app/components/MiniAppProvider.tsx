'use client'

import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

interface MiniAppProviderProps {
  children: React.ReactNode
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [context, setContext] = useState<any>(null)

  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        // Check if we're in a Farcaster environment
        const isFarcasterEnv = typeof window !== 'undefined' && 
          (window.parent !== window || 
           navigator.userAgent.includes('Farcaster') ||
           window.location !== window.parent.location)
        
        if (!isFarcasterEnv) {
          console.log('Not in Farcaster environment, skipping Mini App initialization')
          setIsReady(true)
          return
        }

        // Add timeout to prevent hanging
        const initWithTimeout = Promise.race([
          (async () => {
            // Get context from Farcaster
            const ctx = await sdk.context
            setContext(ctx)
            
            // Signal that the app is ready
            await sdk.actions.ready()
            return ctx
          })(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), 5000)
          )
        ])

        const ctx = await initWithTimeout
        setIsReady(true)
        console.log('Mini App initialized successfully', ctx)
      } catch (error) {
        console.error('Failed to initialize Mini App:', error)
        // Always set ready to true so the app doesn't hang
        setIsReady(true)
      }
    }

    initializeMiniApp()
  }, [])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading JackPot...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mini-app-container">
      {children}
    </div>
  )
}
