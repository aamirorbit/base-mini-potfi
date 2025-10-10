'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { jackpotAbi, jackpotAddress } from '@/lib/contracts'
import { useMiniKitWallet } from '@/hooks/useMiniKitWallet'
import { sdk } from '@farcaster/miniapp-sdk'
import { pad } from 'viem'
import { Coins, Target, AlertTriangle, CheckCircle, Wifi, X } from 'lucide-react'

export default function Claim() {
  const { id } = useParams() as { id: `0x${string}` }
  const [busy, setBusy] = useState(false)
  const [castId, setCastId] = useState('')
  const [fid, setFid] = useState<string>('')
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [jackpotInfo, setJackpotInfo] = useState<any>(null)
  const [showJackpotModal, setShowJackpotModal] = useState(false)
  
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

  useEffect(() => {
    setMounted(true)
    // Check if we're in Farcaster environment
    const userAgent = navigator.userAgent || ''
    const isFarcasterApp = userAgent.includes('Farcaster') || 
                          window.parent !== window || // iframe detection
                          window.location !== window.parent.location
    setIsFarcaster(isFarcasterApp)

    // Auto-detect castId from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const castIdFromUrl = urlParams.get('castId')
    if (castIdFromUrl && castIdFromUrl !== 'unknown' && castIdFromUrl !== 'auto-detect') {
      setCastId(castIdFromUrl)
    }

    // Try to get cast context from Farcaster SDK if in Farcaster environment
    if (isFarcasterApp && (!castIdFromUrl || castIdFromUrl === 'auto-detect')) {
      const getCastContext = async () => {
        try {
          const context = await sdk.context
          console.log('Farcaster context:', context)
          
          // Check if launched from a cast context
          if (context?.location?.type === 'cast_embed' || context?.location?.type === 'cast_share') {
            const castHash = context.location.cast?.hash
            if (castHash) {
              setCastId(castHash)
              console.log('Auto-detected castId from Farcaster context:', castHash)
            }
          }
          
          // Get user FID from context
          if (context?.user?.fid) {
            setFid(context.user.fid.toString())
            console.log('Auto-detected FID from Farcaster context:', context.user.fid)
          }
        } catch (error) {
          console.log('Could not get cast context from Farcaster SDK:', error)
        }
      }
      getCastContext()
    }
  }, [])

  // Use MiniKit in Farcaster, fallback to wagmi elsewhere
  const address = isFarcaster ? miniKitAddress : wagmiAddress
  const isConnected = isFarcaster ? miniKitConnected : wagmiConnected
  const connect = isFarcaster ? miniKitConnect : () => wagmiConnect({ connector: injected() })
  const disconnect = isFarcaster ? miniKitDisconnect : wagmiDisconnect
  const displayAddress = isFarcaster ? truncatedAddress : (wagmiAddress?.slice(0, 6) + '...' + wagmiAddress?.slice(-4))

  const { writeContract, data: txHash, error: writeError } = useWriteContract()
  const { isLoading: isClaiming, isSuccess: txSuccess, error: txError } = useWaitForTransactionReceipt({ hash: txHash })
  
  // Handle transaction completion
  useEffect(() => {
    if (txSuccess) {
      setErrorMessage('')
      setBusy(false)
      
      // Show jackpot modal if user won jackpot
      if (jackpotInfo?.isJackpot) {
        setShowJackpotModal(true)
      }
      
      console.log('Transaction successful!', txHash)
      console.log('Jackpot info:', jackpotInfo)
    }
    if (txError || writeError) {
      setErrorMessage(txError?.message || writeError?.message || 'Transaction failed')
      setBusy(false)
      console.error('Transaction error:', txError || writeError)
    }
  }, [txSuccess, txError, writeError, txHash, jackpotInfo])

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
      
      // writeContract is async but doesn't return a promise
      // The transaction state is handled by wagmi hooks
      writeContract({
        abi: jackpotAbi, 
        address: jackpotAddress, 
        functionName: 'claim',
        args: [potIdBytes32, BigInt(deadline), castIdBytes32, signature as `0x${string}`]
      })
      
      // Don't set busy to false immediately - let the transaction complete
      // The busy state will be managed by the transaction status
      
    } catch (error) {
      console.error('Claim error:', error)
      setErrorMessage('Network error. Please try again.')
      setBusy(false) // Only set false on API error
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="text-center">
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-4 mx-auto shadow-2xl">
                <Coins className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 sm:mb-8">PotFi</h1>
              <p className="text-gray-600 text-base sm:text-lg">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div>
          <div className="text-center mb-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-4 mx-auto shadow-2xl">
                <Coins className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Claim PotFi
              </h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                #{id?.slice(0, 8)}...
              </p>
            </div>
          </div>
          
          {isFarcaster && (
            <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-200/50 text-blue-700 px-4 py-3 rounded-md mb-4 shadow-2xl">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <p className="text-sm font-medium">Running in Farcaster Mini App</p>
              </div>
            </div>
          )}

          {error && isFarcaster && (
            <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-200/50 text-yellow-700 px-4 py-3 rounded-md mb-4 shadow-2xl">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium">{error}</p>
                  <p className="text-xs mt-1 opacity-75">Wallet connection error in Farcaster</p>
                </div>
              </div>
            </div>
          )}

          {!isConnected ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20">
              <p className="text-gray-700 mb-4 text-center">
                Connect your wallet to claim your share of this PotFi!
              </p>
              <button
                onClick={connect}
                disabled={isConnecting && isFarcaster}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95"
              >
                {isConnecting && isFarcaster ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white/70 backdrop-blur-xl rounded-md p-4 shadow-xl border border-white/20 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">Connected</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{displayAddress}</span>
                </div>
                
                {isFarcaster && !isOnBase && (
                  <button
                    onClick={switchToBase}
                    className="w-full mt-3 bg-yellow-600 backdrop-blur-sm hover:bg-yellow-700 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all duration-200 shadow-2xl flex items-center justify-center space-x-2"
                  >
                    <Wifi className="w-4 h-4" />
                    <span>Switch to Base Network</span>
                  </button>
                )}
              </div>

              <div className="bg-white/70 backdrop-blur-xl rounded-md p-8 shadow-2xl border border-white/20 mb-8">
                <p className="text-gray-700 mb-4 text-center">
                  Complete the required actions to claim your share of this PotFi!
                </p>
                <p className="text-gray-600 text-sm mb-4 text-center">
                  Make sure you've liked, commented, and recasted the original post.
                </p>
                
                {castId ? (
                  <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-md mb-4">
                    <p className="text-sm">✅ Cast ID detected: {castId.slice(0, 10)}...</p>
                    {fid && <p className="text-xs mt-1">👤 User FID: {fid}</p>}
                    <p className="text-xs mt-1">Ready to claim from this post!</p>
                  </div>
                ) : (
                  <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-300 px-4 py-3 rounded-md mb-4">
                    <p className="text-sm">⏳ Auto-detecting cast information...</p>
                    {fid && <p className="text-xs mt-1">👤 User FID detected: {fid}</p>}
                    <p className="text-xs mt-1">
                      {isFarcaster 
                        ? "Getting post ID from Farcaster context..." 
                        : "If this doesn't work, you can enter the cast ID manually below."
                      }
                    </p>
                  </div>
                )}
                
                {errorMessage && (
                  <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-md mb-4">
                    <p className="text-sm">❌ {errorMessage}</p>
                    {errorMessage.includes('like') && (
                      <p className="text-xs mt-1">Please like ❤️ the original post and try again.</p>
                    )}
                    {errorMessage.includes('recast') && (
                      <p className="text-xs mt-1">Please recast 🔄 the original post and try again.</p>
                    )}
                    {errorMessage.includes('comment') && (
                      <p className="text-xs mt-1">Please comment 💬 on the original post and try again.</p>
                    )}
                    <button
                      onClick={() => setErrorMessage('')}
                      className="mt-2 text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
                    >
                      Clear Error
                    </button>
                  </div>
                )}
                
                <details className={castId ? "opacity-50" : ""}>
                  <summary className="text-gray-400 text-sm cursor-pointer mb-2">
                    {castId ? "Override cast ID (optional)" : "Enter cast ID manually"}
                  </summary>
                  <input
                    value={castId}
                    onChange={(e) => setCastId(e.target.value)}
                    placeholder="Enter castId (0x...)"
                    className="w-full rounded-md px-4 py-3 bg-white/80 text-gray-900 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </details>
              </div>

              <div className="space-y-3">
                <button
                  disabled={busy || isClaiming || !address || !castId}
                  onClick={claim}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95"
                >
                  {isClaiming ? 'Transaction Pending...' : 
                   busy ? 'Getting Permit...' : 
                   !castId ? 'Detecting Cast...' : 
                   'Claim PotFi'}
                </button>
                <button
                  onClick={() => disconnect()}
                  className="w-full bg-gray-800/90 backdrop-blur-sm hover:bg-gray-900 text-white font-medium py-4 px-6 rounded-md text-base transition-all duration-200 shadow-xl transform active:scale-95"
                >
                  Disconnect
                </button>
              </div>
            </>
          )}

      {/* Jackpot Success Modal */}
      {showJackpotModal && jackpotInfo?.isJackpot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-md p-6 shadow-2xl border border-white/20 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-md flex items-center justify-center mb-4 mx-auto shadow-2xl">
                <Coins className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 JACKPOT!</h2>
              <p className="text-lg text-yellow-700 mb-4">
                You won the jackpot!
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-800 mb-1">
                    {jackpotInfo.claimAmountUSDC.toFixed(2)} USDC
                  </p>
                  <p className="text-sm text-yellow-600">
                    Total jackpot amount
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-6">
                <p>• You were claim #{jackpotInfo.totalClaims}</p>
                <p>• Pot is now closed</p>
                <p>• Congratulations! 🎊</p>
              </div>
              
              <button
                onClick={() => setShowJackpotModal(false)}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-3 px-6 rounded-md transition-all duration-200 shadow-lg"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Success Info */}
      {txSuccess && !jackpotInfo?.isJackpot && jackpotInfo && (
        <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-xl rounded-md p-4 shadow-2xl border border-white/20 max-w-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">Claim Successful!</p>
              <p className="text-sm text-gray-600">
                +{jackpotInfo.claimAmountUSDC.toFixed(2)} USDC
              </p>
              <p className="text-xs text-gray-500">
                Remaining: {jackpotInfo.remainingAmount.toFixed(2)} USDC
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
    </div>
  )
}