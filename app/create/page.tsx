'use client'

import { useState, useEffect, useMemo } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { erc20Abi, keccak256, encodePacked, decodeEventLog, encodeFunctionData, createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { jackpotAbi, jackpotAddress, USDC, ONE_USDC } from '@/lib/contracts'
import { getAppDomain, castIdToBytes32, extractCastHash } from '@/lib/utils'
import { detectBaseAppEnvironment, getShareCastUrl } from '@/lib/environment'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useSmartWallet } from '@/hooks/useSmartWallet'
import { useBatchTransactions } from '@/hooks/useBatchTransactions'
import { getPaymasterCapability } from '@/lib/paymaster'
import { miniKitWallet } from '@/lib/minikit-wallet'
import { Coins, AlertTriangle, CheckCircle, Copy, Share2, ArrowLeft, RefreshCw, Clock, DollarSign, Users, Zap } from 'lucide-react'
import Link from 'next/link'
import { ErrorModal } from '@/app/components/ErrorModal'

export default function Create() {
  const [amount, setAmount] = useState(1)
  const [timeout, setTimeoutSecs] = useState(43200) // 12h
  const [postId, setPostId] = useState('')
  const [requireLike, setRequireLike] = useState(true) // Default: require like
  const [requireRecast, setRequireRecast] = useState(true) // Default: require recast
  const [requireComment, setRequireComment] = useState(true) // Default: require comment
  const [potId, setPotId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isBaseApp, setIsBaseApp] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [baseAppApproved, setBaseAppApproved] = useState(false)
  const [baseAppApproving, setBaseAppApproving] = useState(false)
  const [baseAppCreating, setBaseAppCreating] = useState(false)
  const [isPotIdPending, setIsPotIdPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const usdcAmt = BigInt(Math.round(amount * 1_000_000)) // 6dp

  // Wagmi hooks for fallback
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { writeContract: approveUSDC, data: approveHash } = useWriteContract()
  const { writeContract: createPotContract, data: createHash } = useWriteContract()
  
  // MiniKit hooks for Base app
  const { 
    address: miniKitAddress, 
    isConnected: miniKitConnected,
    isConnecting,
    connect: miniKitConnect,
    isOnBase,
    switchToBase 
  } = useMiniKitWallet()
  
  // Smart wallet with Base Account capabilities
  const smartWallet = useSmartWallet(isBaseApp)
  
  // Batch transactions hook
  const { writeBatch } = useBatchTransactions()

  // Detect Base app environment
  useEffect(() => {
    setMounted(true)
    const env = detectBaseAppEnvironment()
    setIsBaseApp(env.isBaseApp)
  }, [])

  // Use MiniKit in Base app, fallback to wagmi in browser
  const address = isBaseApp ? miniKitAddress : wagmiAddress
  const isConnected = isBaseApp ? miniKitConnected : wagmiConnected
  
  // Get paymaster capabilities for sponsored gas
  const paymasterCapability = useMemo(() => {
    if (smartWallet.canSponsorGas && smartWallet.chainId) {
      return getPaymasterCapability(smartWallet.chainId)
    }
    return undefined
  }, [smartWallet.canSponsorGas, smartWallet.chainId])
  
  const { isLoading: isApproving, isSuccess: approveSuccess, error: approveError } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isCreating, isSuccess: createSuccess, error: createError, data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash })
  
  // Check current USDC allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, jackpotAddress] : undefined,
    query: {
      enabled: !!address
    }
  })

  // Handle transaction errors
  useEffect(() => {
    if (approveError) {
      const errorMsg = `Approval failed: ${approveError.message}`
      setErrorMessage(errorMsg)
      setShowErrorModal(true)
      setBaseAppApproving(false)
    }
    if (createError) {
      const errorMsg = `Pot creation failed: ${createError.message}`
      setErrorMessage(errorMsg)
      setShowErrorModal(true)
      setBaseAppCreating(false)
    }
  }, [approveError, createError])

  // Auto-proceed to creation after approval success
  useEffect(() => {
    // Only auto-proceed if we just got approval and haven't started creating yet
    const justApproved = (isBaseApp && baseAppApproved) || approveSuccess
    const notYetCreating = !(isBaseApp ? baseAppCreating : isCreating)
    const notYetCreated = !showSuccess
    
    if (justApproved && notYetCreating && notYetCreated) {
      // Automatically start pot creation after approval
      console.log('✅ Approval successful, starting pot creation...')
      // Refetch allowance before proceeding
      refetchAllowance().then(() => {
        setTimeout(() => {
          create()
        }, 500) // Small delay to show approval success
      })
    }
  }, [baseAppApproved, approveSuccess, isBaseApp, baseAppCreating, isCreating, showSuccess])

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
          
          // @ts-ignore - we know this event has potId
          const realPotId = decoded.args.potId as string
          console.log('Real pot ID from event:', realPotId)
          setPotId(realPotId)
          setShowSuccess(true)
          
          // Initialize pot state in backend
          initializePotState(realPotId, amount)
        } else {
          // Fallback: use timestamp-based ID
          const fallbackId = calculatePotId(address!, Date.now())
          console.log('Using fallback pot ID:', fallbackId)
          setPotId(fallbackId)
          setShowSuccess(true)
        }
      } catch (error) {
        console.error('Error extracting pot ID:', error)
        setErrorMessage('Pot created but could not extract ID. Please check your transaction.')
      }
    }
  }, [createSuccess, createReceipt, address, amount, timeout, postId])

  // Initialize pot state in backend
  async function initializePotState(potId: string, amount: number) {
    try {
      const response = await fetch('/api/pots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          potId,
          creator: address,
          amount,
          postId
        })
      })
      
      if (!response.ok) {
        console.error('Failed to initialize pot state in backend')
      }
    } catch (error) {
      console.error('Error initializing pot state:', error)
    }
  }

  
  async function approve() {
    clearError()
    
    // Check allowance again right before approving (double-check)
    try {
      const result = await refetchAllowance()
      const allowance = result.data as bigint | undefined
      
      if (allowance && allowance >= usdcAmt) {
        console.log('Allowance already sufficient, skipping approval')
        // Mark as approved and proceed
        if (isBaseApp) {
          setBaseAppApproved(true)
        }
        return
      }
    } catch (error) {
      console.error('Error checking allowance before approval:', error)
    }
    
    // Use MiniKit provider in Base app, wagmi elsewhere
    if (isBaseApp && mounted) {
      setBaseAppApproving(true)
      try {
        const provider = miniKitWallet.getProvider()
        if (!provider) {
          setErrorMessage('Wallet not connected properly')
          setBaseAppApproving(false)
          return
        }

        // Encode the approve function call
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [jackpotAddress, usdcAmt]
        })

        console.log('Sending approve transaction via MiniKit...')
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: USDC,
            data: data,
          }]
        })

        console.log('✅ Approve transaction sent:', txHash)
        
        // Wait for approval confirmation
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
              console.log('✅ Approval confirmed')
              setBaseAppApproved(true)
              setBaseAppApproving(false)
              // Refetch allowance after approval
              refetchAllowance()
            } else if (receipt && receipt.status === '0x0') {
              clearInterval(pollInterval)
              setErrorMessage('Approval transaction failed')
              setBaseAppApproving(false)
            } else if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              setBaseAppApproving(false)
            }
          } catch (error) {
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              setBaseAppApproving(false)
            }
          }
        }, 1000)
        
      } catch (error: any) {
        console.error('Approve error:', error)
        const errorMsg = error.message || 'Failed to approve USDC'
        setErrorMessage(errorMsg)
        setShowErrorModal(true)
        setBaseAppApproving(false)
      }
    } else {
      // Use wagmi for standalone browser
      approveUSDC({ 
        abi: erc20Abi, 
        address: USDC, 
        functionName: 'approve', 
        args: [jackpotAddress, usdcAmt] 
      })
    }
  }
  
  // Main function that handles both approval and creation
  async function handleCreatePot() {
    clearError()
    
    // First, check current allowance
    let sufficientAllowance = false
    
    try {
      // Refetch the latest allowance
      const result = await refetchAllowance()
      const allowance = result.data as bigint | undefined
      
      console.log('Current allowance:', allowance?.toString(), 'Required:', usdcAmt.toString())
      
      // Check if current allowance is sufficient
      if (allowance && allowance >= usdcAmt) {
        sufficientAllowance = true
        console.log('Sufficient allowance already exists, skipping approval')
      }
    } catch (error) {
      console.error('Error checking allowance:', error)
      // Continue with approval if check fails
    }
    
    // Check if we need approval
    const alreadyApproved = isBaseApp ? baseAppApproved : approveSuccess
    const needsApproval = !sufficientAllowance && !alreadyApproved
    
    // Try to use Base Account batch transactions if available
    if (needsApproval && smartWallet.capabilities.atomicBatch && !smartWallet.capabilities.isLoading) {
      console.log('🚀 Using Base Account batch transaction for approve + create')
      await handleBatchCreate()
    } else if (needsApproval) {
      console.log('Starting approval process...')
      await approve()
      // create() will be called automatically after approval success
    } else {
      console.log('Approval not needed or already done, starting pot creation...')
      await create()
    }
  }

  // Batch transaction for approve + create (Base Account only)
  async function handleBatchCreate() {
    clearError()
    setBaseAppApproving(true)
    setBaseAppCreating(true)
    
    try {
      const postIdBytes32 = castIdToBytes32(postId)
      
      // Prepare batch calls
      const calls = [
        {
          address: USDC as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [jackpotAddress, usdcAmt]
        },
        {
          address: jackpotAddress as `0x${string}`,
          abi: jackpotAbi,
          functionName: 'createPot',
          args: [USDC, usdcAmt, ONE_USDC, timeout, postIdBytes32, requireLike, requireRecast, requireComment]
        }
      ]
      
      console.log('Executing batch transaction with paymaster...', calls)
      
      // Execute batch with paymaster capability for gas-free transaction
      const capabilities = paymasterCapability || {}
      const hash = await writeBatch(calls, capabilities)
      
      if (hash) {
        console.log('✅ Batch transaction submitted:', hash)
        setPotId(hash)
        setShowSuccess(true)
        setIsPotIdPending(true)
        
        // Wait for transaction to be mined
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        
        if (receipt.status === 'success') {
          console.log('✅ Batch transaction confirmed')
          
          // Extract pot ID from logs
          const potCreatedLog = receipt.logs.find((log: any) => 
            log.address.toLowerCase() === jackpotAddress.toLowerCase() &&
            log.topics.length >= 2
          )
          
          if (potCreatedLog && potCreatedLog.topics[1]) {
            const realPotId = potCreatedLog.topics[1]
            console.log('🎯 Real pot ID extracted:', realPotId)
            setPotId(realPotId)
            setIsPotIdPending(false)
            initializePotState(realPotId, amount)
          }
        }
        
        setBaseAppApproving(false)
        setBaseAppCreating(false)
      }
    } catch (error: any) {
      console.error('Batch transaction error:', error)
      setErrorMessage(error.message || 'Batch transaction failed')
      setShowErrorModal(true)
      setBaseAppApproving(false)
      setBaseAppCreating(false)
    }
  }

  async function create() {
    clearError()
    
    // Use MiniKit provider in Base app, wagmi elsewhere
    if (isBaseApp && mounted) {
      setBaseAppCreating(true)
      try {
        const provider = miniKitWallet.getProvider()
        if (!provider) {
          setErrorMessage('Wallet not connected properly')
          setBaseAppCreating(false)
          return
        }

        // Convert postId to bytes32 for contract
        const postIdBytes32 = castIdToBytes32(postId)
        
        // Encode the createPot function call
        const data = encodeFunctionData({
          abi: jackpotAbi,
          functionName: 'createPot',
          args: [USDC, usdcAmt, ONE_USDC, timeout, postIdBytes32, requireLike, requireRecast, requireComment]
        })

        console.log('Sending createPot transaction via MiniKit...')
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: jackpotAddress,
            data: data,
          }]
        })

        console.log('✅ CreatePot transaction sent:', txHash)
        
        // Show initial success with txHash
        setPotId(txHash)
        setShowSuccess(true)
        setIsPotIdPending(true)
        
        // Use public RPC client to poll for receipt (MiniKit provider doesn't support eth_getTransactionReceipt)
        console.log('⏳ Waiting for transaction to be mined...')
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })
        
        let attempts = 0
        const maxAttempts = 30 // 30 seconds max
        const pollInterval = setInterval(async () => {
          attempts++
          try {
            const receipt = await publicClient.getTransactionReceipt({
              hash: txHash as `0x${string}`
            })
            
            if (receipt && receipt.status === 'success') {
              // Transaction successful, extract potId
              clearInterval(pollInterval)
              console.log('✅ Transaction mined:', receipt)
              
              if (receipt.logs && receipt.logs.length > 0) {
                // Find the PotCreated event (first indexed topic after event signature)
                const potCreatedLog = receipt.logs.find((log: any) => 
                  log.address.toLowerCase() === jackpotAddress.toLowerCase() &&
                  log.topics.length >= 2
                )
                
                if (potCreatedLog && potCreatedLog.topics[1]) {
                  const realPotId = potCreatedLog.topics[1]
                  console.log('🎯 Real pot ID extracted:', realPotId)
                  setPotId(realPotId)
                  setIsPotIdPending(false)
                  
                  // Initialize pot state
                  initializePotState(realPotId, amount)
                }
              }
              setBaseAppCreating(false)
            } else if (receipt && receipt.status === 'reverted') {
              // Transaction failed
              clearInterval(pollInterval)
              console.error('❌ Transaction failed')
              setErrorMessage('Transaction failed. Please try again.')
              setShowSuccess(false)
              setBaseAppCreating(false)
            }
          } catch (error: any) {
            // Receipt not yet available, continue polling
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              console.warn('⏱️ Transaction still pending after 30 seconds')
              setIsPotIdPending(false)
              setBaseAppCreating(false)
            }
          }
        }, 1000) // Poll every second
        
      } catch (error: any) {
        console.error('CreatePot error:', error)
        const errorMsg = error.message || 'Failed to create pot'
        setErrorMessage(errorMsg)
        setShowErrorModal(true)
        setBaseAppCreating(false)
      }
    } else {
      // Convert postId to bytes32 for contract
      const postIdBytes32 = castIdToBytes32(postId)
      
      // Use wagmi for standalone browser
      createPotContract({
        abi: jackpotAbi, 
        address: jackpotAddress, 
        functionName: 'createPot',
        args: [USDC, usdcAmt, ONE_USDC, timeout, postIdBytes32, requireLike, requireRecast, requireComment]
      })
    }
  }

  // Retry function for failed pot creation
  function retry() {
    setErrorMessage('')
    setPotId(null)
    setShowSuccess(false)
  }

  // Generate shareable URLs
  const claimUrl = potId ? `${getAppDomain()}/claim/${potId}` : ''
  const shareUrl = claimUrl
    ? getShareCastUrl(
        `🎯 Claim my ${amount} USDC PotFi pot! Get 0.01 USDC per claim or hit the jackpot! 🎰`,
        claimUrl
      )
    : ''

  if (!mounted) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  // Show error state
  if (errorMessage) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-200/50 rounded-md p-4">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-700 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Error</h2>
            <p className="text-sm text-yellow-700 mb-4">{errorMessage}</p>
            
            <div className="space-y-2">
              <button
                onClick={retry}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => {
                  setErrorMessage('')
                  setPotId(null)
                  setShowSuccess(false)
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-md text-sm transition-all flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showSuccess && potId) {
    return (
      <div className="space-y-4">
        {/* Success Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-3 mx-auto">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Pot Created! 🎉</h1>
          <p className="text-sm text-blue-700">{amount} USDC pot is live</p>
        </div>

        {/* Share Actions */}
        <div className="bg-white/70 backdrop-blur-xl rounded-md p-4 border border-white/20">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Share Your Pot</h2>
          
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg inline-block text-center mb-2"
          >
            <div className="flex items-center justify-center space-x-2">
              <Share2 className="w-4 h-4" />
              <span>Share on Warpcast</span>
            </div>
          </a>
          
          <button
            onClick={() => {
              navigator.clipboard.writeText(claimUrl)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className={`w-full font-medium py-2.5 px-4 rounded-md text-sm transition-all ${
              copied 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Pot Details */}
        <div className="bg-white/70 backdrop-blur-xl rounded-md p-3 border border-white/20 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Amount</span>
            <span className="font-semibold text-gray-900">{amount} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Standard Claim</span>
            <span className="font-semibold text-gray-900">0.01 USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Max Claims</span>
            <span className="font-semibold text-gray-900">~{Math.floor(amount / 0.01)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Timeout</span>
            <span className="font-semibold text-gray-900">{Math.floor(timeout / 3600)}h</span>
          </div>
          
          {isPotIdPending ? (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                <p className="text-xs text-gray-600">Confirming...</p>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-600 mb-1">Pot ID</p>
              <p className="text-gray-700 break-all font-mono bg-gray-50 p-2 rounded">{potId}</p>
              <a 
                href={`https://basescan.org/tx/${potId.startsWith('0x') && potId.length === 66 ? potId : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs mt-1 inline-block"
              >
                View on BaseScan →
              </a>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50/50 border border-blue-200/50 rounded-md p-3">
          <h3 className="text-xs font-semibold text-blue-900 mb-2">How it Works</h3>
          <div className="space-y-1 text-xs text-blue-700">
            <p>• Users engage (like, comment, recast)</p>
            <p>• Each claim: 0.01 USDC + jackpot chance</p>
            <p>• One lucky winner gets the jackpot</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Link
            href="/view"
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg text-center"
          >
            View My Pots
          </Link>
          
          <button
            onClick={() => {
              setShowSuccess(false)
              setPotId(null)
              setAmount(1)
              setPostId('')
            }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-md text-sm transition-all"
          >
            Create Another
          </button>
        </div>

        {/* Error Modal */}
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => {
            setShowErrorModal(false)
            setErrorMessage('')
          }}
          title="Transaction Failed"
          message={errorMessage}
          onRetry={retry}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Create Pot</h1>
        <p className="text-xs text-gray-600">Set up your USDC jackpot</p>
      </div>
      
      {/* Connect Wallet for Base app */}
      {isBaseApp && !isConnected ? (
        <div className="text-center py-8">
          <Coins className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Connect Wallet</h2>
          <p className="text-sm text-gray-600 mb-4">Connect to create a pot</p>
          <button
            onClick={miniKitConnect}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : isConnected ? (
        <>
          {/* Gas Sponsorship Status */}
          {smartWallet.canSponsorGas && (
            <div className="bg-blue-50/50 backdrop-blur-xl border border-blue-200/50 text-blue-700 px-4 py-3 rounded-md shadow-lg">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <p className="text-sm font-medium">Gas-free transactions enabled</p>
              </div>
            </div>
          )}
          
          {/* Batch Transaction Status */}
          {smartWallet.capabilities.atomicBatch && (
            <div className="bg-blue-50/50 backdrop-blur-xl border border-blue-200/50 text-blue-700 px-4 py-3 rounded-md shadow-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <p className="text-sm font-medium">One-click pot creation available</p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white/70 backdrop-blur-xl rounded-md p-4 border border-white/20 space-y-3">
            <div>
              <label htmlFor="amount" className="block text-gray-900 font-medium mb-1.5 text-xs">
                Jackpot Amount (USDC)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-md border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount"
              />
              <p className="text-gray-500 text-xs mt-1">
                Users claim 0.01 USDC each. Minimum: 1 USDC
              </p>
            </div>
            
            <div>
              <label htmlFor="postId" className="block text-gray-900 font-medium mb-1.5 text-xs">
                Post ID (Cast Hash)
              </label>
              <input
                id="postId"
                name="postId"
                type="text"
                value={postId}
                onChange={(e) => {
                  const input = e.target.value
                  // Automatically extract hash from URLs or use as-is
                  const hash = extractCastHash(input)
                  setPostId(hash)
                }}
                onPaste={(e) => {
                  // Handle paste events specially to extract hash immediately
                  const pastedText = e.clipboardData.getData('text')
                  const hash = extractCastHash(pastedText)
                  if (hash !== pastedText) {
                    e.preventDefault()
                    setPostId(hash)
                  }
                }}
                className="w-full p-2.5 rounded-md border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste Base URL (base.app/post/...) or cast hash"
              />
              <p className="text-gray-500 text-xs mt-1">
                {postId 
                  ? `✓ Cast: ${postId.slice(0, 12)}...${postId.slice(-6)}` 
                  : "Paste Base URL or cast hash to verify engagement"}
              </p>
            </div>
            
            <div>
              <label htmlFor="timeout" className="block text-gray-900 font-medium mb-1.5 text-xs">
                Timeout (seconds)
              </label>
              <input
                id="timeout"
                name="timeout"
                type="number"
                value={timeout}
                onChange={(e) => setTimeoutSecs(Number(e.target.value))}
                className="w-full p-2.5 rounded-md border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="43200"
              />
              <p className="text-gray-500 text-xs mt-1">
                Default: 43,200 seconds (12 hours)
              </p>
            </div>

            {/* Engagement Requirements */}
            <div>
              <label className="block text-gray-900 font-medium mb-2 text-xs">
                Claim Requirements
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireLike}
                    onChange={(e) => setRequireLike(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Require Like</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireRecast}
                    onChange={(e) => setRequireRecast(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Require Recast</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireComment}
                    onChange={(e) => setRequireComment(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Require Comment</span>
                </label>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Users must complete selected actions to claim
              </p>
            </div>
          </div>

          {/* Validation warnings */}
          {amount < 0.02 && (
            <div className="bg-yellow-500/10 border border-yellow-200/50 text-yellow-700 px-3 py-2 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-xs">Minimum amount: 0.02 USDC</p>
              </div>
            </div>
          )}
          {!postId && (
            <div className="bg-yellow-500/10 border border-yellow-200/50 text-yellow-700 px-3 py-2 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-xs">Post ID required</p>
              </div>
            </div>
          )}

          {/* Network Warning for Base app */}
          {isBaseApp && !isOnBase && (
            <div className="bg-yellow-500/10 border border-yellow-200/50 text-yellow-700 px-3 py-2 rounded-md">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-xs">Switch to Base Network</p>
              </div>
              <button
                onClick={switchToBase}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-3 rounded-md text-xs transition-all"
              >
                Switch Network
              </button>
            </div>
          )}

          {/* Single Create Button */}
          <button
            onClick={handleCreatePot}
            disabled={
              (isBaseApp ? (baseAppApproving || baseAppCreating) : (isApproving || isCreating)) || 
              amount < 0.02 || 
              !postId ||
              (isBaseApp && !isOnBase)
            }
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium py-3 px-4 rounded-md text-sm transition-all shadow-lg"
          >
            {(isBaseApp ? baseAppApproving : isApproving) ? (
              <span>Step 1/2: Approving USDC...</span>
            ) : (isBaseApp ? baseAppCreating : isCreating) ? (
              <span>Step 2/2: Creating Pot...</span>
            ) : ((isBaseApp && baseAppApproved) || approveSuccess) ? (
              <span>Creating Pot...</span>
            ) : (
              <span>Create Pot</span>
            )}
          </button>

          {/* Progress Indicator */}
          {((isBaseApp ? baseAppApproving : isApproving) || 
            (isBaseApp ? baseAppCreating : isCreating)) && (
            <div className="bg-blue-50/50 border border-blue-200/50 px-3 py-2 rounded-md">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <p className="text-xs text-blue-700">
                  {(isBaseApp ? baseAppApproving : isApproving) 
                    ? 'Please approve USDC in your wallet...' 
                    : 'Please confirm pot creation in your wallet...'}
                </p>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal && !showSuccess}
        onClose={() => {
          setShowErrorModal(false)
          setErrorMessage('')
        }}
        title="Transaction Failed"
        message={errorMessage}
        onRetry={() => {
          setErrorMessage('')
          handleCreatePot()
        }}
      />
    </div>
  )
}
