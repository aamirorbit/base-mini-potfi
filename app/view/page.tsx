'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useEffect, useState } from 'react'
import { formatTimeRemaining } from '@/lib/blockchain'

import { 
  Coins, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Users,
  DollarSign,
  RefreshCw,
  Trophy,
  Timer,
  TrendingUp,
  Zap
} from 'lucide-react'

interface PotData {
  id: string
  amount: number
  claimedAmount: number
  remainingAmount: number
  claimCount: number
  maxClaims: number
  timeout: number
  createdAt: number
  status: 'active' | 'completed' | 'expired'
  postId?: string
  jackpotHit?: boolean
  jackpotWinner?: string
  timeRemaining?: number
  jackpotProbability?: number
  standardClaim?: number
  castId?: string
}

export default function ViewPots() {
  const [mounted, setMounted] = useState(false)
  const [pots, setPots] = useState<PotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('active')
  const [isFarcaster, setIsFarcaster] = useState(false)
  
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
      
      // Detect any mini app context (Farcaster or Base app)
      setIsFarcaster(isInIframe || isFarcasterUA || isBaseApp)
    }
  }, [])

  const isConnected = isFarcaster ? miniKitConnected : wagmiConnected
  const userAddress = isFarcaster ? miniKitAddress : wagmiAddress

  useEffect(() => {
    if (mounted) {
      loadAllPots()
    }
  }, [mounted])

  async function loadAllPots() {
    try {
      setLoading(true)
      setError('')
      
      // Fetch all pots without creator filter
      const response = await fetch('/api/pots')
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPots(data.pots || [])
      } else {
        setError(data.error || 'Failed to load pots')
        setPots([])
      }
    } catch (error) {
      setError('Network error. Please try again.')
      setPots([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPots = pots.filter(pot => {
    if (filter === 'all') return true
    return pot.status === filter
  })

  const stats = {
    total: pots.length,
    active: pots.filter(p => p.status === 'active').length,
    completed: pots.filter(p => p.status === 'completed').length,
    expired: pots.filter(p => p.status === 'expired').length,
    totalValue: pots.reduce((sum, p) => sum + p.amount, 0),
    activeValue: pots.filter(p => p.status === 'active').reduce((sum, p) => sum + p.remainingAmount, 0)
  }

  if (!mounted) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  // Show actual app if in Farcaster
  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Pots</h1>
          <p className="text-xs font-medium text-gray-600">Browse and claim available pots</p>
        </div>
        <button
          onClick={loadAllPots}
          disabled={loading}
          className="p-2 text-primary hover:text-primary-dark disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs font-medium text-gray-600">Loading pots...</p>
        </div>
      ) : error ? (
        <div className="bg-gold/10 border border-gold/30 text-gray-900 px-4 py-3 rounded-md text-sm shadow-card">
          <p className="font-semibold mb-1">Unable to load pots</p>
          <p className="text-xs font-medium mb-2">{error}</p>
          <button
            onClick={loadAllPots}
            className="text-xs relative px-3 py-2 rounded-md font-bold btn-uppercase transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #B8941F 0%, #D4AF37 20%, #D4AF37 80%, #A67C00 100%)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 1px rgba(0, 0, 0, 0.4)',
              border: '1px solid #8B7310',
              color: '#2A1F00',
              textShadow: '0 1px 1px rgba(255, 215, 0, 0.3)'
            }}
          >
            <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.3) 48%, rgba(212, 175, 55, 0.3) 52%, transparent 100%)' }}></div>
            <span className="relative">Retry</span>
          </button>
        </div>
      ) : pots.length === 0 ? (
        <div className="text-center py-12">
          <Coins className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">No Pots Available</h2>
          <p className="text-sm font-medium text-gray-600 mb-4">Be the first to create a pot!</p>
          <Link
            href="/create"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm btn-uppercase"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pot</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Compact Filter Tabs */}
          <div className="flex space-x-1 bg-card backdrop-blur-xl rounded-md p-1 border border-gray-200 shadow-card">
            {[
              { key: 'active', label: 'Active', count: stats.active },
              { key: 'all', label: 'All', count: stats.total },
              { key: 'completed', label: 'Done', count: stats.completed },
              { key: 'expired', label: 'Expired', count: stats.expired }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                  filter === key
                    ? 'gradient-hero text-white shadow-md'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                {label} (<span className="font-mono">{count}</span>)
              </button>
            ))}
          </div>

          {/* Pots List */}
          <div className="space-y-3">
            {filteredPots.length > 0 ? (
              filteredPots.map((pot) => (
                <PotCard key={pot.id} pot={pot} />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600">No {filter} pots found</p>
              </div>
            )}
          </div>

          {/* Create Pot CTA */}
          <div className="bg-primary/5 backdrop-blur-xl rounded-md p-4 border border-primary/20 shadow-card">
            <div className="flex items-start space-x-3 mb-3">
              <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Create Your Own Pot</h3>
                <p className="text-xs font-medium text-gray-600">Boost engagement and reward your community with USDC</p>
              </div>
            </div>
            <Link
              href="/create"
              className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm btn-uppercase"
            >
              <Plus className="w-4 h-4" />
              <span>Create Pot</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function PotCard({ pot }: { pot: PotData }) {
  const statusConfig = {
    active: {
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/30',
      label: 'Active'
    },
    completed: {
      icon: pot.jackpotHit ? Trophy : CheckCircle,
      color: pot.jackpotHit ? 'text-gold' : 'text-primary',
      bg: pot.jackpotHit ? 'bg-gold/10' : 'bg-primary/10',
      border: pot.jackpotHit ? 'border-gold/30' : 'border-primary/30',
      label: pot.jackpotHit ? 'Jackpot!' : 'Done'
    },
    expired: {
      icon: XCircle,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      label: 'Expired'
    }
  }

  const config = statusConfig[pot.status]
  const StatusIcon = config.icon
  const progress = (pot.claimedAmount / pot.amount) * 100
  const timeAgo = new Date(pot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const standardClaim = pot.standardClaim || 0.01
  // Ensure jackpot probability is at least 1% for active pots (default base chance)
  const jackpotProb = pot.jackpotProbability || (pot.status === 'active' ? 1 : 0)

  return (
    <Link href={`/claim/${pot.id}`}>
      <div className="bg-card backdrop-blur-xl rounded-md border border-gray-200 p-3 hover:shadow-lg transition-all cursor-pointer shadow-card">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-lg font-bold text-gray-900 font-mono tabular-nums">{pot.amount} USDC</p>
              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full ${config.bg} ${config.border} border`}>
                <StatusIcon className={`w-3 h-3 ${config.color}`} />
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-xs font-medium text-gray-600">
              <span className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span className="font-mono tabular-nums">{pot.claimCount}/{pot.maxClaims}</span>
              </span>
              <span className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span className="font-mono tabular-nums">{pot.remainingAmount.toFixed(1)} left</span>
              </span>
              <span>{timeAgo}</span>
            </div>
          </div>
          {pot.status === 'active' && pot.timeRemaining && (
            <div className="text-right">
              <p className="text-xs text-primary font-semibold flex items-center">
                <Timer className="w-3 h-3 mr-1" />
                {formatTimeRemaining(pot.timeRemaining)}
              </p>
            </div>
          )}
        </div>

        {/* Stats Row */}
        {pot.status === 'active' && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-primary/5 rounded-md p-2 border border-primary/10">
              <p className="text-xs font-medium text-gray-600">Standard Claim</p>
              <p className="text-sm font-bold text-primary font-mono tabular-nums">{standardClaim} USDC</p>
            </div>
            <div className="bg-gold/10 rounded-md p-2 border border-gold/20">
              <p className="text-xs font-medium text-gray-600">Jackpot Chance</p>
              <p className="text-sm font-bold text-gold-dark font-mono tabular-nums">{jackpotProb.toFixed(1)}%</p>
            </div>
          </div>
        )}
        
        {/* MAX_WINNERS Warning */}
        {pot.status === 'active' && pot.claimCount >= 180 && pot.claimCount < 200 && (
          <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-200/50 text-yellow-700 px-3 py-2 rounded-md shadow-lg mb-2">
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <p className="text-xs font-medium">Approaching claim limit! Only {200 - pot.claimCount} claims remaining.</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
            <span>Claimed</span>
            <span className="font-mono tabular-nums">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="gradient-hero h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Action Button */}
        <div className={`flex items-center justify-center space-x-2 text-xs font-bold py-3 px-4 rounded-md transition-all duration-200 shadow-lg transform active:scale-95 backdrop-blur-sm btn-uppercase ${
          pot.status === 'active' 
            ? 'relative overflow-hidden'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
        }`}
        style={pot.status === 'active' ? {
          background: 'linear-gradient(180deg, #B8941F 0%, #D4AF37 20%, #D4AF37 80%, #A67C00 100%)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 1px rgba(0, 0, 0, 0.4)',
          border: '1px solid #8B7310',
          color: '#2A1F00',
          textShadow: '0 1px 1px rgba(255, 215, 0, 0.3)'
        } : {}}>
          {pot.status === 'active' && (
            <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.3) 48%, rgba(212, 175, 55, 0.3) 52%, transparent 100%)' }}></div>
          )}
          {pot.status === 'active' ? (
            <>
              <TrendingUp className="w-3 h-3 relative z-10" />
              <span className="relative z-10">Claim Now</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3" />
              <span>View Details</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
