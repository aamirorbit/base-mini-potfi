'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useEffect, useState } from 'react'
import { 
  Coins, 
  Plus, 
  Eye,
  Trophy,
  Zap,
  Users,
  Shield,
  DollarSign,
  TrendingUp,
  Sparkles
} from 'lucide-react'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [activePots, setActivePots] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  
  // Wallet connections
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { address: miniKitAddress, isConnected: miniKitConnected } = useMiniKitWallet()

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || ''
      const isInIframe = window.parent !== window
      const isFarcasterUA = userAgent.includes('Farcaster')
      const isBaseApp = userAgent.includes('Base') || userAgent.includes('Coinbase')
      
      setIsFarcaster(isInIframe || isFarcasterUA || isBaseApp)
    }
  }, [])

  // Fetch active pots count
  useEffect(() => {
    async function fetchActivePots() {
      try {
        const response = await fetch('/api/pots')
        const data = await response.json()
        if (response.ok && data.success) {
          const active = data.pots?.filter((p: any) => p.status === 'active').length || 0
          setActivePots(active)
        }
      } catch (error) {
        console.error('Failed to fetch active pots:', error)
      } finally {
        setLoading(false)
      }
    }
    if (mounted) {
      fetchActivePots()
    }
  }, [mounted])

  const isConnected = isFarcaster ? miniKitConnected : wagmiConnected

  if (!mounted) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm font-medium text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active Pots Counter */}
      <div className="bg-gold/10 backdrop-blur-xl rounded-md p-3 border border-gold/30 shadow-card animate-pulse">
        <div className="flex items-center justify-center space-x-2">
          <Zap className="w-5 h-5 text-gold-dark" />
          <p className="text-sm font-bold text-gray-900">
            <span className="font-mono tabular-nums text-gold-dark">{loading ? '...' : activePots}</span> {activePots === 1 ? 'Pot' : 'Pots'} Active Right Now
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 gradient-hero rounded-md flex items-center justify-center mb-4 mx-auto shadow-lg">
          <Coins className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
          Welcome to PotFi
        </h1>
        <p className="text-base font-semibold text-gray-700 max-w-md mx-auto">
          Boost your post with a Pot and turn engagement into USDC rewards.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Create Pots */}
        <div className="bg-card backdrop-blur-xl rounded-md p-4 border border-gray-200 shadow-card">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 gradient-hero rounded-md flex items-center justify-center shadow-md flex-shrink-0">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Create Prize Pots</h3>
              <p className="text-xs font-medium text-gray-600">
                Fund a pot with USDC and set engagement requirements. Your community participates by liking, commenting, and recasting.
              </p>
            </div>
          </div>
        </div>

        {/* Instant Claims */}
        <div className="bg-card backdrop-blur-xl rounded-md p-4 border border-gray-200 shadow-card">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center shadow-md flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Instant Claims</h3>
              <p className="text-xs font-medium text-gray-600">
                Users claim their share instantly after completing engagement requirements. No waiting, no delays.
              </p>
            </div>
          </div>
        </div>

        {/* Jackpot Chance */}
        <div className="bg-gold/10 backdrop-blur-xl rounded-md p-4 border border-gold/20 shadow-card">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gold rounded-md flex items-center justify-center shadow-md flex-shrink-0">
              <Trophy className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Jackpot Rewards</h3>
              <p className="text-xs font-medium text-gray-600">
                Every claim has a chance to win the entire pot! The more engagement, the higher the excitement.
              </p>
            </div>
          </div>
        </div>

        {/* On-Chain Security */}
        <div className="bg-card backdrop-blur-xl rounded-md p-4 border border-gray-200 shadow-card">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center shadow-md flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Secure & Decentralized</h3>
              <p className="text-xs font-medium text-gray-600">
                Built on Base blockchain. All transactions are transparent and secure. Your funds are always safe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Step Explainer */}
      <div className="bg-gradient-to-br from-primary/5 via-gold/5 to-primary/5 backdrop-blur-xl rounded-md p-4 border border-primary/20 shadow-card">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-center flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-gold-dark mr-2" />
          How It Works
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Step 1: Fund your post */}
          <div className="text-center">
            <div className="w-14 h-14 gradient-hero rounded-md flex items-center justify-center mx-auto mb-2 shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">Fund your post</p>
            <p className="text-xs font-medium text-gray-600">Add USDC to your pot</p>
          </div>
          
          {/* Step 2: Fans engage */}
          <div className="text-center">
            <div className="w-14 h-14 bg-primary rounded-md flex items-center justify-center mx-auto mb-2 shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">Fans engage</p>
            <p className="text-xs font-medium text-gray-600">They like & claim</p>
          </div>
          
          {/* Step 3: Jackpot hits */}
          <div className="text-center">
            <div className="w-14 h-14 bg-gold rounded-md flex items-center justify-center mx-auto mb-2 shadow-lg">
              <Trophy className="w-7 h-7 text-gray-900" />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">Jackpot hits</p>
            <p className="text-xs font-medium text-gray-600">Winner takes all!</p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 text-center shadow-card">
          <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xs font-medium text-gray-600">USDC</p>
          <p className="text-sm font-bold text-gray-900">Rewards</p>
        </div>
        <div className="bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 text-center shadow-card">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xs font-medium text-gray-600">Community</p>
          <p className="text-sm font-bold text-gray-900">Driven</p>
        </div>
        <div className="bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 text-center shadow-card">
          <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xs font-medium text-gray-600">Instant</p>
          <p className="text-sm font-bold text-gray-900">Claims</p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="space-y-3">
        {isConnected && (
          <Link
            href="/create"
            className="block w-full relative py-4 px-6 rounded-md text-center transition-all duration-300 transform hover:scale-105 btn-uppercase group overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 25%, #FFD700 50%, #FFED4E 75%, #FFD700 100%)',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.2)'
            }}
          >
            {/* Shine effect overlay */}
            <div 
              className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%)',
                transform: 'translateX(-100%)',
                animation: 'shine 3s infinite'
              }}
            ></div>
            
            {/* Inner glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"
                 style={{
                   background: 'radial-gradient(circle at center, rgba(255, 237, 78, 0.4) 0%, transparent 70%)'
                 }}
            ></div>
            
            <div className="relative flex items-center justify-center space-x-2 text-gray-900 font-bold">
              <Plus className="w-5 h-5 drop-shadow-sm" />
              <span className="text-base drop-shadow-sm">Create a Pot</span>
            </div>
          </Link>
        )}
        
        <Link
          href="/view"
          className="block w-full gradient-hero hover:opacity-90 text-white font-bold py-3 px-4 rounded-md text-center transition-all shadow-lg btn-uppercase"
        >
          <div className="flex items-center justify-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Browse Pots</span>
          </div>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 backdrop-blur-xl rounded-md p-3 border border-primary/20 shadow-card">
        <div className="flex items-center justify-center space-x-4 text-xs font-semibold text-gray-700">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Built on Base</span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5 text-gold-dark" />
            <span>USDC Rewards</span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Instant Claims</span>
          </div>
        </div>
      </div>
    </div>
  )
}
