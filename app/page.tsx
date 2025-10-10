'use client'

import Link from 'next/link'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useEffect, useState } from 'react'
import { HelpCircle, X, Coins, Share2, Heart, Shuffle, DollarSign, Target, AlertTriangle, Wifi, Plus, Eye, Home as HomeIcon } from 'lucide-react'

export default function Home() {
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  
  // Wagmi hooks for fallback
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { connect: wagmiConnect } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  
  // MiniKit hooks for Farcaster
  const { 
    address: miniKitAddress, 
    isConnected: miniKitConnected, 
    isConnecting, 
    error, 
    connect: miniKitConnect, 
    disconnect: miniKitDisconnect, 
    truncatedAddress,
    isOnBase,
    switchToBase 
  } = useMiniKitWallet()

  useEffect(() => {
    setMounted(true)
    // Check if we're in Farcaster environment
    const userAgent = navigator.userAgent || ''
    const isFarcasterApp = userAgent.includes('Farcaster') || 
                          window.parent !== window || // iframe detection
                          window.location !== window.parent.location
    setIsFarcaster(isFarcasterApp)
  }, [])

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="text-center">
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-4 mx-auto shadow-lg">
                <Coins className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 sm:mb-8">PotFi</h1>
              <p className="text-gray-600 text-base sm:text-lg">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Use MiniKit in Farcaster, fallback to wagmi elsewhere
  const address = isFarcaster ? miniKitAddress : wagmiAddress
  const isConnected = isFarcaster ? miniKitConnected : wagmiConnected
  const connect = isFarcaster ? miniKitConnect : () => wagmiConnect({ connector: injected() })
  const disconnect = isFarcaster ? miniKitDisconnect : wagmiDisconnect
  const displayAddress = isFarcaster ? truncatedAddress : (wagmiAddress?.slice(0, 6) + '...' + wagmiAddress?.slice(-4))

  return (
    <div>
          {/* App Icon & Title */}
          <div className="text-center mb-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20 mb-6">
              <img 
                src="/logo.png" 
                alt="PotFi Logo" 
                className="w-20 h-20 mx-auto mb-4 rounded-md shadow-lg"
              />
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Social tips with a jackpot twist. Deposit USDC, first N claim randomized splits on Base.
              </p>
              
              {/* How it works button */}
              <button
                onClick={() => setShowHowItWorks(true)}
                className="mt-4 flex items-center justify-center space-x-2 bg-blue-500/10 hover:bg-blue-500/20 backdrop-blur-sm border border-blue-200/50 text-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 mx-auto"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How it works</span>
              </button>
            </div>
          </div>

          {/* Status Cards */}
          {isFarcaster && (
            <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-200/50 text-blue-700 px-4 py-3 rounded-md mb-4 shadow-lg">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <p className="text-sm font-medium">Running in Farcaster Mini App</p>
              </div>
            </div>
          )}

          {error && isFarcaster && (
            <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-200/50 text-yellow-700 px-4 py-3 rounded-md mb-4 shadow-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium">{error}</p>
                  <p className="text-xs mt-1 opacity-75">Wallet connection error in Farcaster</p>
                </div>
              </div>
            </div>
          )}

          {/* Connection Status */}
          {isConnected && (
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-4 shadow-xl border border-white/20 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Connected</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{displayAddress}</span>
              </div>
              
              {isFarcaster && !isOnBase && (
                <button
                  onClick={switchToBase}
                  className="w-full mt-3 bg-yellow-600 backdrop-blur-sm hover:bg-yellow-700 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                >
                  <Wifi className="w-4 h-4" />
                  <span>Switch to Base Network</span>
                </button>
              )}
            </div>
          )}

      {/* Connect Wallet Section - Show when not connected */}
      {!isConnected && (
        <div className="bg-white/80 backdrop-blur-xl border-t border-white/20 shadow-2xl">
          <div className="max-w-md mx-auto px-4 py-4 safe-area-inset-bottom">
            <button
              onClick={connect}
              disabled={isConnecting && isFarcaster}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95"
            >
              {isConnecting && isFarcaster ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>
        </div>
      )}

      {/* How it Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-md p-6 shadow-2xl border border-white/20 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">How it works</h2>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-lg">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">Create a pot</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">Deposit USDC and set the number of winners for your jackpot</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-lg">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">Share the cast</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">Share your PotFi with your community on Farcaster</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-md flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">Engage to claim</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">Like, Comment, and Recast to claim your share of the pot</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-lg">
                  <Shuffle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">Randomized splits</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">Each winner gets a random portion of the total pot</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">2.5% fee</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">Small fee per claim (charged to claimant, not creator)</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowHowItWorks(false)}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-md text-sm transition-all duration-200 shadow-lg"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
