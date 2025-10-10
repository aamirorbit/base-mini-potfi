import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseAbi, getAddress } from 'viem'
import { base } from 'viem/chains'
import { jackpotAddress } from '@/lib/contracts'

// Create a public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: base,
  transport: http()
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
    
    // Get all PotCreated events
    const potCreatedLogs = await publicClient.getLogs({
      address: jackpotAddress,
      event: {
        type: 'event',
        name: 'PotCreated',
        inputs: [
          { name: 'id', type: 'bytes32', indexed: true },
          { name: 'creator', type: 'address', indexed: true },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'winners', type: 'uint32' }
        ]
      },
      fromBlock: 'earliest',
      toBlock: 'latest'
    })

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
    return NextResponse.json(
      { 
        error: 'Failed to fetch pot data from blockchain',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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
      abi: jackpotAbi,
      functionName: 'pots',
      args: [potId as `0x${string}`]
    }) as [string, string, bigint, bigint, number, number, number, string, boolean]

    const [creator, token, amount, createdAt, winners, claimed, timeoutSecs, seed, active] = potData

    // Get all allocations for this pot
    const allocations: number[] = []
    for (let i = 0; i < winners; i++) {
      try {
        const allocation = await publicClient.readContract({
          address: jackpotAddress,
          abi: jackpotAbi,
          functionName: 'getAllocation',
          args: [potId as `0x${string}`, i]
        }) as bigint
        allocations.push(Number(allocation) / 1e6)
      } catch {
        allocations.push(0)
      }
    }

    return NextResponse.json({
      potId,
      creator,
      token,
      amount: Number(amount) / 1e6,
      createdAt: Number(createdAt) * 1000,
      winners,
      claimed,
      timeoutSecs,
      active,
      allocations,
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
