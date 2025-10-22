'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { jackpotAbi, jackpotAddress } from '@/lib/contracts'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { useSmartWallet } from '@/hooks/useSmartWallet'
import { getPaymasterCapability } from '@/lib/paymaster'
import { detectBaseAppEnvironment } from '@/lib/environment'
import { extractCastHash } from '@/lib/utils'
import { sdk } from '@farcaster/miniapp-sdk'
import { pad, createWalletClient, custom, PublicClient, createPublicClient, http, encodeFunctionData } from 'viem'
import { base } from 'viem/chains'
import { miniKitWallet } from '@/lib/minikit-wallet'
import { Coins, Target, AlertTriangle, CheckCircle, Wifi, X, XCircle, Wallet, ExternalLink, Zap, Share2 } from 'lucide-react'
import Link from 'next/link'
import { ErrorModal } from '@/app/components/ErrorModal'
import { DebugLogger } from '@/app/components/DebugLogger'

export default function Claim() {
  const { id } = useParams() as { id: `0x${string}` }
  const [busy, setBusy] = useState(false)
  const [castId, setCastId] = useState('')
  const [fid, setFid] = useState<string>('')
  const [isBaseApp, setIsBaseApp] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [jackpotInfo, setJackpotInfo] = useState<any>(null)
  const [showJackpotModal, setShowJackpotModal] = useState(false)
  
  // Show debug logger only when NEXT_PUBLIC_DEBUG_LOGS is set to "true"
  const showDebugLogger = process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true'
  const [showClaimSuccessModal, setShowClaimSuccessModal] = useState(false)
  const [claimedAmount, setClaimedAmount] = useState<string>('0.01')
  const [potDetails, setPotDetails] = useState<any>(null)
  const [loadingPot, setLoadingPot] = useState(true)
  const [showErrorModal, setShowErrorModal] = useState(false)
  
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
  
  // Smart wallet with Base Account capabilities
  const smartWallet = useSmartWallet(isBaseApp)

  useEffect(() => {
    setMounted(true)
    
    // Detect Base app environment
    const env = detectBaseAppEnvironment()
    setIsBaseApp(env.isBaseApp)

    // Auto-detect castId from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const castIdFromUrl = urlParams.get('castId')
    if (castIdFromUrl && castIdFromUrl !== 'unknown' && castIdFromUrl !== 'auto-detect') {
      setCastId(castIdFromUrl)
    }

    // Try to get cast context from SDK if in Base app
    // Base app supports Farcaster protocol via Coinbase Smart Wallet
    if (env.isBaseApp && (!castIdFromUrl || castIdFromUrl === 'auto-detect')) {
      const getCastContext = async () => {
        try {
          const context = await sdk.context
          console.log('📱 Base app context:', context)
          
          // Check if launched from a cast context
          if (context?.location?.type === 'cast_embed' || context?.location?.type === 'cast_share') {
            const castHash = context.location.cast?.hash
            if (castHash) {
              setCastId(castHash)
              console.log('✅ Auto-detected castId from Base app:', castHash)
            }
          }
          
          // Get user FID from context
          if (context?.user?.fid) {
            setFid(context.user.fid.toString())
            console.log('✅ Auto-detected FID from Base app:', context.user.fid)
          }
        } catch (error) {
          console.log('ℹ️ Could not get cast context from SDK:', error)
        }
      }
      getCastContext()
    }

    // Fetch pot details to check if it's active
    const fetchPotDetails = async () => {
      try {
        setLoadingPot(true)
        const response = await fetch('/api/pots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ potId: id })
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          setPotDetails(data)
          console.log('Pot details:', data)
          
          // Auto-populate cast ID if available
          if (data.castId && !castId) {
            setCastId(data.castId)
            console.log('✅ Auto-populated cast ID from pot:', data.castId)
          }
        } else {
          setErrorMessage('Failed to load pot details')
        }
      } catch (error) {
        console.error('Error fetching pot details:', error)
        setErrorMessage('Failed to load pot details')
      } finally {
        setLoadingPot(false)
      }
    }
    
    fetchPotDetails()
  }, [id])

  // Use MiniKit in Base app, fallback to wagmi in browser
  const address = isBaseApp ? miniKitAddress : wagmiAddress
  const isConnected = isBaseApp ? miniKitConnected : wagmiConnected
  const connect = isBaseApp ? miniKitConnect : () => wagmiConnect({ connector: injected() })
  const disconnect = isBaseApp ? miniKitDisconnect : wagmiDisconnect
  const displayAddress = isBaseApp ? truncatedAddress : (wagmiAddress?.slice(0, 6) + '...' + wagmiAddress?.slice(-4))
  
  // Get paymaster capabilities for sponsored gas
  const paymasterCapability = useMemo(() => {
    if (smartWallet.canSponsorGas && smartWallet.chainId) {
      return getPaymasterCapability(smartWallet.chainId)
    }
    return undefined
  }, [smartWallet.canSponsorGas, smartWallet.chainId])

  const { writeContract, data: txHash, error: writeError } = useWriteContract()
  const { isLoading: isClaiming, isSuccess: txSuccess, error: txError } = useWaitForTransactionReceipt({ hash: txHash })
  
  // For MiniKit transactions
  const [miniKitTxHash, setMiniKitTxHash] = useState<`0x${string}` | null>(null)
  const { isLoading: isMiniKitTxPending, isSuccess: miniKitTxSuccess, error: miniKitTxError } = useWaitForTransactionReceipt({ 
    hash: miniKitTxHash || undefined 
  })
  
  // Unified transaction status
  const isTransactionPending = isBaseApp ? isMiniKitTxPending : isClaiming
  const transactionSuccess = isBaseApp ? miniKitTxSuccess : txSuccess
  const transactionError = isBaseApp ? miniKitTxError : txError
  
  // Handle transaction completion
  useEffect(() => {
    if (transactionSuccess) {
      setErrorMessage('')
      setBusy(false)
      
      // Set claimed amount based on jackpot or standard claim
      if (jackpotInfo?.isJackpot) {
        setClaimedAmount(jackpotInfo.amount || potDetails?.remainingAmount?.toString() || '0')
        setShowJackpotModal(true)
      } else {
        setClaimedAmount('0.01') // Standard claim
      }
      
      // Always show success modal after claim
      setShowClaimSuccessModal(true)
      
      console.log('✅ Transaction successful!', isBaseApp ? miniKitTxHash : txHash)
      console.log('Jackpot info:', jackpotInfo)
    }
    if (transactionError || writeError) {
      const error = transactionError?.message || writeError?.message || 'Transaction failed'
      setErrorMessage(error)
      setShowErrorModal(true)
      setBusy(false)
      console.error('Transaction error:', transactionError || writeError)
    }
  }, [transactionSuccess, transactionError, writeError, txHash, miniKitTxHash, jackpotInfo, isBaseApp])

  async function claim() {
    setBusy(true)
    setErrorMessage('') // Clear previous errors
    
    try {
      // Call API to verify like+comment+recast → get {deadline, castId, signature}
      const res = await fetch(`/api/gate/permit`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          potId: id, 
          claimerAddress: address, 
          castId,
          fid: fid || undefined // Include FID if available
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        // Handle API errors (403, 404, etc.)
        setErrorMessage(data.error || `Error: ${res.status} ${res.statusText}`)
        setShowErrorModal(true)
        setBusy(false)
        return
      }
      
      const { deadline, castId: castOut, signature, jackpot } = data
      
      // Store jackpot information
      if (jackpot) {
        setJackpotInfo(jackpot)
        console.log('Jackpot info received:', jackpot)
      }
      
      // Pad potId and castId to bytes32 (same as backend)
      const potIdBytes32 = pad(id, { size: 32 })
      const castIdBytes32 = pad(castOut as `0x${string}`, { size: 32 })
      
      // Generate random userSecret for unpredictable jackpot determination
      const userSecret = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}` as `0x${string}`
      
      console.log('Calling writeContract with:', {
        potId: id,
        potIdBytes32,
        deadline,
        castId: castOut,
        castIdBytes32,
        signature,
        userSecret: userSecret.slice(0, 10) + '...',
        jackpotAddress
      })
      
      if (isBaseApp) {
        // Use MiniKit provider for Base app transactions
        try {
          const provider = miniKitWallet.getProvider()
          if (!provider) {
            throw new Error('MiniKit provider not available')
          }
          
          // Check if we can use sponsored gas with Base Account
          if (smartWallet.canSponsorGas && paymasterCapability) {
            console.log('🚀 Using sponsored gas transaction')
            
            // Try to use wallet_sendCalls for sponsored transaction
            try {
              const callData = encodeFunctionData({
                abi: jackpotAbi,
                functionName: 'claim',
                args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`, userSecret]
              })
              
              const batchTxId = await provider.request({
                method: 'wallet_sendCalls',
                params: [{
                  version: '1.0',
                  chainId: '0x2105', // Base mainnet
                  from: address,
                  calls: [{
                    to: jackpotAddress,
                    data: callData
                  }],
                  capabilities: paymasterCapability
                }]
              })
              
              console.log('✅ Sponsored transaction submitted:', batchTxId)
              setMiniKitTxHash(batchTxId as `0x${string}`)
            } catch (sponsorError: any) {
              console.log('Sponsored transaction failed, falling back to regular transaction:', sponsorError.message)
              
              // Fallback to regular transaction
              const walletClient = createWalletClient({
                account: address as `0x${string}`,
                chain: base,
                transport: custom(provider)
              })
              
              const hash = await walletClient.writeContract({
                abi: jackpotAbi,
                address: jackpotAddress,
                functionName: 'claim',
                args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`, userSecret]
              })
              
              console.log('MiniKit transaction submitted:', hash)
              setMiniKitTxHash(hash)
            }
          } else {
            // Regular transaction without gas sponsorship
            const walletClient = createWalletClient({
              account: address as `0x${string}`,
              chain: base,
              transport: custom(provider)
            })
            
            const hash = await walletClient.writeContract({
              abi: jackpotAbi,
              address: jackpotAddress,
              functionName: 'claim',
              args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`, userSecret]
            })
            
            console.log('MiniKit transaction submitted:', hash)
            setMiniKitTxHash(hash)
          }
        } catch (error: any) {
          console.error('MiniKit transaction error:', error)
          const errorMsg = error.message || 'Transaction failed'
          setErrorMessage(errorMsg)
          setShowErrorModal(true)
          setBusy(false)
        }
      } else {
        // Use wagmi for standalone browser transactions
        writeContract({
          abi: jackpotAbi, 
          address: jackpotAddress, 
          functionName: 'claim',
          args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`, userSecret]
        })
      }
      
      // Don't set busy to false immediately - let the transaction complete
      // The busy state will be managed by the transaction status
      
    } catch (error: any) {
      console.error('Claim error:', error)
      const errorMsg = error?.message || 'Network error. Please try again.'
      setErrorMessage(errorMsg)
      setShowErrorModal(true)
      setBusy(false) // Only set false on API error
    }
  }

  if (!mounted) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm font-medium text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
          {/* Compact Header */}
          <div>
            <h1 className="text-xl font-bold text-gray-900">Claim Pot Reward</h1>
            <p className="text-xs text-gray-600 font-mono">#{id?.slice(0, 16)}...</p>
          </div>

          {loadingPot ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-xs font-medium text-gray-600">Loading pot...</p>
            </div>
          ) : potDetails && !potDetails.active ? (
            <div className="bg-gold/10 border border-gold/30 rounded-md p-4 shadow-card">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-gold-dark mx-auto mb-3" />
                <h2 className="text-lg font-bold text-yellow-700 mb-1">Pot Inactive</h2>
                <p className="text-sm text-yellow-600 mb-3">
                  {potDetails.remainingAmount === 0 
                    ? 'Fully claimed!' 
                    : 'Closed by creator'}
                </p>
                <div className="bg-white/50 rounded-md p-3 mb-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Pot</span>
                    <span className="font-mono font-medium">{potDetails.amount} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Claimed</span>
                    <span className="font-mono font-medium">{potDetails.claimedAmount} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Claims</span>
                    <span className="font-mono font-medium">{potDetails.claimed}</span>
                  </div>
                </div>
                <Link 
                  href="/"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm inline-block text-center btn-uppercase"
                >
                  Return Home
                </Link>
              </div>
            </div>
          ) : !isConnected ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">Connect Wallet</h2>
              <p className="text-sm text-gray-600 mb-4">Connect to claim your share</p>
              <button
                onClick={connect}
                disabled={isConnecting && isBaseApp}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-400 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm btn-uppercase"
              >
                {isConnecting && isBaseApp ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <>
              {/* Gas Sponsorship Status */}
              {smartWallet.canSponsorGas && (
                <div className="bg-primary/5 backdrop-blur-xl border border-primary/20 text-gray-900 px-4 py-3 rounded-md shadow-card">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Gas-free claim available</p>
                  </div>
                </div>
              )}
              
              {/* Network Switch for Base App - Only show if not on Base */}
              {isBaseApp && !isOnBase && (
                <div className="bg-white/70 backdrop-blur-xl rounded-md p-3 border border-white/20">
                  <button
                    onClick={switchToBase}
                    className="w-full relative py-2 px-3 rounded-lg text-xs font-bold btn-uppercase transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
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
                    <div className="relative flex items-center justify-center space-x-1.5">
                      <Wifi className="w-3 h-3" />
                      <span>Switch to Base Network</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Pot Details */}
              {potDetails && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-primary/5 backdrop-blur-xl rounded-md p-3 border border-primary/10 text-center shadow-card">
                    <p className="text-lg font-bold text-primary font-mono tabular-nums">{potDetails.standardClaim}</p>
                    <p className="text-xs font-medium text-gray-600">Standard</p>
                  </div>
                  <div className="bg-primary/5 backdrop-blur-xl rounded-md p-3 border border-primary/10 text-center shadow-card">
                    <p className="text-lg font-bold text-primary font-mono tabular-nums">{potDetails.remainingAmount.toFixed(1)}</p>
                    <p className="text-xs font-medium text-gray-600">Remaining</p>
                  </div>
                  <div className="bg-gold/10 backdrop-blur-xl rounded-md p-3 border border-gold/20 text-center shadow-card">
                    <p className="text-lg font-bold text-gold-dark font-mono tabular-nums">{(potDetails.jackpotProbability || 1).toFixed(1)}%</p>
                    <p className="text-xs font-medium text-gray-600">Jackpot</p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-white/70 backdrop-blur-xl rounded-md p-4 border border-white/20">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Required Actions</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Like, comment, and recast the original post to claim
                </p>
                
                {/* FID Display */}
                {fid && (
                  <div className="bg-primary/5 border border-primary/20 px-3 py-2 rounded-md mb-3 shadow-card">
                    <p className="text-xs font-semibold text-gray-700">✓ Connected - FID: <span className="font-mono">{fid}</span></p>
                  </div>
                )}
                
                {/* Cast ID Status - Read-only if auto-populated */}
                {castId && potDetails?.castId ? (
                  <div className="mb-3">
                    <div className="bg-primary/5 border border-primary/20 px-3 py-2.5 rounded-md shadow-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-700 mb-1">✓ Cast Detected</p>
                          <p className="text-xs text-blue-600 font-mono break-all">
                            {castId.slice(0, 18)}...{castId.slice(-10)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically linked to the creator's post
                    </p>
                  </div>
                ) : (
                  // Show input if no cast ID is stored with the pot
                  <div className="mb-3">
                    <label htmlFor="castId" className="block text-xs font-medium text-gray-700 mb-1.5">
                      {castId ? '✓ Cast ID' : 'Enter Cast ID'}
                    </label>
                    <input
                      id="castId"
                      name="castId"
                      type="text"
                      value={castId}
                      onChange={(e) => {
                        const input = e.target.value
                        // Automatically extract hash from URLs or use as-is
                        const hash = extractCastHash(input)
                        setCastId(hash)
                      }}
                      onPaste={(e) => {
                        // Handle paste events specially to extract hash immediately
                        const pastedText = e.clipboardData.getData('text')
                        const hash = extractCastHash(pastedText)
                        if (hash !== pastedText) {
                          e.preventDefault()
                          setCastId(hash)
                        }
                      }}
                      placeholder="Paste Base URL or cast hash (0x...)"
                      className="w-full rounded-md px-3 py-2.5 text-base bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {castId 
                        ? `✓ Cast: ${castId.slice(0, 12)}...${castId.slice(-6)}` 
                        : "Paste Base URL (base.app/post/...) or cast hash"}
                    </p>
                  </div>
                )}
                
                {/* Cast Post Preview - Simple link */}
                {castId && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      📌 Required Post to Engage:
                    </p>
                    <a
                      href={`https://base.app/post/${castId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-card hover:bg-gray-100 border-2 border-primary/30 rounded-md p-4 transition-all shadow-card hover:shadow-lg active:scale-98 no-underline"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 gradient-hero rounded-md flex items-center justify-center shadow-sm">
                            <Coins className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Creator's Post</p>
                            <p className="text-xs text-gray-500">Tap to view on Base</p>
                          </div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className="bg-white/80 rounded-md p-3 mb-3">
                        <p className="text-xs font-mono text-gray-700 break-all">
                          base.app/post/{castId.slice(0, 20)}...{castId.slice(-10)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-4 text-gray-600">
                          <span className="flex items-center space-x-1">
                            <span>👍</span>
                            <span>Like</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>💬</span>
                            <span>Comment</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>🔄</span>
                            <span>Recast</span>
                          </span>
                        </div>
                        <span className="text-blue-600 font-medium">Open →</span>
                      </div>
                    </a>
                    
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Complete all 3 actions to be eligible for claim
                    </p>
                  </div>
                )}
                
                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-gold/10 border border-gold/30 px-3 py-2 rounded-md mb-3 shadow-card">
                    <p className="text-xs font-semibold text-gray-900 mb-2">{errorMessage}</p>
                    <div className="text-xs font-medium text-gray-700 space-y-1">
                      {errorMessage.includes('like') && <p>✗ Like the post</p>}
                      {errorMessage.includes('recast') && <p>✗ Recast the post</p>}
                      {errorMessage.includes('comment') && <p>✗ Comment on the post</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* MAX_WINNERS Warning */}
              {potDetails && potDetails.claimed >= 200 && (
                <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-200/50 text-yellow-700 px-4 py-3 rounded-md shadow-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm font-medium">This pot has reached the maximum claim limit (200 claims)</p>
                  </div>
                </div>
              )}
              
              {/* Claim Button */}
              <button
                disabled={busy || isTransactionPending || !address || !castId || (potDetails && potDetails.claimed >= 200)}
                onClick={claim}
                className="w-full relative py-3 px-4 rounded-lg text-sm font-bold btn-uppercase transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                style={{
                  background: busy || isTransactionPending ? '#9CA3AF' : 'linear-gradient(180deg, #B8941F 0%, #D4AF37 15%, #D4AF37 50%, #D4AF37 85%, #A67C00 100%)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(212, 175, 55, 0.5)',
                  border: '1px solid #8B7310',
                  borderTop: '2px solid #D4AF37',
                  borderBottom: '2px solid #705D0C',
                  color: '#2A1F00',
                  textShadow: '0 1px 2px rgba(255, 215, 0, 0.3), 0 -1px 1px rgba(0, 0, 0, 0.5)'
                }}
              >
                {!busy && !isTransactionPending && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" 
                         style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.4), transparent)' }}></div>
                    <div className="absolute inset-0 opacity-15 group-hover:opacity-30 transition-opacity duration-300"
                         style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255, 215, 0, 0.6) 50%, transparent 70%)', transform: 'translateX(-100%)', animation: 'shine 4s ease-in-out infinite' }}></div>
                    <div className="absolute inset-0 opacity-30"
                         style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.3) 48%, rgba(212, 175, 55, 0.3) 52%, transparent 100%)' }}></div>
                  </>
                )}
                <span className="relative">
                  {isTransactionPending ? 'Pending...' : 
                   busy ? 'Processing...' : 
                   !castId ? 'Detecting...' : 
                   (potDetails && potDetails.claimed >= 200) ? 'Max Claims Reached' :
                   'Claim Now'}
                </span>
              </button>
            </>
          )}

      {/* Claim Success Modal */}
      {showClaimSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-md p-6 shadow-2xl border border-white/20 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="text-center">
              {/* Success Icon with 3D Effect */}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md flex items-center justify-center mb-4 mx-auto shadow-lg transform transition-all duration-300 hover:scale-110">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              
              {/* Header */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {jackpotInfo?.isJackpot ? '🎉 JACKPOT!' : '✨ Claim Successful!'}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {jackpotInfo?.isJackpot ? 'You hit the jackpot! 🎰' : 'You earned USDC!'}
              </p>
              
              {/* Amount Display with Glassmorphism */}
              <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-200/50 rounded-md p-4 mb-6 shadow-lg">
                <p className="text-sm text-gray-600 mb-1">You Received</p>
                <p className="text-3xl font-bold text-blue-600">
                  +{claimedAmount} USDC
                </p>
                {jackpotInfo?.totalClaims && (
                  <p className="text-xs text-gray-500 mt-2">
                    Claim #{jackpotInfo.totalClaims}
                  </p>
                )}
              </div>

              {/* Call to Action */}
              <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 backdrop-blur-xl rounded-md p-4 mb-6 border border-white/20">
                <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Create Your Own Pot!</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Set up a USDC reward pot and engage your community
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Create Pot Button - Primary */}
                <Link
                  href="/create"
                  onClick={() => setShowClaimSuccessModal(false)}
                  className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Coins className="w-5 h-5" />
                    <span>CREATE YOUR POT</span>
                  </div>
                </Link>

                {/* Share App Button - Secondary */}
                <button
                  onClick={() => {
                    try {
                      sdk.actions.composeCast({
                        text: `Just claimed USDC on PotFi! 🎯 Create reward pots and engage your community 💰\n\nTry it:`,
                        embeds: ['https://potfi.basecitizens.com']
                      })
                      setShowClaimSuccessModal(false)
                    } catch (error) {
                      console.error('Error opening composer:', error)
                    }
                  }}
                  className="w-full bg-gray-800/90 backdrop-blur-sm hover:bg-gray-900 text-white font-bold py-4 px-6 rounded-md text-sm transition-all duration-200 shadow-xl transform active:scale-95"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Share2 className="w-4 h-4" />
                    <span>SHARE POTFI</span>
                  </div>
                </button>

                {/* Close Button - Tertiary */}
                <button
                  onClick={() => setShowClaimSuccessModal(false)}
                  className="w-full text-gray-600 hover:text-gray-900 font-semibold py-3 px-6 rounded-md text-sm transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jackpot Success Modal */}
      {showJackpotModal && jackpotInfo?.isJackpot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-md p-6 border border-white/20 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-md flex items-center justify-center mb-3 mx-auto">
                <Coins className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-1">🎉 JACKPOT!</h2>
              <p className="text-sm text-yellow-700 mb-4">
                You won the jackpot!
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-2xl font-bold text-yellow-800 mb-1">
                  {jackpotInfo.claimAmountUSDC.toFixed(2)} USDC
                </p>
                <p className="text-xs text-yellow-600">
                  Total jackpot amount
                </p>
              </div>
              
              <div className="text-xs text-gray-600 mb-4 space-y-1">
                <p>Claim #{jackpotInfo.totalClaims}</p>
                <p>Pot is now closed</p>
                <p>Congratulations! 🎊</p>
              </div>
              
              <button
                onClick={() => setShowJackpotModal(false)}
                className="w-full relative py-4 px-6 rounded-md text-sm font-bold btn-uppercase transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
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
                <span className="relative">Awesome!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Success Info */}
      {transactionSuccess && !jackpotInfo?.isJackpot && jackpotInfo && (
        <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-xl rounded-md p-3 border border-white/20 max-w-xs shadow-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Claimed!</p>
              <p className="text-xs text-gray-600">
                +{jackpotInfo.claimAmountUSDC.toFixed(2)} USDC
              </p>
            </div>
            <button
              onClick={() => setJackpotInfo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
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
        title="Claim Failed"
        message={errorMessage}
        onRetry={() => {
          setErrorMessage('')
          if (castId && address && !busy && !isTransactionPending) {
            claim()
          }
        }}
      />

      {/* Debug Logger - Only shown when NEXT_PUBLIC_DEBUG_LOGS=true */}
      {showDebugLogger && <DebugLogger />}
    </div>
  )
}