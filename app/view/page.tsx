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
  TrendingUp,
  Calendar,
  Share2,
  Copy,
  AlertTriangle,
  Coins,
  RefreshCw,
  Trophy,
  ArrowLeft,
  Timer,
  Wallet
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
  jackpotHit?: boolean // true if jackpot was won, false if expired without jackpot
  jackpotWinner?: string // address of jackpot winner
  timeRemaining?: number // seconds remaining for active pots
  canReclaim?: boolean // true if creator can reclaim funds
}

export default function ViewPots() {
  const [mounted, setMounted] = useState(false)
  const [pots, setPots] = useState<PotData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all')
  const [isFarcaster, setIsFarcaster] = useState(false)

  // Wallet connections
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { address: miniKitAddress, isConnected: miniKitConnected } = useMiniKitWallet()

  useEffect(() => {
    setMounted(true)
    // Detect if running in Farcaster
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
      
      // Get pots directly from blockchain
      const response = await fetch(`/api/pots?creator=${userAddress}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPots(data.pots || [])
      } else {
        console.error('Failed to load pots:', data.error)
        setPots([])
      }
    } catch (error) {
      console.error('Error loading pots:', error)
      setPots([])
    } finally {
      setLoading(false)
    }
  }

  async function reclaimFunds(potId: string) {
    try {
      // This would call the smart contract's sweep function
      // For now, we'll show a message about the process
      const confirmed = confirm(
        `This will call the smart contract's sweep() function to reclaim your funds from pot ${potId.slice(0, 10)}...\n\n` +
        `In the production version, this would:\n` +
        `1. Check if the pot has expired\n` +
        `2. Calculate remaining unclaimed funds\n` +
        `3. Transfer funds back to your wallet\n` +
        `4. Mark the pot as swept\n\n` +
        `Continue with reclaim?`
      )
      
      if (confirmed) {
        // In production, this would use wagmi to call the contract:
        // const { writeContract } = useWriteContract()
        // await writeContract({
        //   address: jackpotAddress,
        //   abi: jackpotAbi,
        //   functionName: 'sweep',
        //   args: [potId]
        // })
        
        alert('Reclaim function would be called here. In production, this will interact with the smart contract.')
        
        // Refresh data from blockchain
        await loadUserPots()
      }
    } catch (error) {
      console.error('Error reclaiming funds:', error)
      alert('Error reclaiming funds. Please try again.')
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
    totalClaimed: pots.reduce((sum, p) => sum + p.claimedAmount, 0)
  }

  if (!mounted) {
    return (
      <div className="text-center">
          <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-4 mx-auto shadow-2xl animate-pulse">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">View Pots</h1>
            <p className="text-gray-600">Loading...</p>
          </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div>
        <div className="text-center">
          <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-6 mx-auto shadow-2xl">
              <Eye className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">View Your Pots</h1>
            <p className="text-gray-600 mb-6">Connect your wallet to see your PotFi jackpots</p>
            
            <div className="bg-blue-50/50 backdrop-blur-xl rounded-md p-4 shadow-lg border border-blue-200/50">
              <p className="text-sm text-blue-700">
                Connect your wallet to view and manage all your created pots
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="bg-white/70 backdrop-blur-xl rounded-md p-6 shadow-2xl border border-white/20 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-3 mx-auto shadow-2xl">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Your Pots</h1>
            <button
              onClick={loadUserPots}
              disabled={loading}
              className="p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-gray-600 text-sm">Manage and track your PotFi jackpots</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your pots...</p>
        </div>
      ) : pots.length === 0 ? (
        // Empty State
        <div className="text-center">
          <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-md flex items-center justify-center mb-6 mx-auto shadow-2xl">
              <Coins className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Pots Yet</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              You haven't created any PotFi jackpots yet. Start engaging your community with exciting rewards!
            </p>
            
            <Link
              href="/create"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95 inline-block text-center"
            >
              <div className="flex items-center justify-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Create Your First Pot</span>
              </div>
            </Link>
          </div>

          <div className="bg-blue-50/50 backdrop-blur-xl rounded-md p-4 shadow-lg border border-blue-200/50">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Why Create a Pot?</h3>
            <div className="space-y-1 text-xs text-blue-700">
              <p>• Boost engagement on your posts</p>
              <p>• Reward your community with USDC</p>
              <p>• Create viral jackpot excitement</p>
              <p>• Track performance and analytics</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="bg-white/70 backdrop-blur-xl rounded-md p-4 shadow-2xl border border-white/20 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-gray-600">Total Pots</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-gray-600">USDC Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.active}</p>
                <p className="text-xs text-gray-600">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{stats.totalClaimed.toFixed(2)}</p>
                <p className="text-xs text-gray-600">USDC Claimed</p>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white/60 backdrop-blur-xl rounded-md p-2 shadow-xl border border-white/20 mb-6">
            <div className="flex space-x-1">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'active', label: 'Active', count: stats.active },
                { key: 'completed', label: 'Completed', count: stats.completed },
                { key: 'expired', label: 'Expired', count: stats.expired }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                    filter === key
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Pots List */}
          <div className="space-y-4">
            {filteredPots.map((pot) => (
              <PotCard key={pot.id} pot={pot} onReclaim={reclaimFunds} />
            ))}
          </div>

          {/* Create New Pot Button */}
          <div className="mt-8">
            <Link
              href="/create"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95 inline-block text-center"
            >
              <div className="flex items-center justify-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Create New Pot</span>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function PotCard({ pot, onReclaim }: { pot: PotData, onReclaim: (potId: string) => void }) {
  const [showDetails, setShowDetails] = useState(false)
  
  const statusConfig = {
    active: {
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      label: 'Active'
    },
    completed: {
      icon: pot.jackpotHit ? Trophy : CheckCircle,
      color: pot.jackpotHit ? 'text-yellow-600' : 'text-green-600',
      bg: pot.jackpotHit ? 'bg-yellow-50' : 'bg-green-50',
      border: pot.jackpotHit ? 'border-yellow-200' : 'border-green-200',
      label: pot.jackpotHit ? 'Jackpot Hit!' : 'Completed'
    },
    expired: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: 'Expired'
    }
  }

  const config = statusConfig[pot.status]
  const StatusIcon = config.icon
  const progress = (pot.claimedAmount / pot.amount) * 100
  const timeAgo = new Date(pot.createdAt).toLocaleDateString()
  
  // Use utility function for formatting time

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-md shadow-2xl border border-white/20 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${config.bg} ${config.border} border`}>
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{timeAgo}</p>
            {pot.status === 'active' && pot.timeRemaining && (
              <p className="text-xs text-yellow-600 font-medium flex items-center">
                <Timer className="w-3 h-3 mr-1" />
                {formatTimeRemaining(pot.timeRemaining)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">{pot.amount} USDC</p>
            <p className="text-sm text-gray-600">{pot.claimCount} / {pot.maxClaims} claims</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-blue-600">{pot.remainingAmount.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Remaining</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Link
            href={`/claim/${pot.id}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-all duration-200 text-center"
          >
            View Pot
          </Link>
          {pot.canReclaim ? (
            <button
              onClick={() => onReclaim(pot.id)}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-all duration-200 flex items-center justify-center space-x-1"
            >
              <Wallet className="w-4 h-4" />
              <span>Reclaim</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-all duration-200"
            >
              {showDetails ? 'Hide' : 'Details'}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="border-t border-gray-200 p-4 bg-gray-50/50">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pot ID:</span>
              <span className="font-mono text-xs text-gray-800 break-all">{pot.id.slice(0, 20)}...</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Standard Claim:</span>
              <span className="font-medium text-gray-900">0.01 USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Claims:</span>
              <span className="font-medium text-gray-900">{pot.claimCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Claimed Amount:</span>
              <span className="font-medium text-gray-900">{pot.claimedAmount.toFixed(2)} USDC</span>
            </div>
            
            {/* Jackpot Outcome */}
            {pot.status === 'completed' && (
              <>
                <div className="pt-2 border-t border-gray-200">
                  {pot.jackpotHit ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-semibold text-yellow-800">Jackpot Winner!</span>
                      </div>
                      <p className="text-xs text-yellow-700">
                        Winner: {pot.jackpotWinner ? truncateAddress(pot.jackpotWinner) : 'Unknown'}
                      </p>
                      <p className="text-xs text-yellow-700">
                        Won: {pot.remainingAmount.toFixed(2)} USDC
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">Pot Completed</span>
                      </div>
                      <p className="text-xs text-green-700">
                        All funds distributed through standard claims
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Expired Pot Info */}
            {pot.status === 'expired' && (
              <div className="pt-2 border-t border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Pot Expired</span>
                  </div>
                  <p className="text-xs text-red-700">
                    No jackpot winner. {pot.remainingAmount.toFixed(2)} USDC available to reclaim.
                  </p>
                </div>
                {pot.canReclaim && (
                  <button
                    onClick={() => onReclaim(pot.id)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Reclaim {pot.remainingAmount.toFixed(2)} USDC</span>
                  </button>
                )}
              </div>
            )}
            
            {/* Active Pot Actions */}
            {pot.status === 'active' && (
              <div className="pt-2 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Timer className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">Time Remaining</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      {pot.timeRemaining ? formatTimeRemaining(pot.timeRemaining) : 'Calculating...'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/claim/${pot.id}`)}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium py-2 px-3 rounded-md transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Share Link</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
