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
      {/* Active Pots Counter - Only show when there are active pots */}
      {!loading && activePots > 0 && (
        <div className="bg-gold/10 backdrop-blur-xl rounded-md p-3 border border-gold/30 shadow-card animate-pulse">
          <div className="flex items-center justify-center space-x-2">
            <Zap className="w-5 h-5 text-gold-dark" />
            <p className="text-sm font-bold text-gray-900">
              <span className="font-mono tabular-nums text-gold-dark">{activePots}</span> {activePots === 1 ? 'Pot' : 'Pots'} Active Right Now
            </p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center space-y-4">
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
            className="block w-full relative py-4 px-6 rounded-md text-center transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] btn-uppercase group overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #B8941F 0%, #D4AF37 15%, #D4AF37 50%, #D4AF37 85%, #A67C00 100%)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(212, 175, 55, 0.5)',
              border: '1px solid #8B7310',
              borderTop: '2px solid #D4AF37',
              borderBottom: '2px solid #705D0C'
            }}
          >
            {/* Top highlight for beveled effect */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-md" 
                 style={{
                   background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.4), transparent)'
                 }}
            ></div>
            
            {/* Shine effect overlay */}
            <div 
              className="absolute inset-0 opacity-15 group-hover:opacity-30 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(110deg, transparent 30%, rgba(255, 215, 0, 0.6) 50%, transparent 70%)',
                transform: 'translateX(-100%)',
                animation: 'shine 4s ease-in-out infinite'
              }}
            ></div>
            
            {/* Subtle center highlight */}
            <div className="absolute inset-0 opacity-30"
                 style={{
                   background: 'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.3) 48%, rgba(212, 175, 55, 0.3) 52%, transparent 100%)'
                 }}
            ></div>
            
            <div className="relative flex items-center justify-center space-x-2 font-bold"
                 style={{
                   color: '#2A1F00',
                   textShadow: '0 1px 2px rgba(255, 215, 0, 0.3), 0 -1px 1px rgba(0, 0, 0, 0.5)'
                 }}>
              <Plus className="w-5 h-5" />
              <span className="text-base">Create a Pot</span>
            </div>
          </Link>
        )}
        
        <Link
          href="/view"
          className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-center transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm btn-uppercase"
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
