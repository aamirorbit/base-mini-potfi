'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import Link from 'next/link'
import { formatTimeRemaining, truncateAddress } from '@/lib/blockchain'
import { 
  Eye, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  DollarSign, 
  RefreshCw,
  Trophy,
  Timer,
  Wallet,
  Check,
  Copy
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
  canReclaim?: boolean
}

export default function ViewPots() {
  const [mounted, setMounted] = useState(false)
  const [pots, setPots] = useState<PotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all')
  const [isFarcaster, setIsFarcaster] = useState(false)

  // Wallet connections
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { address: miniKitAddress, isConnected: miniKitConnected } = useMiniKitWallet()

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setIsFarcaster(window.parent !== window)
    }
  }, [])

  const isConnected = isFarcaster ? miniKitConnected : wagmiConnected
  const userAddress = isFarcaster ? miniKitAddress : wagmiAddress

  useEffect(() => {
    if (mounted && isConnected && userAddress) {
      loadUserPots()
    }
  }, [mounted, isConnected, userAddress])

  async function loadUserPots() {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/pots?creator=${userAddress}`)
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

  async function reclaimFunds(potId: string) {
    alert('Reclaim function would be called here. In production, this will interact with the smart contract.')
    await loadUserPots()
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
    totalClaimed: pots.reduce((sum, p) => sum + p.claimedAmount, 0)
  }

  if (!mounted) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Eye className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">View Your Pots</h2>
        <p className="text-sm text-gray-600">Connect wallet to see your pots</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Your Pots</h1>
        <button
          onClick={loadUserPots}
          disabled={loading}
          className="p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs text-gray-600">Loading pots...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-500/10 border border-yellow-200/50 text-yellow-700 px-4 py-3 rounded-md text-sm">
          <p className="font-medium mb-1">Unable to load pots</p>
          <p className="text-xs mb-2">{error}</p>
          <button
            onClick={loadUserPots}
            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-md"
          >
            Retry
          </button>
        </div>
      ) : pots.length === 0 ? (
        <div className="text-center py-12">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">No Pots Yet</h2>
          <p className="text-sm text-gray-600 mb-4">Create your first pot to get started</p>
          <Link
            href="/create"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pot</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Compact Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-3 border border-white/20 text-center">
              <p className="text-lg font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-3 border border-white/20 text-center">
              <p className="text-lg font-bold text-blue-600">{stats.active}</p>
              <p className="text-xs text-gray-600">Active</p>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-3 border border-white/20 text-center">
              <p className="text-lg font-bold text-blue-600">{stats.totalValue.toFixed(0)}</p>
              <p className="text-xs text-gray-600">Created</p>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-3 border border-white/20 text-center">
              <p className="text-lg font-bold text-blue-600">{stats.totalClaimed.toFixed(0)}</p>
              <p className="text-xs text-gray-600">Claimed</p>
            </div>
          </div>

          {/* Compact Filter Tabs */}
          <div className="flex space-x-1 bg-white/60 backdrop-blur-xl rounded-md p-1 border border-white/20">
            {[
              { key: 'all', label: 'All', count: stats.total },
              { key: 'active', label: 'Active', count: stats.active },
              { key: 'completed', label: 'Done', count: stats.completed },
              { key: 'expired', label: 'Expired', count: stats.expired }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  filter === key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {/* Compact Pots List */}
          <div className="space-y-3">
            {filteredPots.map((pot) => (
              <PotCard key={pot.id} pot={pot} onReclaim={reclaimFunds} />
            ))}
          </div>

          {/* Compact Create Button */}
          <Link
            href="/create"
            className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-md text-sm transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Pot</span>
          </Link>
        </>
      )}
    </div>
  )
}

function PotCard({ pot, onReclaim }: { pot: PotData, onReclaim: (potId: string) => void }) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const statusConfig = {
    active: {
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50/50',
      border: 'border-blue-200/50',
      label: 'Active'
    },
    completed: {
      icon: pot.jackpotHit ? Trophy : CheckCircle,
      color: pot.jackpotHit ? 'text-yellow-600' : 'text-blue-600',
      bg: pot.jackpotHit ? 'bg-yellow-50/50' : 'bg-blue-50/50',
      border: pot.jackpotHit ? 'border-yellow-200/50' : 'border-blue-200/50',
      label: pot.jackpotHit ? 'Jackpot!' : 'Done'
    },
    expired: {
      icon: XCircle,
      color: 'text-gray-600',
      bg: 'bg-gray-50/50',
      border: 'border-gray-200/50',
      label: 'Expired'
    }
  }

  const config = statusConfig[pot.status]
  const StatusIcon = config.icon
  const progress = (pot.claimedAmount / pot.amount) * 100
  const timeAgo = new Date(pot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-md border border-white/20 overflow-hidden">
      {/* Compact Header */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-lg font-bold text-gray-900">{pot.amount} USDC</p>
              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full ${config.bg} ${config.border} border`}>
                <StatusIcon className={`w-3 h-3 ${config.color}`} />
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-xs text-gray-600">
              <span className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{pot.claimCount}/{pot.maxClaims}</span>
              </span>
              <span className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span>{pot.remainingAmount.toFixed(1)} left</span>
              </span>
              <span>{timeAgo}</span>
            </div>
          </div>
          {pot.status === 'active' && pot.timeRemaining && (
            <div className="text-right">
              <p className="text-xs text-blue-600 font-medium flex items-center">
                <Timer className="w-3 h-3 mr-1" />
                {formatTimeRemaining(pot.timeRemaining)}
              </p>
            </div>
          )}
        </div>

        {/* Compact Progress Bar */}
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Compact Actions */}
        <div className="flex space-x-2">
          <Link
            href={`/claim/${pot.id}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-all text-center"
          >
            View
          </Link>
          {pot.canReclaim ? (
            <button
              onClick={() => onReclaim(pot.id)}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-all flex items-center justify-center space-x-1"
            >
              <Wallet className="w-3 h-3" />
              <span>Reclaim</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium py-2 px-3 rounded-md transition-all"
            >
              {showDetails ? 'Hide' : 'Info'}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="border-t border-gray-200/50 p-3 bg-gray-50/30 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Pot ID</span>
            <span className="font-mono text-gray-800">{pot.id.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Standard Claim</span>
            <span className="font-medium text-gray-900">0.01 USDC</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Claimed</span>
            <span className="font-medium text-gray-900">{pot.claimedAmount.toFixed(2)} USDC</span>
          </div>
          
          {pot.status === 'completed' && pot.jackpotHit && (
            <div className="bg-yellow-50/50 border border-yellow-200/50 rounded-md p-2 mt-2">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className="w-3 h-3 text-yellow-600" />
                <span className="text-xs font-semibold text-yellow-800">Jackpot Winner</span>
              </div>
              <p className="text-xs text-yellow-700">
                {pot.jackpotWinner ? truncateAddress(pot.jackpotWinner) : 'Unknown'}
              </p>
            </div>
          )}
          
          {pot.status === 'active' && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/claim/${pot.id}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className={`w-full text-xs font-medium py-2 px-3 rounded-md transition-all flex items-center justify-center space-x-1.5 ${
                copied
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-900 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
