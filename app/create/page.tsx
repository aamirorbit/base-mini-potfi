'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, keccak256, encodePacked, decodeEventLog } from 'viem'
import { jackpotAbi, jackpotAddress, USDC, ONE_USDC } from '@/lib/contracts'
import { getAppDomain } from '@/lib/utils'
import { Coins, AlertTriangle, CheckCircle, Copy, Share2, ArrowLeft, RefreshCw } from 'lucide-react'

export default function Create() {
  const [amount, setAmount] = useState(50)
  const [timeout, setTimeoutSecs] = useState(43200) // 12h
  const [postId, setPostId] = useState('')
  const [potId, setPotId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const usdcAmt = BigInt(Math.round(amount * 1_000_000)) // 6dp

  const { writeContract: approveUSDC, data: approveHash } = useWriteContract()
  const { writeContract: createPot, data: createHash } = useWriteContract()
  
  const { isLoading: isApproving, isSuccess: approveSuccess, error: approveError } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isCreating, isSuccess: createSuccess, error: createError, data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash })

  // Handle transaction errors
  useEffect(() => {
    if (approveError) {
      setErrorMessage(`Approval failed: ${approveError.message}`)
    }
    if (createError) {
      setErrorMessage(`Pot creation failed: ${createError.message}`)
    }
  }, [approveError, createError])

  // Reset error when starting new actions
  const clearError = () => setErrorMessage('')

  // Calculate pot ID (same logic as contract)
  const calculatePotId = (creator: string, timestamp: number) => {
    return keccak256(encodePacked(
      ['address', 'address', 'uint128', 'uint256', 'uint256', 'bytes32'],
      [creator as `0x${string}`, USDC, usdcAmt, BigInt(timeout), BigInt(timestamp), postId as `0x${string}`] // prevrandao will be different, but this gives us a predictable ID for demo
    ))
  }

  // Handle successful pot creation
  useEffect(() => {
    if (createSuccess && createReceipt) {
      try {
        // Extract the real pot ID from transaction logs
        const potCreatedLog = createReceipt.logs.find(log => {
          try {
            const decoded = decodeEventLog({
              abi: jackpotAbi,
              data: log.data,
              topics: log.topics,
            })
            return decoded.eventName === 'PotCreated'
          } catch {
            return false
          }
        })

        if (potCreatedLog) {
          const decoded = decodeEventLog({
            abi: jackpotAbi,
            data: potCreatedLog.data,
            topics: potCreatedLog.topics,
          })
          const realPotId = decoded.args.id as string
          console.log('Real pot ID from contract:', realPotId)
          setPotId(realPotId)
          setShowSuccess(true)
          
          // Initialize pot state in backend
          initializePotState(realPotId, amount)
        } else {
          console.error('PotCreated event not found in transaction logs')
          setErrorMessage('Failed to extract pot ID from transaction. Please try again.')
        }
      } catch (error) {
        console.error('Error extracting pot ID:', error)
        setErrorMessage('Failed to process transaction logs. Please try again.')
      }
    }
  }, [createSuccess, createReceipt])

  // Initialize pot state in backend
  async function initializePotState(potId: string, totalAmount: number) {
    try {
      const response = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          potId,
          totalAmount
        })
      })
      
      if (response.ok) {
        console.log('Pot state initialized successfully')
      } else {
        console.warn('Failed to initialize pot state:', await response.text())
      }
    } catch (error) {
      console.warn('Error initializing pot state:', error)
    }
  }

  async function approve() {
    clearError()
    approveUSDC({ 
      abi: erc20Abi, 
      address: USDC, 
      functionName: 'approve', 
      args: [jackpotAddress, usdcAmt] 
    })
  }
  
  async function create() {
    clearError()
    // createPot(address token, uint128 amount, uint128 standardClaim, uint32 timeoutSecs)
    createPot({
      abi: jackpotAbi, 
      address: jackpotAddress, 
      functionName: 'createPot',
      args: [USDC, usdcAmt, ONE_USDC, timeout]
    })
  }

  // Retry function for failed pot creation
  function retry() {
    setErrorMessage('')
    setPotId(null)
    setShowSuccess(false)
  }

  // Generate shareable URLs
  const frameUrl = potId ? `${getAppDomain()}/p/${potId}` : ''
  const farcasterShareUrl = potId && postId ? 
    `https://warpcast.com/~/compose?text=🎰 PotFi Alert! ${amount} USDC jackpot available! Engage to claim!&embeds[]=${encodeURIComponent(frameUrl)}&parentCastId=${postId}` : 
    potId ? `https://warpcast.com/~/compose?text=🎰 PotFi Alert! ${amount} USDC jackpot available! Engage to claim!&embeds[]=${encodeURIComponent(frameUrl)}` : ''

  // Show error state
  if (errorMessage) {
    return (
      <div className="text-center">
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-6 sm:p-8 shadow-2xl border border-white/20 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-md flex items-center justify-center mb-4 mx-auto shadow-2xl">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Error Creating PotFi
              </h1>
              <p className="text-yellow-700 text-base sm:text-lg mb-6 leading-relaxed">
                {errorMessage}
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={retry}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95 flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={() => {
                    setErrorMessage('')
                    setPotId(null)
                    setShowSuccess(false)
                  }}
                  className="w-full bg-gray-800/90 backdrop-blur-sm hover:bg-gray-900 text-white font-medium py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95 flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Create</span>
                </button>
              </div>
            </div>
      </div>
    )
  }

  if (showSuccess && potId) {
    return (
      <div>
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-6 mx-auto shadow-2xl">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PotFi Created! 🎉
          </h1>
          <p className="text-blue-700 text-lg mb-2">
            {amount} USDC jackpot is now live
          </p>
          <p className="text-gray-500 text-sm">
            Users can now engage and claim!
          </p>
        </div>

        {/* Main Action Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-md p-6 shadow-2xl border border-white/20 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Share to Original Post</h2>
            <p className="text-gray-600 text-sm">
              {postId ? 'Comment on your original post to promote the jackpot' : 'Share your PotFi to get engagement'}
            </p>
          </div>
          
          <a
            href={farcasterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95 inline-block text-center mb-4"
          >
            <div className="flex items-center justify-center space-x-2">
              <Share2 className="w-5 h-5" />
              <span>{postId ? 'Comment on Original Post' : 'Share on Farcaster'}</span>
            </div>
          </a>
          
          <button
            onClick={() => navigator.clipboard.writeText(frameUrl)}
            className="w-full bg-gray-800/90 backdrop-blur-sm hover:bg-gray-900 text-white font-medium py-3 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95"
          >
            <div className="flex items-center justify-center space-x-2">
              <Copy className="w-4 h-4" />
              <span>Copy Direct Link</span>
            </div>
          </button>
        </div>

        {/* Pot Details */}
        <div className="bg-white/60 backdrop-blur-xl rounded-md p-4 shadow-xl border border-white/20 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pot Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium text-gray-900">{amount} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Standard Claim:</span>
              <span className="font-medium text-gray-900">0.01 USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Claims:</span>
              <span className="font-medium text-gray-900">~{Math.floor(amount / 0.01)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Timeout:</span>
              <span className="font-medium text-gray-900">{Math.floor(timeout / 3600)}h</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 break-all">
              <span className="font-medium">ID:</span> {potId}
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-blue-50/50 backdrop-blur-xl rounded-md p-4 shadow-lg border border-blue-200/50 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">How it Works</h3>
          <div className="space-y-1 text-xs text-blue-700">
            <p>• Users engage with your post (like, comment, recast)</p>
            <p>• Each claim gives 0.01 USDC with jackpot chance</p>
            <p>• One lucky user wins the remaining jackpot</p>
            <p>• Probability increases with each claim</p>
          </div>
        </div>

        {/* Create Another Button */}
        <button
          onClick={() => {
            setShowSuccess(false)
            setPotId(null)
            setAmount(50)
            setPostId('')
          }}
          className="w-full bg-gray-800/90 backdrop-blur-sm hover:bg-gray-900 text-white font-medium py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95"
        >
          Create Another PotFi
        </button>
      </div>
    )
  }

  return (
    <div>
      <div>
          {/* Header */}
          <div className="text-center mb-6">
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-6 shadow-2xl border border-white/20 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-3 mx-auto shadow-2xl">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Create PotFi
              </h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                Set up your USDC jackpot and share it with the community
              </p>
            </div>
          </div>
          
          {/* Form */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-md p-5 mb-6 shadow-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-gray-900 font-medium mb-2 text-sm">
                  Jackpot Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter jackpot amount"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Users claim 0.01 USDC each until one wins the full jackpot
                </p>
              </div>
              
              <div>
                <label className="block text-gray-900 font-medium mb-2 text-sm">
                  Original Post ID
                </label>
                <input
                  type="text"
                  value={postId}
                  onChange={(e) => setPostId(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="0x... (Farcaster post hash)"
                />
                <p className="text-gray-500 text-xs mt-1">
                  The post you want to promote with this jackpot
                </p>
              </div>
              
              <div>
                <label className="block text-gray-900 font-medium mb-2 text-sm">
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeoutSecs(Number(e.target.value))}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Timeout in seconds"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Default: 43,200 seconds (12 hours)
                </p>
              </div>
            </div>

            {/* Validation warnings */}
            {amount < 1 && (
              <div className="mt-6 bg-yellow-500/10 backdrop-blur-xl border border-yellow-200/50 text-yellow-700 px-4 py-3 rounded-md shadow-2xl">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-medium">Jackpot amount must be at least 1 USDC.</p>
                </div>
              </div>
            )}
            {!postId && (
              <div className="mt-6 bg-yellow-500/10 backdrop-blur-xl border border-yellow-200/50 text-yellow-700 px-4 py-3 rounded-md shadow-2xl">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-medium">Please enter the original post ID to promote.</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={approve}
              disabled={isApproving || amount < 1 || !postId}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 text-white font-semibold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-lg transform active:scale-95"
            >
              {isApproving ? 'Approving...' : 'Approve USDC'}
            </button>
            
            <button
              onClick={create}
              disabled={isCreating || !approveSuccess || amount < 1 || !postId}
              className="w-full bg-yellow-600 backdrop-blur-sm hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-lg transform active:scale-95"
            >
              {isCreating ? 'Creating...' : 'Create Pot'}
            </button>
          </div>

          {/* Success Message */}
          {approveSuccess && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-center">
              <div className="flex items-center justify-center">
                <span className="mr-2">✅</span>
                <p className="text-sm font-medium">USDC approved! Now you can create the pot.</p>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}