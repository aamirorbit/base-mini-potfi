import { NextRequest, NextResponse } from 'next/server'
import { Alchemy, Network } from 'alchemy-sdk'
import { createPublicClient, http, parseAbi, getAddress } from 'viem'
import { base } from 'viem/chains'
import { jackpotAddress } from '@/lib/contracts'

// Initialize Alchemy
const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.BASE_MAINNET,
})

// Fallback public client (for read operations not in Alchemy SDK)
const publicClient = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`, {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 30000,
  })
})

// Simplified ABI for the functions we need
const potfiAbi = parseAbi([
  'event PotCreated(bytes32 indexed id, address indexed creator, address token, uint256 amount, uint128 standardClaim)',
  'event StandardClaim(bytes32 indexed id, address indexed to, uint256 net, uint256 fee)',
  'event JackpotClaim(bytes32 indexed id, address indexed to, uint256 net, uint256 fee, uint256 totalClaims)',
  'event Swept(bytes32 indexed id, address indexed to, uint256 amount)',
  'function pots(bytes32) view returns (address creator, address token, uint128 amount, uint128 claimedAmount, uint64 createdAt, uint32 claimed, uint32 timeoutSecs, uint128 standardClaim, bool active)',
  'function hasClaimed(bytes32, address) view returns (bool)',
  'function getRemainingFunds(bytes32) view returns (uint256)',
  'function getJackpotProbability(bytes32) view returns (uint256)'
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
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorAddress = searchParams.get('creator')
    
    // Get current block number using Alchemy
    const latestBlock = await alchemy.core.getBlockNumber()
    
    // Only scan last 1 million blocks (roughly 3-4 weeks on Base)
    // Base has ~2 second block time, so 1M blocks ≈ 23 days
    const fromBlock = latestBlock > 1_000_000 ? latestBlock - 1_000_000 : 0
    
    console.log(`[Alchemy] Fetching PotCreated events from block ${fromBlock} to ${latestBlock}`)
    
    // PotCreated event signature: keccak256("PotCreated(bytes32,address,address,uint256,uint128)")
    const potCreatedTopic = '0xedbc7e1f4902e524d9cab0ffcc13f86772988eae02f52b3a34acaa7681b58fc4'
    
    // Get all PotCreated events using Alchemy (much faster and more reliable)
    const logsResponse = await alchemy.core.getLogs({
      address: jackpotAddress,
      topics: [potCreatedTopic],
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: 'latest'
    })
    
    console.log(`[Alchemy] Found ${logsResponse.length} PotCreated events`)
    
    // Decode logs using viem
    const potCreatedLogs = logsResponse.map(log => {
      try {
        return {
          args: {
            id: log.topics[1] as `0x${string}`,
            creator: `0x${log.topics[2]?.slice(26)}` as `0x${string}`, // Remove padding
            token: log.data ? `0x${log.data.slice(26, 66)}` as `0x${string}` : undefined,
            amount: log.data ? BigInt(`0x${log.data.slice(66, 130)}`) : BigInt(0),
            standardClaim: log.data ? BigInt(`0x${log.data.slice(130, 162)}`) : BigInt(0)
          },
          blockNumber: BigInt(log.blockNumber || 0),
          transactionHash: log.transactionHash
        }
      } catch (error) {
        console.error('Error decoding log:', error)
        return null
      }
    }).filter(log => log !== null)

    // Filter by creator if specified
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
        }) as [string, string, bigint, bigint, bigint, number, number, bigint, boolean]

        const [creator, token, amount, claimedAmount, createdAt, claimed, timeoutSecs, standardClaim, active] = potData

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
          canReclaim: status === 'expired' && remainingAmount > 0.01 && !wasSwept
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
    }) as [string, string, bigint, bigint, bigint, number, number, bigint, boolean]

    const [creator, token, amount, claimedAmount, createdAt, claimed, timeoutSecs, standardClaim, active] = potData

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
