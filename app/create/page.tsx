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
import { DebugLogger } from '@/app/components/DebugLogger'

export default function Create() {
  const [amount, setAmount] = useState(1)
  const [timeoutHours, setTimeoutHours] = useState(12) // Store in hours for better UX
  const [postId, setPostId] = useState('')
  const [requireLike, setRequireLike] = useState(true) // Default: require like
  const [requireRecast, setRequireRecast] = useState(true) // Default: require recast
  const [requireComment, setRequireComment] = useState(true) // Default: require comment
  
  // Convert hours to seconds for contract
  const timeout = timeoutHours * 3600
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
  const [creationAttempted, setCreationAttempted] = useState(false) // Track if creation has been attempted
  const [showDebugLogger, setShowDebugLogger] = useState(true) // Always show debug logger for now
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
      setCreationAttempted(false) // Reset flag so user can retry
    }
    if (createError) {
      const errorMsg = `Pot creation failed: ${createError.message}`
      setErrorMessage(errorMsg)
      setShowErrorModal(true)
      setBaseAppCreating(false)
      setCreationAttempted(false) // Reset flag so user can retry
    }
  }, [approveError, createError])

  // Auto-proceed to creation after approval success
  useEffect(() => {
    // Only auto-proceed if we just got approval and haven't started creating yet
    const justApproved = (isBaseApp && baseAppApproved) || approveSuccess
    const notYetCreating = !(isBaseApp ? baseAppCreating : isCreating)
    const notYetCreated = !showSuccess
    const noPotId = !potId
    const hasNotAttemptedCreation = !creationAttempted
    
    console.log('🔄 Auto-proceed useEffect triggered:', {
      justApproved,
      notYetCreating,
      notYetCreated,
      noPotId,
      hasNotAttemptedCreation,
      willProceed: justApproved && notYetCreating && notYetCreated && noPotId && hasNotAttemptedCreation
    })
    
    if (justApproved && notYetCreating && notYetCreated && noPotId && hasNotAttemptedCreation) {
      // Automatically start pot creation after approval
      console.log('✅ Approval successful, auto-starting pot creation...')
      setCreationAttempted(true) // Mark that we're attempting creation to prevent retries
      // Refetch allowance before proceeding
      console.log('  - Refetching allowance...')
      refetchAllowance().then(() => {
        console.log('  - Allowance refetched, calling create() in 500ms...')
        setTimeout(() => {
          console.log('  - Timeout elapsed, calling create() now...')
          create()
        }, 500) // Small delay to show approval success
      }).catch(error => {
        console.error('  - Error refetching allowance:', error)
        // Still proceed with creation even if refetch fails
        setTimeout(() => {
          console.log('  - Calling create() despite refetch error...')
          create()
        }, 500)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseAppApproved, approveSuccess, isBaseApp, baseAppCreating, isCreating, showSuccess, potId, creationAttempted])

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
        // Don't show error to user - pot is created successfully on-chain, backend initialization is optional
      }
    } catch (error) {
      console.error('Error initializing pot state:', error)
      // Don't show error to user - pot is created successfully on-chain, backend initialization is optional
    }
  }

  
  async function approve() {
    clearError()
    
    // Check allowance again right before approving (double-check)
    let approvalAmount = usdcAmt
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
      
      // Only approve the incremental amount needed
      if (allowance && allowance > BigInt(0)) {
        const incrementalAmount = usdcAmt - allowance
        console.log('Current allowance:', allowance.toString(), 'Requesting additional:', incrementalAmount.toString())
        approvalAmount = usdcAmt // Still approve for total amount to avoid multiple approvals
      }
    } catch (error) {
      console.error('Error checking allowance before approval:', error)
      // Continue with approval - if allowance check fails, approval will handle it
    }
    
    // Use MiniKit provider in Base app, wagmi elsewhere
    if (isBaseApp && mounted) {
      setBaseAppApproving(true)
      try {
        const provider = miniKitWallet.getProvider()
        if (!provider) {
          setErrorMessage('Wallet not connected properly')
          setShowErrorModal(true)
          setBaseAppApproving(false)
          setCreationAttempted(false) // Reset flag so user can retry
          return
        }

        // Encode the approve function call - only approve the exact amount needed
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [jackpotAddress, approvalAmount]
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
              setShowErrorModal(true)
              setBaseAppApproving(false)
              setCreationAttempted(false) // Reset flag so user can retry
            } else if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              setErrorMessage('Approval is taking longer than expected. Please check your wallet or try again.')
              setShowErrorModal(true)
              setBaseAppApproving(false)
              setCreationAttempted(false) // Reset flag so user can retry
            }
          } catch (error) {
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              setErrorMessage('Approval is taking longer than expected. Please check your wallet or try again.')
              setShowErrorModal(true)
              setBaseAppApproving(false)
              setCreationAttempted(false) // Reset flag so user can retry
            }
          }
        }, 1000)
        
      } catch (error: any) {
        console.error('Approve error:', error)
        // Check if user rejected the transaction
        const isUserRejection = error.message?.toLowerCase().includes('user rejected') || 
                               error.message?.toLowerCase().includes('user denied') ||
                               error.message?.toLowerCase().includes('user cancelled') ||
                               error.code === 4001 || 
                               error.code === 'ACTION_REJECTED'
        
        const errorMsg = isUserRejection 
          ? 'Transaction cancelled. Please try again when ready.' 
          : (error.message || 'Failed to approve USDC')
        
        setErrorMessage(errorMsg)
        setShowErrorModal(true)
        setBaseAppApproving(false)
        setCreationAttempted(false) // Reset flag so user can retry
      }
    } else {
      // Use wagmi for standalone browser
      approveUSDC({ 
        abi: erc20Abi, 
        address: USDC, 
        functionName: 'approve', 
        args: [jackpotAddress, approvalAmount] 
      })
    }
  }
  
  // Main function that handles both approval and creation
  async function handleCreatePot() {
    console.log('🎬 handleCreatePot() called')
    try {
      clearError()
      
      // First, check current allowance
      let sufficientAllowance = false
      
      try {
        console.log('  - Checking current allowance...')
        // Refetch the latest allowance
        const result = await refetchAllowance()
        const allowance = result.data as bigint | undefined
        
        console.log('  - Current allowance:', allowance?.toString(), 'Required:', usdcAmt.toString())
        
        // Check if current allowance is sufficient
        if (allowance && allowance >= usdcAmt) {
          sufficientAllowance = true
          console.log('  ✅ Sufficient allowance already exists, skipping approval')
        } else {
          console.log('  ⚠️ Insufficient allowance, approval needed')
        }
      } catch (error) {
        console.error('  ❌ Error checking allowance:', error)
        // Continue with approval if check fails
      }
      
      // Check if we need approval
      const alreadyApproved = isBaseApp ? baseAppApproved : approveSuccess
      const needsApproval = !sufficientAllowance && !alreadyApproved
      
      console.log('  - Decision:', {
        sufficientAllowance,
        alreadyApproved,
        needsApproval,
        hasAtomicBatch: smartWallet.capabilities.atomicBatch,
        batchLoading: smartWallet.capabilities.isLoading
      })
      
      // Try to use Base Account batch transactions if available
      // Note: handleBatchCreate will check allowance internally and only approve if needed
      if (smartWallet.capabilities.atomicBatch && !smartWallet.capabilities.isLoading) {
        console.log('🚀 Using Base Account batch transaction (will check if approval needed)')
        await handleBatchCreate()
      } else if (needsApproval) {
        console.log('📝 Starting approval process...')
        await approve()
        // create() will be called automatically after approval success
      } else {
        console.log('✨ Approval not needed or already done, starting pot creation directly...')
        await create()
      }
    } catch (error: any) {
      console.error('Unexpected error in handleCreatePot:', error)
      const errorMsg = error.message || 'An unexpected error occurred. Please try again.'
      setErrorMessage(errorMsg)
      setShowErrorModal(true)
      setBaseAppApproving(false)
      setBaseAppCreating(false)
      setCreationAttempted(false)
    }
  }

  // Batch transaction for approve + create (Base Account only)
  async function handleBatchCreate() {
    clearError()
    setBaseAppApproving(true)
    setBaseAppCreating(true)
    
    try {
      // First, check current allowance
      const result = await refetchAllowance()
      const allowance = result.data as bigint | undefined
      const needsApproval = !allowance || allowance < usdcAmt
      
      console.log('Batch create - Current allowance:', allowance?.toString(), 'Required:', usdcAmt.toString(), 'Needs approval:', needsApproval)
      
      const postIdBytes32 = castIdToBytes32(postId)
      
      // Generate random salt for unpredictable pot ID
      const salt = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}` as `0x${string}`
      
      // Prepare batch calls - only include approve if needed
      const calls = []
      
      if (needsApproval) {
        // Only approve the exact amount needed for this pot
        calls.push({
          address: USDC as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [jackpotAddress, usdcAmt]
        })
        console.log('Including approval in batch for:', usdcAmt.toString(), 'USDC')
      }
      
      calls.push({
        address: jackpotAddress as `0x${string}`,
        abi: jackpotAbi,
        functionName: 'createPotWithSalt',
        args: [USDC, usdcAmt, ONE_USDC, timeout, postIdBytes32, requireLike, requireRecast, requireComment, salt]
      })
      
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
      // Check if user rejected the transaction
      const isUserRejection = error.message?.toLowerCase().includes('user rejected') || 
                             error.message?.toLowerCase().includes('user denied') ||
                             error.message?.toLowerCase().includes('user cancelled') ||
                             error.code === 4001 || 
                             error.code === 'ACTION_REJECTED'
      
      const errorMsg = isUserRejection 
        ? 'Transaction cancelled. Please try again when ready.' 
        : (error.message || 'Batch transaction failed')
      
      setErrorMessage(errorMsg)
      setShowErrorModal(true)
      setBaseAppApproving(false)
      setBaseAppCreating(false)
      setCreationAttempted(false) // Reset flag so user can retry
    }
  }

  async function create() {
    console.log('🎯 create() called')
    console.log('  - Current state:', {
      potId,
      showSuccess,
      baseAppCreating,
      isCreating,
      creationAttempted,
      amount,
      postId,
      isBaseApp,
      mounted,
      address
    })
    
    clearError()
    
    // Prevent multiple creation attempts - only check if already successfully created or currently creating
    if (potId || showSuccess) {
      console.log('⚠️ Pot already created, skipping duplicate creation')
      return
    }
    
    // Check if creation is already in progress
    const isCurrentlyCreating = isBaseApp ? baseAppCreating : isCreating
    if (isCurrentlyCreating) {
      console.log('⚠️ Pot creation already in progress')
      return
    }
    
    // Validate pot requirements
    const standardClaimUSDC = 0.01 // ONE_USDC in human-readable format
    const minClaims = 10
    
    if (amount < standardClaimUSDC * minClaims) {
      console.error('❌ Validation failed: amount too small')
      setErrorMessage(`Pot must support at least ${minClaims} claims (minimum ${standardClaimUSDC * minClaims} USDC)`)
      setShowErrorModal(true)
      setCreationAttempted(false) // Reset flag so validation can be fixed and retried
      return
    }
    
    if (standardClaimUSDC > amount / 2) {
      console.error('❌ Validation failed: standard claim too large')
      setErrorMessage('Standard claim cannot exceed 50% of the pot amount')
      setShowErrorModal(true)
      setCreationAttempted(false) // Reset flag so validation can be fixed and retried
      return
    }
    
    // Mark creation as attempted to prevent duplicate auto-triggers from useEffect
    setCreationAttempted(true)
    
    console.log('🚀 Starting pot creation...')
    console.log('  - Environment:', { isBaseApp, mounted })
    
    // Use MiniKit provider in Base app, wagmi elsewhere
    if (isBaseApp && mounted) {
      console.log('📱 Using MiniKit/Base App flow')
      setBaseAppCreating(true)
      try {
        console.log('  - Getting provider...')
        const provider = miniKitWallet.getProvider()
        if (!provider) {
          console.error('❌ No provider found')
          setErrorMessage('Wallet not connected properly')
          setShowErrorModal(true)
          setBaseAppCreating(false)
          setCreationAttempted(false) // Reset flag so user can retry after connecting wallet
          return
        }
        console.log('  ✅ Provider ready')

        // Convert postId to bytes32 for contract
        const postIdBytes32 = castIdToBytes32(postId)
        console.log('  - PostId converted:', postIdBytes32)
        
        // Generate random salt for unpredictable pot ID
        const salt = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')}` as `0x${string}`
        console.log('  - Salt generated:', salt.slice(0, 10) + '...')
        
        // Encode the createPotWithSalt function call for enhanced security
        console.log('  - Encoding function call with params:', {
          token: USDC,
          amount: usdcAmt.toString(),
          standardClaim: ONE_USDC.toString(),
          timeout,
          requireLike,
          requireRecast,
          requireComment
        })
        const data = encodeFunctionData({
          abi: jackpotAbi,
          functionName: 'createPotWithSalt',
          args: [USDC, usdcAmt, ONE_USDC, timeout, postIdBytes32, requireLike, requireRecast, requireComment, salt]
        })
        console.log('  ✅ Function encoded')

        console.log('📤 Sending createPot transaction via MiniKit...')
        console.log('  - To:', jackpotAddress)
        console.log('  - From:', address)
        
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: jackpotAddress,
            data: data,
          }]
        })

        console.log('✅ CreatePot transaction sent successfully!')
        console.log('  - TX Hash:', txHash)
        
        // Show initial success with txHash - stop showing creating state immediately
        console.log('  - Setting success state and stopping loading...')
        
        // CRITICAL: Update all states in batch to show success screen
        // First, set the pot ID
        setPotId(txHash)
        setIsPotIdPending(true)
        
        // Then immediately set success and stop loading
        // Using queueMicrotask to ensure state updates are batched
        queueMicrotask(() => {
          setBaseAppCreating(false)
          setShowSuccess(true)
          console.log('  ✅ Success state confirmed:', { showSuccess: true, potId: txHash, baseAppCreating: false })
        })
        
        // Use public RPC client to poll for receipt (MiniKit provider doesn't support eth_getTransactionReceipt)
        console.log('⏳ Waiting for transaction to be mined...')
        console.log('  - Setting up public client for receipt polling')
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        })
        console.log('  ✅ Public client ready, starting to poll...')
        
        let attempts = 0
        const maxAttempts = 60 // 60 seconds max (increased from 30)
        const pollInterval = setInterval(async () => {
          attempts++
          console.log(`  📊 Poll attempt ${attempts}/${maxAttempts}`)
          try {
            const receipt = await publicClient.getTransactionReceipt({
              hash: txHash as `0x${string}`
            })
            console.log('  - Receipt received:', receipt ? 'Found' : 'Not found yet')
            
            if (receipt && receipt.status === 'success') {
              // Transaction successful, extract potId
              clearInterval(pollInterval)
              console.log('✅ Transaction mined successfully!')
              console.log('  - Receipt:', receipt)
              console.log('  - Logs count:', receipt.logs?.length)
              
              if (receipt.logs && receipt.logs.length > 0) {
                console.log('  - Searching for PotCreated event...')
                // Find the PotCreated event (first indexed topic after event signature)
                const potCreatedLog = receipt.logs.find((log: any) => 
                  log.address.toLowerCase() === jackpotAddress.toLowerCase() &&
                  log.topics.length >= 2
                )
                console.log('  - PotCreated log found:', !!potCreatedLog)
                
                if (potCreatedLog && potCreatedLog.topics[1]) {
                  const realPotId = potCreatedLog.topics[1]
                  console.log('🎯 Real pot ID extracted:', realPotId)
                  setPotId(realPotId)
                  setIsPotIdPending(false)
                  
                  // Initialize pot state
                  console.log('  - Initializing pot state in backend...')
                  initializePotState(realPotId, amount)
                } else {
                  console.warn('⚠️ Could not find PotCreated event in logs')
                }
              } else {
                console.warn('⚠️ No logs in receipt')
              }
              console.log('  - Setting baseAppCreating to false')
              setBaseAppCreating(false)
            } else if (receipt && receipt.status === 'reverted') {
              // Transaction failed
              clearInterval(pollInterval)
              console.error('❌ Transaction failed')
              setErrorMessage('Transaction failed. Please try again.')
              setShowErrorModal(true)
              setShowSuccess(false)
              setBaseAppCreating(false)
              setCreationAttempted(false) // Reset flag so user can retry
            }
          } catch (error: any) {
            // Receipt not yet available, continue polling
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              console.warn('⏱️ Transaction still pending after 60 seconds')
              // Transaction was sent successfully, just taking long to mine
              // Keep success screen visible, just stop the "Confirming..." spinner
              console.log('  - Timeout reached, stopping spinner but keeping success screen')
              setIsPotIdPending(false)
              // Don't show error modal - transaction is still valid, just slow
              // User can still share the transaction hash and check BaseScan
            }
          }
        }, 1000) // Poll every second
        
      } catch (error: any) {
        console.error('❌ CreatePot error:', error)
        console.error('  - Error code:', error.code)
        console.error('  - Error message:', error.message)
        console.error('  - Full error:', JSON.stringify(error, null, 2))
        
        // Check if user rejected the transaction
        const isUserRejection = error.message?.toLowerCase().includes('user rejected') || 
                               error.message?.toLowerCase().includes('user denied') ||
                               error.message?.toLowerCase().includes('user cancelled') ||
                               error.code === 4001 || 
                               error.code === 'ACTION_REJECTED'
        
        const errorMsg = isUserRejection 
          ? 'Transaction cancelled. Please try again when ready.' 
          : (error.message || 'Failed to create pot')
        
        console.error('  - Setting error states:', { errorMsg, isUserRejection })
        
        // Reset all states on error
        setBaseAppCreating(false)
        setShowSuccess(false)
        setPotId(null)
        setCreationAttempted(false) // Reset flag so user can retry
        
        // Show error
        setErrorMessage(errorMsg)
        setShowErrorModal(true)
      }
    } else {
      // Convert postId to bytes32 for contract
      const postIdBytes32 = castIdToBytes32(postId)
      
      // Generate random salt for unpredictable pot ID
      const salt = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}` as `0x${string}`
      
      // Use wagmi for standalone browser with enhanced security
      createPotContract({
        abi: jackpotAbi, 
        address: jackpotAddress, 
        functionName: 'createPotWithSalt',
        args: [USDC, usdcAmt, ONE_USDC, timeout, postIdBytes32, requireLike, requireRecast, requireComment, salt]
      })
    }
  }

  // Retry function for failed pot creation
  function retry() {
    setErrorMessage('')
    setPotId(null)
    setShowSuccess(false)
    setCreationAttempted(false) // Reset creation attempted flag for retry
    setBaseAppApproved(false) // Reset approval state for retry
    setBaseAppApproving(false)
    setBaseAppCreating(false)
  }

  // Generate shareable URLs
  const claimUrl = potId ? `${getAppDomain()}/claim/${potId}` : ''
  const shareUrl = claimUrl
    ? getShareCastUrl(
        `🎯 Claim my ${amount} USDC PotFi pot! Get 0.01 USDC per claim or hit the jackpot! 🎰`,
        claimUrl
      )
    : ''

  console.log('🎨 Render state:', {
    mounted,
    errorMessage: !!errorMessage,
    showSuccess,
    potId: potId ? potId.slice(0, 10) + '...' : null,
    baseAppCreating,
    baseAppApproving,
    isCreating,
    isApproving,
    willShowSuccess: showSuccess && potId,
    willShowError: !!errorMessage,
    willShowForm: !showSuccess && !errorMessage
  })

  if (!mounted) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm font-medium text-gray-600">Loading...</p>
      </div>
    )
  }

  // Show error state
  if (errorMessage) {
    console.log('🚨 Rendering error screen:', errorMessage)
    return (
      <div className="space-y-4">
        <div className="bg-gold/10 border border-gold/30 rounded-md p-4 shadow-card">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-gold-dark mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Error</h2>
            <p className="text-sm font-medium text-gray-700 mb-4">{errorMessage}</p>
            
            <div className="space-y-2">
              <button
                onClick={retry}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm flex items-center justify-center space-x-2 btn-uppercase"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => {
                  setErrorMessage('')
                  setPotId(null)
                  setShowSuccess(false)
                  setCreationAttempted(false) // Reset creation attempted flag
                  setBaseAppApproved(false) // Reset approval state
                  setBaseAppApproving(false)
                  setBaseAppCreating(false)
                }}
                className="w-full bg-gray-800/90 hover:bg-gray-900 text-white font-semibold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm flex items-center justify-center space-x-2 btn-uppercase"
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

  // Success screen
  if (showSuccess && potId) {
    console.log('✨✨✨ RENDERING SUCCESS SCREEN ✨✨✨')
    console.log('  - potId:', potId)
    console.log('  - showSuccess:', showSuccess)
    console.log('  - claimUrl:', claimUrl)
    console.log('  - shareUrl:', shareUrl ? 'Generated' : 'Empty')
    console.log('  - amount:', amount)
    return (
      <div className="space-y-4">
        {/* Success Header */}
        <div className="text-center">
          <div className="w-16 h-16 gradient-hero rounded-md flex items-center justify-center mb-3 mx-auto shadow-lg">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Pot Created! 🎉</h1>
          <p className="text-sm font-semibold text-primary font-mono tabular-nums">{amount} USDC pot is live</p>
        </div>

        {/* Share Actions */}
        <div className="bg-card backdrop-blur-xl rounded-md p-4 border border-gray-200 shadow-card">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Share Your Pot</h2>
          
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm inline-block text-center mb-2 btn-uppercase"
          >
            <div className="flex items-center justify-center space-x-2">
              <Share2 className="w-4 h-4" />
              <span>Share on Base app</span>
            </div>
          </a>
          
          <button
            onClick={() => {
              navigator.clipboard.writeText(claimUrl)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className={`w-full font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm btn-uppercase ${
              copied 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                : 'bg-gray-800/90 hover:bg-gray-900 text-white'
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
        <div className="bg-card backdrop-blur-xl rounded-md p-3 border border-gray-200 space-y-2 text-xs shadow-card">
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Amount</span>
            <span className="font-bold text-gray-900 font-mono tabular-nums">{amount} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Standard Claim</span>
            <span className="font-bold text-gray-900 font-mono tabular-nums">0.01 USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Max Claims</span>
            <span className="font-bold text-gray-900 font-mono tabular-nums">~{Math.floor(amount / 0.01)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Duration</span>
            <span className="font-bold text-gray-900 font-mono tabular-nums">{timeoutHours}h</span>
          </div>
          
          {isPotIdPending ? (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <RefreshCw className="w-3 h-3 text-primary animate-spin" />
                <p className="text-xs font-medium text-gray-600">Confirming on blockchain...</p>
              </div>
              <p className="text-xs text-gray-500">Your pot is being created. You can share it now!</p>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-200">
              <p className="font-medium text-gray-600 mb-1">
                {potId && potId.length === 66 ? 'Transaction Hash' : 'Pot ID'}
              </p>
              <p className="text-gray-700 break-all font-mono bg-gray-50 p-2 rounded text-xs">{potId}</p>
              <a 
                href={`https://basescan.org/tx/${potId.startsWith('0x') && potId.length === 66 ? potId : potId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-dark font-semibold text-xs mt-1 inline-block"
              >
                View on BaseScan →
              </a>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3 shadow-card">
          <h3 className="text-xs font-bold text-gray-900 mb-2">How it Works</h3>
          <div className="space-y-1 text-xs font-medium text-gray-700">
            <p>• Users engage (like, comment, recast)</p>
            <p>• Each claim: 0.01 USDC + jackpot chance</p>
            <p>• One lucky winner gets the jackpot</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Link
            href="/view"
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm text-center btn-uppercase"
          >
            View My Pots
          </Link>
          
          <button
            onClick={() => {
              setShowSuccess(false)
              setPotId(null)
              setAmount(1)
              setPostId('')
              setCreationAttempted(false) // Reset creation attempted flag
              setBaseAppApproved(false) // Reset approval state
              setBaseAppApproving(false)
              setBaseAppCreating(false)
            }}
            className="w-full bg-gray-800/90 hover:bg-gray-900 text-white font-medium py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm btn-uppercase"
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

  // If we reach here, we're showing the create form
  console.log('📝 Rendering CREATE FORM')
  console.log('  - Why not success? showSuccess:', showSuccess, 'potId:', potId ? potId.slice(0, 10) + '...' : 'null')
  console.log('  - Why not error? errorMessage:', errorMessage || 'none')
  console.log('  - Loading states: baseAppCreating:', baseAppCreating, 'baseAppApproving:', baseAppApproving)
  
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
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm btn-uppercase"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : isConnected ? (
        <>
          {/* Gas Sponsorship Status */}
          {smartWallet.canSponsorGas && (
            <div className="bg-primary/5 backdrop-blur-xl border border-primary/20 text-gray-900 px-4 py-3 rounded-md shadow-card">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Gas-free transactions enabled</p>
              </div>
            </div>
          )}
          
          {/* Batch Transaction Status */}
          {smartWallet.capabilities.atomicBatch && (
            <div className="bg-primary/5 backdrop-blur-xl border border-primary/20 text-gray-900 px-4 py-3 rounded-md shadow-card">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">One-click pot creation available</p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white/70 backdrop-blur-xl rounded-md p-4 border border-white/20 space-y-4">
            {/* Amount Input with Presets */}
            <div>
              <label htmlFor="amount" className="block text-gray-900 font-bold mb-2 text-sm">
                Jackpot Amount (USDC)
              </label>
              
              {/* Preset Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[1, 5, 10, 25].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`py-2.5 px-3 rounded-md text-sm font-bold transition-all duration-200 transform active:scale-95 ${
                      amount === preset
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'bg-white/80 border-2 border-gray-300 text-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              
              {/* Custom Amount Input */}
              <input
                id="amount"
                name="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-3 rounded-md border-2 border-gray-300 text-gray-900 text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Or enter custom amount"
                min="0.1"
                step="0.1"
              />
              
              {/* Validation Hints */}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600">
                  • Minimum: 0.1 USDC (supports 10 claims)
                </p>
                <p className="text-xs text-gray-600">
                  • Each claim: 0.01 USDC
                </p>
                <p className="text-xs text-gray-600">
                  • Maximum claims: {Math.min(Math.floor(amount / 0.01), 200)}
                </p>
              </div>
            </div>
            
            {/* Post ID Input */}
            <div>
              <label htmlFor="postId" className="block text-gray-900 font-bold mb-2 text-sm">
                Post Link or Cast Hash
              </label>
              <textarea
                id="postId"
                name="postId"
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
                rows={3}
                className="w-full p-3 rounded-md border-2 border-gray-300 text-gray-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                placeholder="Paste your Base post URL here...&#10;&#10;Example: base.app/post/0x..."
              />
              {postId ? (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs font-semibold text-blue-700 mb-1">✓ Cast Detected</p>
                  <p className="text-xs text-blue-600 font-mono break-all">
                    {postId.slice(0, 20)}...{postId.slice(-12)}
                  </p>
                </div>
              ) : (
                <p className="text-gray-600 text-xs mt-2 font-medium">
                  🔗 Paste your Base URL (base.app/post/...) or cast hash
                </p>
              )}
            </div>
            
            {/* Timeout Input with Presets */}
            <div>
              <label htmlFor="timeout" className="block text-gray-900 font-bold mb-2 text-sm">
                Duration (Hours)
              </label>
              
              {/* Preset Timeout Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { hours: 6, label: '6h' },
                  { hours: 12, label: '12h' },
                  { hours: 24, label: '24h' },
                  { hours: 48, label: '48h' }
                ].map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => setTimeoutHours(preset.hours)}
                    className={`py-2.5 px-3 rounded-md text-sm font-bold transition-all duration-200 transform active:scale-95 ${
                      timeoutHours === preset.hours
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'bg-white/80 border-2 border-gray-300 text-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              
              {/* Custom Hours Input */}
              <input
                id="timeout"
                name="timeout"
                type="number"
                value={timeoutHours}
                onChange={(e) => setTimeoutHours(Number(e.target.value))}
                className="w-full p-3 rounded-md border-2 border-gray-300 text-gray-900 text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Or enter custom hours"
                min="1"
                step="1"
              />
              <p className="text-gray-600 text-xs mt-2 font-medium">
                ⏱️ How long users can claim before pot expires
              </p>
            </div>

            {/* Engagement Requirements with Toggle Switches */}
            <div>
              <label className="block text-gray-900 font-bold mb-3 text-sm">
                Claim Requirements
              </label>
              <div className="space-y-3">
                {/* Like Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/80 border-2 border-gray-300 rounded-md">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">👍</span>
                    <span className="text-sm font-semibold text-gray-900">Require Like</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireLike(!requireLike)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      requireLike ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-md bg-white shadow-lg transition-transform duration-200 ${
                        requireLike ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Recast Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/80 border-2 border-gray-300 rounded-md">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">🔄</span>
                    <span className="text-sm font-semibold text-gray-900">Require Recast</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireRecast(!requireRecast)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      requireRecast ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-md bg-white shadow-lg transition-transform duration-200 ${
                        requireRecast ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Comment Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/80 border-2 border-gray-300 rounded-md">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">💬</span>
                    <span className="text-sm font-semibold text-gray-900">Require Comment</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireComment(!requireComment)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      requireComment ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-md bg-white shadow-lg transition-transform duration-200 ${
                        requireComment ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-xs mt-3 font-medium">
                📋 Users must complete selected actions to claim
              </p>
            </div>
          </div>

          {/* Validation warnings */}
          {amount < 0.1 && (
            <div className="bg-gold/10 border border-gold/30 text-gray-900 px-3 py-2 rounded-md shadow-card">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-gold-dark" />
                <p className="text-xs">Minimum amount: 0.1 USDC (10 claims)</p>
              </div>
            </div>
          )}
          {!postId && (
            <div className="bg-gold/10 border border-gold/30 text-gray-900 px-3 py-2 rounded-md shadow-card">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-gold-dark" />
                <p className="text-xs">Post ID required</p>
              </div>
            </div>
          )}

          {/* Network Warning for Base app */}
          {isBaseApp && !isOnBase && (
            <div className="bg-gold/10 border border-gold/30 text-gray-900 px-3 py-2 rounded-md shadow-card">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gold-dark" />
                <p className="text-xs font-semibold">Switch to Base Network</p>
              </div>
              <button
                onClick={switchToBase}
                className="w-full relative py-2 px-3 rounded-lg text-xs font-bold btn-uppercase transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #B8941F 0%, #D4AF37 20%, #D4AF37 80%, #A67C00 100%)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.4)',
                  border: '1px solid #8B7310',
                  borderTop: '1px solid #D4AF37',
                  borderBottom: '1px solid #705D0C',
                  color: '#2A1F00',
                  textShadow: '0 1px 1px rgba(255, 215, 0, 0.3)'
                }}
              >
                <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.3) 48%, rgba(212, 175, 55, 0.3) 52%, transparent 100%)' }}></div>
                <span className="relative">Switch Network</span>
              </button>
            </div>
          )}

          {/* Single Create Button */}
          <button
            onClick={handleCreatePot}
            disabled={
              (isBaseApp ? (baseAppApproving || baseAppCreating) : (isApproving || isCreating)) || 
              amount < 0.1 || 
              !postId ||
              (isBaseApp && !isOnBase)
            }
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-400 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm btn-uppercase"
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
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-4 border border-white/20 shadow-card">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Transaction Progress</h3>
              
              <div className="space-y-3">
                {/* Step 1: Approval */}
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    (isBaseApp ? baseAppApproved : approveSuccess) 
                      ? 'bg-blue-500' 
                      : (isBaseApp ? baseAppApproving : isApproving)
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-300'
                  }`}>
                    {(isBaseApp ? baseAppApproved : approveSuccess) ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (isBaseApp ? baseAppApproving : isApproving) ? (
                      <RefreshCw className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <span className="text-white text-xs font-bold">1</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {(isBaseApp ? baseAppApproved : approveSuccess) ? '✓ ' : ''}
                      Approve USDC
                    </p>
                    <p className="text-xs text-gray-600">
                      {(isBaseApp ? baseAppApproving : isApproving) 
                        ? 'Waiting for wallet confirmation...'
                        : (isBaseApp ? baseAppApproved : approveSuccess)
                        ? 'Approved successfully'
                        : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Step 2: Create Pot */}
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    showSuccess 
                      ? 'bg-blue-500' 
                      : (isBaseApp ? baseAppCreating : isCreating)
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-300'
                  }`}>
                    {showSuccess ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (isBaseApp ? baseAppCreating : isCreating) ? (
                      <RefreshCw className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <span className="text-white text-xs font-bold">2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {showSuccess ? '✓ ' : ''}
                      Create Pot
                    </p>
                    <p className="text-xs text-gray-600">
                      {(isBaseApp ? baseAppCreating : isCreating) 
                        ? 'Sending transaction...'
                        : showSuccess
                        ? 'Pot created successfully!'
                        : 'Waiting for approval'}
                    </p>
                  </div>
                </div>
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

      {/* Debug Logger - Always visible during development */}
      {showDebugLogger && <DebugLogger />}
    </div>
  )
}
