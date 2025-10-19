'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { miniKitWallet } from '@/lib/minikit-wallet'
import { jackpotAbi, jackpotAddress } from '@/lib/contracts'
import { encodeFunctionData, pad } from 'viem'
import Link from 'next/link'
import { formatTimeRemaining, truncateAddress } from '@/lib/blockchain'
import { ErrorModal } from '@/app/components/ErrorModal'
import { ConfirmModal } from '@/app/components/ConfirmModal'
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

export default function Profile() {
  const [mounted, setMounted] = useState(false)
  const [pots, setPots] = useState<PotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all')
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [reclaimingPotId, setReclaimingPotId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [potToReclaim, setPotToReclaim] = useState<string | null>(null)

  // Wallet connections
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { address: miniKitAddress, isConnected: miniKitConnected } = useMiniKitWallet()
  
  // Wagmi hooks for reclaim
  const { writeContract: reclaimContract, data: reclaimHash } = useWriteContract()
  const { isLoading: isReclaiming, isSuccess: reclaimSuccess, error: reclaimError } = useWaitForTransactionReceipt({ 
    hash: reclaimHash 
  })

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

  // Handle reclaim transaction completion
  useEffect(() => {
    if (reclaimSuccess) {
      setSuccessMessage('Funds reclaimed successfully!')
      setReclaimingPotId(null)
      setTimeout(() => {
        setSuccessMessage('')
        loadUserPots() // Reload pots to update status
      }, 3000)
    }
    if (reclaimError) {
      const errorMsg = reclaimError.message || 'Reclaim transaction failed'
      setErrorMessage(errorMsg)
      setShowErrorModal(true)
      setReclaimingPotId(null)
    }
  }, [reclaimSuccess, reclaimError])

  async function reclaimFunds(potId: string) {
    setPotToReclaim(potId)
    setShowConfirmModal(true)
  }

  async function executeReclaim() {
    const potId = potToReclaim
    if (!potId) return

    try {
      setReclaimingPotId(potId)
      setErrorMessage('')

      // Pad potId to bytes32
      const potIdBytes32 = pad(potId as `0x${string}`, { size: 32 })

      // Use MiniKit in Farcaster, wagmi elsewhere
      if (isFarcaster) {
        try {
          const provider = miniKitWallet.getProvider()
          if (!provider) {
            setErrorMessage('Wallet not connected properly')
            setShowErrorModal(true)
            setReclaimingPotId(null)
            return
          }

          // Encode the sweep function call
          const data = encodeFunctionData({
            abi: jackpotAbi,
            functionName: 'sweep',
            args: [potIdBytes32]
          })

          console.log('Sending sweep transaction via MiniKit...')
          const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userAddress,
              to: jackpotAddress,
              data: data,
            }]
          })

          console.log('✅ Sweep transaction sent:', txHash)
          
          // Poll for transaction receipt
          let attempts = 0
          const maxAttempts = 20
          const pollInterval = setInterval(async () => {
            attempts++
            try {
              const receipt = await provider.request({
                method: 'eth_getTransactionReceipt',
                params: [txHash]
              })
              
              if (receipt && receipt.status === '0x1') {
                clearInterval(pollInterval)
                console.log('✅ Reclaim successful')
                setSuccessMessage('Funds reclaimed successfully!')
                setReclaimingPotId(null)
                setTimeout(() => {
                  setSuccessMessage('')
                  loadUserPots()
                }, 3000)
              } else if (receipt && receipt.status === '0x0') {
                clearInterval(pollInterval)
                setErrorMessage('Reclaim transaction failed')
                setShowErrorModal(true)
                setReclaimingPotId(null)
              } else if (attempts >= maxAttempts) {
                clearInterval(pollInterval)
                setReclaimingPotId(null)
              }
            } catch (error) {
              if (attempts >= maxAttempts) {
                clearInterval(pollInterval)
                setReclaimingPotId(null)
              }
            }
          }, 1000)
          
        } catch (error: any) {
          console.error('Sweep error:', error)
          const errorMsg = error.message || 'Failed to reclaim funds'
          setErrorMessage(errorMsg)
          setShowErrorModal(true)
          setReclaimingPotId(null)
        }
      } else {
        // Use wagmi for non-Farcaster environments
        reclaimContract({
          abi: jackpotAbi,
          address: jackpotAddress,
          functionName: 'sweep',
          args: [potIdBytes32]
        })
      }
    } catch (error: any) {
      console.error('Reclaim error:', error)
      const errorMsg = error?.message || 'Failed to reclaim funds'
      setErrorMessage(errorMsg)
      setShowErrorModal(true)
      setReclaimingPotId(null)
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
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Wallet className="w-12 h-12 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Profile</h2>
        <p className="text-sm font-medium text-gray-600">Connect wallet to view your profile</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-card backdrop-blur-xl rounded-md p-4 border border-gray-200 shadow-card">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 gradient-hero rounded-md flex items-center justify-center shadow-lg">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            <p className="text-xs font-mono text-gray-600">{userAddress?.slice(0, 10)}...{userAddress?.slice(-8)}</p>
          </div>
          <button
            onClick={loadUserPots}
            disabled={loading}
            className="p-2 text-primary hover:text-primary-dark disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Your Pots Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Your Pots</h2>
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
            onClick={loadUserPots}
            className="text-xs relative px-3 py-1.5 rounded-lg font-bold btn-uppercase transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
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
          <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">No Pots Created</h2>
          <p className="text-sm font-medium text-gray-600 mb-4">Create your first pot to get started</p>
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
          {/* Compact Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 text-center shadow-card">
              <p className="text-lg font-bold text-primary font-mono tabular-nums">{stats.total}</p>
              <p className="text-xs font-medium text-gray-600">Total</p>
            </div>
            <div className="bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 text-center shadow-card">
              <p className="text-lg font-bold text-primary font-mono tabular-nums">{stats.active}</p>
              <p className="text-xs font-medium text-gray-600">Active</p>
            </div>
            <div className="bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 text-center shadow-card">
              <p className="text-lg font-bold text-primary font-mono tabular-nums">{stats.totalValue.toFixed(0)}</p>
              <p className="text-xs font-medium text-gray-600">Created</p>
            </div>
            <div className="bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 text-center shadow-card">
              <p className="text-lg font-bold text-primary font-mono tabular-nums">{stats.totalClaimed.toFixed(0)}</p>
              <p className="text-xs font-medium text-gray-600">Claimed</p>
            </div>
          </div>

          {/* Compact Filter Tabs */}
          <div className="flex space-x-1 bg-card backdrop-blur-xl rounded-md p-1 border border-gray-200 shadow-card">
            {[
              { key: 'all', label: 'All', count: stats.total },
              { key: 'active', label: 'Active', count: stats.active },
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

          {/* Compact Pots List */}
          <div className="space-y-3">
            {filteredPots.map((pot) => (
              <PotCard 
                key={pot.id} 
                pot={pot} 
                onReclaim={reclaimFunds}
                isReclaiming={reclaimingPotId === pot.id}
              />
            ))}
          </div>

          {/* Compact Create Button */}
          {/* <Link
            href="/create"
            className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-md text-sm transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Pot</span>
          </Link> */}
        </>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 max-w-xs shadow-xl animate-in slide-in-from-bottom-5 z-50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <p className="text-sm font-bold text-gray-900">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false)
          setErrorMessage('')
        }}
        title="Reclaim Failed"
        message={errorMessage}
        onRetry={() => {
          setShowErrorModal(false)
          setErrorMessage('')
          if (reclaimingPotId) {
            reclaimFunds(reclaimingPotId)
          }
        }}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setPotToReclaim(null)
        }}
        onConfirm={executeReclaim}
        title="Reclaim Funds"
        message={`Reclaim remaining funds from this pot?\n\nThis will transfer any unclaimed USDC back to your wallet.\n\nContinue?`}
        confirmText="Reclaim"
        cancelText="Cancel"
      />
    </div>
  )
}

