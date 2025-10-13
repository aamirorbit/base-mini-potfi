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
import { sdk } from '@farcaster/miniapp-sdk'
import { pad, createWalletClient, custom, PublicClient, createPublicClient, http, encodeFunctionData } from 'viem'
import { base } from 'viem/chains'
import { miniKitWallet } from '@/lib/minikit-wallet'
import { Coins, Target, AlertTriangle, CheckCircle, Wifi, X, XCircle, Wallet, ExternalLink, Zap } from 'lucide-react'
import Link from 'next/link'
import { ErrorModal } from '@/app/components/ErrorModal'

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
      
      // Show jackpot modal if user won jackpot
      if (jackpotInfo?.isJackpot) {
        setShowJackpotModal(true)
      }
      
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
      
      console.log('Calling writeContract with:', {
        potId: id,
        potIdBytes32,
        deadline,
        castId: castOut,
        castIdBytes32,
        signature,
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
                args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`]
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
                args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`]
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
              args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`]
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
          args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`]
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
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
          {/* Compact Header */}
          <div>
            <h1 className="text-xl font-bold text-gray-900">Claim Pot</h1>
            <p className="text-xs text-gray-600 font-mono">#{id?.slice(0, 16)}...</p>
          </div>

          {loadingPot ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-xs text-gray-600">Loading pot...</p>
            </div>
          ) : potDetails && !potDetails.active ? (
            <div className="bg-yellow-500/10 border border-yellow-200/50 rounded-md p-4">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-yellow-700 mx-auto mb-3" />
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
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg inline-block text-center"
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
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg"
              >
                {isConnecting && isBaseApp ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <>
              {/* Gas Sponsorship Status */}
              {smartWallet.canSponsorGas && (
                <div className="bg-blue-50/50 backdrop-blur-xl border border-blue-200/50 text-blue-700 px-4 py-3 rounded-md shadow-lg">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <p className="text-sm font-medium">Gas-free claim available</p>
                  </div>
                </div>
              )}
              
              {/* Wallet Status */}
              <div className="bg-white/70 backdrop-blur-xl rounded-md p-3 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-700">Connected</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{displayAddress}</span>
                </div>
                
                {isBaseApp && !isOnBase && (
                  <button
                    onClick={switchToBase}
                    className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-3 rounded-md text-xs transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Wifi className="w-3 h-3" />
                    <span>Switch to Base</span>
                  </button>
                )}
              </div>

              {/* Pot Details */}
              {potDetails && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50/50 backdrop-blur-xl rounded-md p-3 border border-blue-200/50 text-center">
                    <p className="text-lg font-bold text-blue-600">{potDetails.standardClaim}</p>
                    <p className="text-xs text-gray-600">Standard</p>
                  </div>
                  <div className="bg-blue-50/50 backdrop-blur-xl rounded-md p-3 border border-blue-200/50 text-center">
                    <p className="text-lg font-bold text-blue-600">{potDetails.remainingAmount.toFixed(1)}</p>
                    <p className="text-xs text-gray-600">Remaining</p>
                  </div>
                  <div className="bg-yellow-50/50 backdrop-blur-xl rounded-md p-3 border border-yellow-200/50 text-center">
                    <p className="text-lg font-bold text-yellow-600">{(potDetails.jackpotProbability || 1).toFixed(1)}%</p>
                    <p className="text-xs text-gray-600">Jackpot</p>
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
                  <div className="bg-blue-50/50 border border-blue-200/50 px-3 py-2 rounded-md mb-3">
                    <p className="text-xs text-blue-700">✓ Connected - FID: {fid}</p>
                  </div>
                )}
                
                {/* Cast ID Status - Read-only if auto-populated */}
                {castId && potDetails?.castId ? (
                  <div className="mb-3">
                    <div className="bg-blue-50/50 border border-blue-200/50 px-3 py-2.5 rounded-md">
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
                      onChange={(e) => setCastId(e.target.value)}
                      placeholder="Enter the cast hash (0x...)"
                      className="w-full rounded-md px-3 py-2.5 text-sm bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {castId 
                        ? `Cast: ${castId.slice(0, 12)}...${castId.slice(-6)}` 
                        : "Paste the hash of the cast you engaged with"}
                    </p>
                  </div>
                )}
                
                {/* Cast Engagement Button - Uses Farcaster SDK */}
                {castId && (
                  <button
                    onClick={async () => {
                      try {
                        console.log('🔍 Opening cast with hash:', castId)
                        await sdk.actions.viewCast({ hash: castId })
                      } catch (error) {
                        console.error('❌ Error opening cast:', error)
                      }
                    }}
                    className="w-full mb-3 flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-sm active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Cast to Engage</span>
                  </button>
                )}
                
                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-yellow-500/10 border border-yellow-200/50 px-3 py-2 rounded-md mb-3">
                    <p className="text-xs font-medium text-yellow-700 mb-2">{errorMessage}</p>
                    <div className="text-xs text-yellow-600 space-y-1">
                      {errorMessage.includes('like') && <p>✗ Like the post</p>}
                      {errorMessage.includes('recast') && <p>✗ Recast the post</p>}
                      {errorMessage.includes('comment') && <p>✗ Comment on the post</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Claim Button */}
              <button
                disabled={busy || isTransactionPending || !address || !castId}
                onClick={claim}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium py-3 px-4 rounded-md text-sm transition-all shadow-lg"
              >
                {isTransactionPending ? 'Pending...' : 
                 busy ? 'Processing...' : 
                 !castId ? 'Detecting...' : 
                 'Claim Pot'}
              </button>
            </>
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
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-lg"
              >
                Awesome!
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
    </div>
  )
}