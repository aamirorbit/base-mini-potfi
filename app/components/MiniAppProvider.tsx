'use client'

import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { miniKitWallet } from '@/lib/minikit-wallet'
import { Plus, X } from 'lucide-react'

interface MiniAppProviderProps {
  children: React.ReactNode
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [showAddPrompt, setShowAddPrompt] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        // Check if we're in a Farcaster environment
        const isFarcasterEnv = typeof window !== 'undefined' && 
          (window.parent !== window || 
           navigator.userAgent.includes('Farcaster') ||
           window.location !== window.parent.location)
        
        setIsFarcaster(isFarcasterEnv)
        
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

  // Show "Add to Mini Apps" prompt for first-time users
  useEffect(() => {
    if (isReady && isFarcaster && typeof window !== 'undefined') {
      const hasBeenPrompted = localStorage.getItem('potfi_add_miniapp_prompted')
      
      if (!hasBeenPrompted) {
        // Show prompt after a short delay
        const timer = setTimeout(() => {
          setShowAddPrompt(true)
        }, 2000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isReady, isFarcaster])

  // Handle adding mini app
  async function handleAddMiniApp() {
    setIsAdding(true)
    try {
      await sdk.actions.addMiniApp()
      console.log('✅ App added to Farcaster')
      localStorage.setItem('potfi_add_miniapp_prompted', 'true')
      setShowAddPrompt(false)
    } catch (error: any) {
      console.error('Error adding mini app:', error)
      if (error.message?.includes('RejectedByUser')) {
        console.log('User rejected adding app')
      }
      localStorage.setItem('potfi_add_miniapp_prompted', 'true')
      setShowAddPrompt(false)
    } finally {
      setIsAdding(false)
    }
  }

  function dismissPrompt() {
    localStorage.setItem('potfi_add_miniapp_prompted', 'true')
    setShowAddPrompt(false)
  }

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
      
      {/* Add to Mini Apps Prompt */}
      {showAddPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="max-w-md mx-auto bg-gradient-to-r from-blue-600 to-blue-700 backdrop-blur-xl rounded-lg p-4 shadow-2xl border border-blue-500">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add PotFi to your Apps</h3>
                  <p className="text-xs text-blue-100">Quick access anytime</p>
                </div>
              </div>
              <button
                onClick={dismissPrompt}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleAddMiniApp}
              disabled={isAdding}
              className="w-full bg-white hover:bg-blue-50 disabled:bg-white/50 text-blue-700 font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              {isAdding ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to Farcaster</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
