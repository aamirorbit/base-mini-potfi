import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseAbi, getAddress, decodeEventLog } from 'viem'
import { base } from 'viem/chains'
import { jackpotAddress } from '@/lib/contracts'
import { bytes32ToCastId } from '@/lib/utils'

// Alchemy API key (required for production use)
const alchemyApiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

if (!alchemyApiKey) {
  console.warn('⚠️  WARNING: No Alchemy API key found. Public RPC is unreliable.')
  console.warn('⚠️  Add ALCHEMY_API_KEY to .env.local for production use.')
}

// Create public client with Alchemy RPC (required for getLogs with large block ranges)
const rpcUrl = alchemyApiKey 
  ? `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
  : 'https://mainnet.base.org'

const publicClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 30000,
  })
})

console.log(`🔗 Using RPC: ${alchemyApiKey ? 'Alchemy (Growth Plan)' : 'Public Base RPC (unreliable)'}`)

// Simplified ABI for the functions we need
const potfiAbi = parseAbi([
  'event PotCreated(bytes32 indexed id, address indexed creator, address token, uint256 amount, uint128 standardClaim, bytes32 postId, bool requireLike, bool requireRecast, bool requireComment)',
  'event StandardClaim(bytes32 indexed id, address indexed to, uint256 net, uint256 fee)',
  'event JackpotClaim(bytes32 indexed id, address indexed to, uint256 net, uint256 fee, uint256 totalClaims)',
  'event Swept(bytes32 indexed id, address indexed to, uint256 amount)',
  'function pots(bytes32) view returns (address creator, address token, uint128 amount, uint128 claimedAmount, uint64 createdAt, uint32 claimed, uint32 timeoutSecs, uint128 standardClaim, bool active, bytes32 postId, bool requireLike, bool requireRecast, bool requireComment)',
  'function hasClaimed(bytes32, address) view returns (bool)',
  'function getRemainingFunds(bytes32) view returns (uint256)',
  'function getJackpotProbability(bytes32) view returns (uint256)',
  'function getPotRequirements(bytes32) view returns (bytes32 postId, bool requireLike, bool requireRecast, bool requireComment)',
  'function getPostId(bytes32) view returns (bytes32)'
])

interface PotData {
  id: string
  creator: string
  token: string
  amount: number
  claimedAmount: number
  remainingAmount: number
  claimCount: number
  maxClaims: number
  timeout: number
  createdAt: number
  status: 'active' | 'completed' | 'expired'
  jackpotHit?: boolean
  jackpotWinner?: string
  timeRemaining?: number
  canReclaim?: boolean
  castId?: string
  requireLike?: boolean
  requireRecast?: boolean
  requireComment?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorAddress = searchParams.get('creator')
    
    console.log(`📊 Fetching pots${creatorAddress ? ` for creator ${creatorAddress}` : ' for all creators'}`)
    
    // Use Alchemy for direct blockchain scanning (requires Growth plan for large block ranges)
    console.log('🔍 Scanning blockchain via Alchemy RPC...')
    
    const latestBlock = await publicClient.getBlockNumber()
    const fromBlock = latestBlock > BigInt(1_000_000) ? latestBlock - BigInt(1_000_000) : BigInt(0)
    const blocksScanned = Number(latestBlock - fromBlock)
    
    console.log(`📊 Scanning ${blocksScanned.toLocaleString()} blocks (from ${fromBlock} to ${latestBlock})`)
    
    const startTime = Date.now()
    
    const potCreatedLogs = await publicClient.getLogs({
      address: jackpotAddress,
      event: {
        type: 'event',
        name: 'PotCreated',
        inputs: [
          { name: 'id', type: 'bytes32', indexed: true },
          { name: 'creator', type: 'address', indexed: true },
          { name: 'token', type: 'address', indexed: false },
          { name: 'amount', type: 'uint256', indexed: false },
          { name: 'standardClaim', type: 'uint128', indexed: false },
          { name: 'postId', type: 'bytes32', indexed: false },
          { name: 'requireLike', type: 'bool', indexed: false },
          { name: 'requireRecast', type: 'bool', indexed: false },
          { name: 'requireComment', type: 'bool', indexed: false }
        ]
      },
      args: creatorAddress ? { creator: creatorAddress as `0x${string}` } : undefined,
      fromBlock,
      toBlock: 'latest'
    })
    
    const duration = Date.now() - startTime
    console.log(`✅ Found ${potCreatedLogs.length} PotCreated events in ${duration}ms`)
    
    // Filter by creator if specified (redundant but kept for consistency)
    const filteredLogs = creatorAddress 
      ? potCreatedLogs.filter(log => 
          log.args.creator?.toLowerCase() === creatorAddress.toLowerCase()
        )
      : potCreatedLogs

    // Get detailed data for each pot
    const pots: PotData[] = []
    const now = Date.now()

    for (const log of filteredLogs) {
      try {
        const potId = log.args.id as `0x${string}`
        
        // Get pot data from contract
        const potData = await publicClient.readContract({
          address: jackpotAddress,
          abi: potfiAbi,
          functionName: 'pots',
          args: [potId]
        }) as [string, string, bigint, bigint, bigint, number, number, bigint, boolean, `0x${string}`, boolean, boolean, boolean]

        const [creator, token, amount, claimedAmount, createdAt, claimed, timeoutSecs, standardClaim, active, postId, requireLike, requireRecast, requireComment] = potData

        // Get StandardClaim and JackpotClaim events for this pot
        const standardClaimLogs = await publicClient.getLogs({
          address: jackpotAddress,
          event: {
            type: 'event',
            name: 'StandardClaim',
            inputs: [
              { name: 'id', type: 'bytes32', indexed: true },
              { name: 'to', type: 'address', indexed: true },
              { name: 'net', type: 'uint256' },
              { name: 'fee', type: 'uint256' }
            ]
          },
          args: { id: potId },
          fromBlock: 'earliest',
          toBlock: 'latest'
        })
        
        const jackpotClaimLogs = await publicClient.getLogs({
          address: jackpotAddress,
          event: {
            type: 'event',
            name: 'JackpotClaim',
            inputs: [
              { name: 'id', type: 'bytes32', indexed: true },
              { name: 'to', type: 'address', indexed: true },
              { name: 'net', type: 'uint256' },
              { name: 'fee', type: 'uint256' },
              { name: 'totalClaims', type: 'uint256' }
            ]
          },
          args: { id: potId },
          fromBlock: 'earliest',
          toBlock: 'latest'
        })
        
        const claimLogs = [...standardClaimLogs, ...jackpotClaimLogs]

        // Get sweep events for this pot
        const sweepLogs = await publicClient.getLogs({
          address: jackpotAddress,
          event: {
            type: 'event',
            name: 'Swept',
            inputs: [
              { name: 'id', type: 'bytes32', indexed: true },
              { name: 'to', type: 'address', indexed: true },
              { name: 'amount', type: 'uint256' }
            ]
          },
          args: { id: potId },
          fromBlock: 'earliest',
          toBlock: 'latest'
        })

        // Calculate amounts
        const totalAmount = Number(amount) / 1e6 // Convert from 6 decimals to USDC
        const claimedAmountUSDC = Number(claimedAmount) / 1e6
        const remainingAmount = Math.max(0, totalAmount - claimedAmountUSDC)

        // Determine status
        const expiryTime = Number(createdAt) * 1000 + (timeoutSecs * 1000)
        const isExpired = now > expiryTime
        const wasSwept = sweepLogs.length > 0
        const jackpotHit = jackpotClaimLogs.length > 0 // Jackpot was hit if JackpotClaim event was emitted
        
        let status: 'active' | 'completed' | 'expired'
        if (active && !isExpired) {
          status = 'active'
        } else if (jackpotHit || !active) {
          status = 'completed'
        } else {
          status = 'expired'
        }

        // Find jackpot winner (from JackpotClaim event)
        let jackpotWinner: string | undefined
        if (jackpotHit && jackpotClaimLogs.length > 0) {
          jackpotWinner = jackpotClaimLogs[0].args.to
        }

        const pot: PotData = {
          id: potId,
          creator,
          token,
          amount: totalAmount,
          claimedAmount: claimedAmountUSDC,
          remainingAmount,
          claimCount: claimed,
          maxClaims: 0, // No max claims in new contract
          timeout: timeoutSecs,
          createdAt: Number(createdAt) * 1000, // Convert to milliseconds
          status,
          jackpotHit: status === 'completed' ? jackpotHit : undefined,
          jackpotWinner,
          timeRemaining: status === 'active' ? Math.max(0, Math.floor((expiryTime - now) / 1000)) : undefined,
          canReclaim: status === 'expired' && remainingAmount > 0.01 && !wasSwept,
          castId: postId ? bytes32ToCastId(postId) : undefined,
          requireLike,
          requireRecast,
          requireComment
        }

        pots.push(pot)
      } catch (error) {
        console.error(`Error processing pot ${log.args.id}:`, error)
        // Continue with other pots
      }
    }

    // Sort by creation time (newest first)
    pots.sort((a, b) => b.createdAt - a.createdAt)

    // Calculate stats
    const stats = {
      totalPots: pots.length,
      activePots: pots.filter(p => p.status === 'active').length,
      completedPots: pots.filter(p => p.status === 'completed').length,
      expiredPots: pots.filter(p => p.status === 'expired').length,
      totalValue: pots.reduce((sum, p) => sum + p.amount, 0),
      totalClaimed: pots.reduce((sum, p) => sum + p.claimedAmount, 0)
    }

    return NextResponse.json({
      pots,
      stats,
      success: true
    })

  } catch (error) {
    console.error('Blockchain data fetch error:', error)
    
    // Check if it's an RPC error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isRpcError = errorMessage.includes('503') || 
                       errorMessage.includes('backend') || 
                       errorMessage.includes('HTTP request failed')
    
    return NextResponse.json(
      { 
        error: isRpcError 
          ? 'Base RPC is temporarily unavailable. Please try again in a moment.' 
          : 'Failed to fetch pot data from blockchain',
        details: errorMessage,
        suggestion: isRpcError 
          ? 'The Base network RPC is experiencing high traffic. Try refreshing in 10-30 seconds.' 
          : undefined,
        pots: [], // Return empty array so UI doesn't break
        stats: {
          totalPots: 0,
          activePots: 0,
          totalVolume: 0,
          totalClaims: 0
        },
        success: false
      },
      { status: isRpcError ? 503 : 500 }
    )
  }
}

// Helper function to get pot details by ID
export async function POST(request: NextRequest) {
  try {
    const { potId } = await request.json()
    
    if (!potId) {
      return NextResponse.json(
        { error: 'Missing potId' },
        { status: 400 }
      )
    }

    // Get detailed pot information
    const potData = await publicClient.readContract({
      address: jackpotAddress,
      abi: potfiAbi,
      functionName: 'pots',
      args: [potId as `0x${string}`]
    }) as [string, string, bigint, bigint, bigint, number, number, bigint, boolean, `0x${string}`, boolean, boolean, boolean]

    const [creator, token, amount, claimedAmount, createdAt, claimed, timeoutSecs, standardClaim, active, postId, requireLike, requireRecast, requireComment] = potData

    // Get remaining funds
    const remainingFunds = await publicClient.readContract({
      address: jackpotAddress,
      abi: potfiAbi,
      functionName: 'getRemainingFunds',
      args: [potId as `0x${string}`]
    }) as bigint

    // Get jackpot probability
    const jackpotProbability = await publicClient.readContract({
      address: jackpotAddress,
      abi: potfiAbi,
      functionName: 'getJackpotProbability',
      args: [potId as `0x${string}`]
    }) as bigint

    return NextResponse.json({
      potId,
      creator,
      token,
      amount: Number(amount) / 1e6,
      claimedAmount: Number(claimedAmount) / 1e6,
      remainingAmount: Number(remainingFunds) / 1e6,
      standardClaim: Number(standardClaim) / 1e6,
      createdAt: Number(createdAt) * 1000,
      claimed,
      timeoutSecs,
      active,
      jackpotProbability: Number(jackpotProbability) / 100, // Convert from basis points to percentage
      castId: postId ? bytes32ToCastId(postId) : undefined,
      requireLike,
      requireRecast,
      requireComment,
      success: true
    })

  } catch (error) {
    console.error('Pot details fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch pot details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