function PotCard({ pot, onReclaim, isReclaiming }: { pot: PotData, onReclaim: (potId: string) => void, isReclaiming: boolean }) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  
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

  return (
    <div className="bg-card backdrop-blur-xl rounded-md border border-gray-200 overflow-hidden shadow-card">
      {/* Compact Header */}
      <div className="p-3">
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

        {/* Compact Progress Bar */}
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="gradient-hero h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Compact Actions */}
        <div className="flex space-x-2">
          <Link
            href={`/claim/${pot.id}`}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold py-3 px-4 rounded-md transition-all duration-200 shadow-lg transform active:scale-95 backdrop-blur-sm text-center btn-uppercase"
          >
            View
          </Link>
          {pot.canReclaim ? (
            <button
              onClick={() => onReclaim(pot.id)}
              disabled={isReclaiming}
              className="flex-1 relative py-3 px-4 rounded-md text-xs font-bold btn-uppercase transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              style={{
                background: isReclaiming ? '#9CA3AF' : 'linear-gradient(180deg, #B8941F 0%, #D4AF37 20%, #D4AF37 80%, #A67C00 100%)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.4)',
                border: '1px solid #8B7310',
                borderTop: '1px solid #D4AF37',
                borderBottom: '1px solid #705D0C',
                color: '#2A1F00',
                textShadow: '0 1px 1px rgba(255, 215, 0, 0.3)'
              }}
            >
              {!isReclaiming && (
                <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.3) 48%, rgba(212, 175, 55, 0.3) 52%, transparent 100%)' }}></div>
              )}
              <div className="relative flex items-center justify-center space-x-1">
                {isReclaiming ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Reclaiming...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-3 h-3" />
                    <span>Reclaim</span>
                  </>
                )}
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex-1 bg-gray-800/90 hover:bg-gray-900 text-white text-xs font-semibold py-3 px-4 rounded-md transition-all duration-200 shadow-lg transform active:scale-95 backdrop-blur-sm btn-uppercase"
            >
              {showDetails ? 'Hide' : 'Info'}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-600">Pot ID</span>
            <span className="font-mono text-gray-800">{pot.id.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-600">Standard Claim</span>
            <span className="font-bold text-gray-900 font-mono tabular-nums">0.01 USDC</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-600">Claimed</span>
            <span className="font-bold text-gray-900 font-mono tabular-nums">{pot.claimedAmount.toFixed(2)} USDC</span>
          </div>
          
          {pot.status === 'completed' && pot.jackpotHit && (
            <div className="bg-gold/10 border border-gold/30 rounded-md p-2 mt-2">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className="w-3 h-3 text-gold-dark" />
                <span className="text-xs font-bold text-gray-900">Jackpot Winner</span>
              </div>
              <p className="text-xs font-semibold text-gray-700 font-mono">
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
              className={`w-full text-xs font-bold py-3 px-4 rounded-md transition-all duration-200 shadow-lg transform active:scale-95 backdrop-blur-sm flex items-center justify-center space-x-1.5 btn-uppercase ${
                copied
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-gray-800/90 hover:bg-gray-900 text-white'
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
