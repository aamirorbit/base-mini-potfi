import { NextRequest, NextResponse } from 'next/server'
import { neynarClient } from '@/lib/neynar'
import { ethers } from 'ethers'
import { jackpotAddress } from '@/lib/contracts'
import crypto from 'crypto'
import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'

// Create RPC client
const alchemyApiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
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

// ABI for pot requirements
const potfiAbi = parseAbi([
  'function getPotRequirements(bytes32) view returns (bytes32 postId, bool requireLike, bool requireRecast, bool requireComment)',
  'function getPostId(bytes32) view returns (bytes32)'
])

// Pot state tracking (in production, use Redis or database)
interface PotState {
  totalAmount: number
  claimCount: number
  standardClaimAmount: number
  createdAt: number
  isActive: boolean
}

const potStates = new Map<string, PotState>()

// Jackpot calculation functions
function initializePotState(potId: string, totalAmount: number): PotState {
  const state: PotState = {
    totalAmount,
    claimCount: 0,
    standardClaimAmount: 0.01, // 0.01 USDC per claim
    createdAt: Date.now(),
    isActive: true
  }
  potStates.set(potId, state)
  return state
}

function getPotState(potId: string): PotState | null {
  return potStates.get(potId) || null
}

function calculateJackpotTrigger(potState: PotState): boolean {
  // Base probability: 1% per claim
  const baseChance = 0.01
  
  // Increasing probability: +0.1% per claim
  const claimMultiplier = potState.claimCount * 0.001
  
  // Time-based multiplier: +0.05% per hour
  const hoursElapsed = (Date.now() - potState.createdAt) / (1000 * 60 * 60)
  const timeMultiplier = hoursElapsed * 0.0005
  
  // Total probability (capped at 50%)
  const totalChance = Math.min(baseChance + claimMultiplier + timeMultiplier, 0.5)
  
  // Generate cryptographically secure random number
  const randomBytes = crypto.randomBytes(8)
  const randomValue = Number(randomBytes.readBigUInt64BE(0)) / Math.pow(2, 64)
  
  console.log('Jackpot calculation:', {
    claimCount: potState.claimCount,
    baseChance,
    claimMultiplier,
    timeMultiplier,
    totalChance,
    randomValue,
    willTrigger: randomValue < totalChance
  })
  
  return randomValue < totalChance
}

function calculateClaimAmount(potState: PotState, isJackpot: boolean): number {
  if (isJackpot) {
    // Jackpot: all remaining funds
    const claimedAmount = potState.claimCount * potState.standardClaimAmount
    return Math.max(0, potState.totalAmount - claimedAmount)
  } else {
    // Standard claim: 0.01 USDC
    return potState.standardClaimAmount
  }
}

export async function POST(request: NextRequest) {
  try {
    const { potId, claimerAddress, castId, fid } = await request.json()
    
    // Validation
    if (!potId || !claimerAddress || !castId) {
      return NextResponse.json(
        { error: 'Missing required parameters: potId, claimerAddress, castId' },
        { status: 400 }
      )
    }

    // 1. Resolve Farcaster fid from claimer address or use provided fid
    let user = null
    
    // Try to get user by FID if provided (from Farcaster context)
    if (fid) {
      try {
        user = await neynarClient.getUserByFid(parseInt(fid))
        console.log('Found user by FID:', user?.username)
      } catch (error) {
        console.log('Could not get user by FID:', error)
      }
    }
    
    // Fallback to address lookup
    if (!user) {
      user = await neynarClient.getUserByAddress(claimerAddress)
      console.log('User lookup by address result:', user?.username || 'not found')
    }
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found on Farcaster. Please ensure your wallet is connected to Farcaster.',
          debug: {
            claimerAddress,
            fid,
            message: 'Neither FID lookup nor address lookup found a Farcaster user'
          }
        },
        { status: 404 }
      )
    }

    // 2. Get pot requirements from smart contract
    const requirements = await publicClient.readContract({
      address: jackpotAddress,
      abi: potfiAbi,
      functionName: 'getPotRequirements',
      args: [potId as `0x${string}`]
    }) as [`0x${string}`, boolean, boolean, boolean]

    const [contractCastId, requireLike, requireRecast, requireComment] = requirements
    console.log('Pot requirements from contract:', { contractCastId, requireLike, requireRecast, requireComment })
    
    // Verify engagement requirements based on pot configuration
    const engagement = await neynarClient.checkEngagement(user.fid, castId)
    console.log('Engagement check:', engagement)
    
    if (requireLike && !engagement.liked) {
      return NextResponse.json(
        { 
          error: 'Please like the cast to claim your allocation.',
          debug: {
            fid: user.fid,
            castId,
            engagement,
            message: 'Like not detected'
          }
        },
        { status: 403 }
      )
    }
    
    if (requireRecast && !engagement.recasted) {
      return NextResponse.json(
        { 
          error: 'Please recast the cast to claim your allocation.',
          debug: {
            fid: user.fid,
            castId,
            engagement,
            message: 'Recast not detected'
          }
        },
        { status: 403 }
      )
    }
    
    if (requireComment && !engagement.replied) {
      return NextResponse.json(
        { 
          error: 'Please comment on the cast to claim your allocation.',
          debug: {
            fid: user.fid,
            castId,
            engagement,
            message: 'Comment not detected'
          }
        },
        { status: 403 }
      )
    }

    // 3. Get or initialize pot state
    let potState = getPotState(potId)
    if (!potState) {
      // Initialize with default amount - in production, get from contract or database
      potState = initializePotState(potId, 50) // Default 50 USDC pot
      console.log('Initialized new pot state:', potState)
    }
    
    if (!potState.isActive) {
      return NextResponse.json(
        { error: 'This pot is no longer active.' },
        { status: 410 }
      )
    }
    
    // 4. Check for jackpot trigger
    const isJackpot = calculateJackpotTrigger(potState)
    const claimAmount = calculateClaimAmount(potState, isJackpot)
    
    console.log('Claim processing:', {
      potId,
      claimCount: potState.claimCount,
      isJackpot,
      claimAmount,
      remainingAmount: potState.totalAmount - (potState.claimCount * potState.standardClaimAmount)
    })
    
    // 5. Update pot state
    potState.claimCount++
    if (isJackpot) {
      potState.isActive = false // Close pot after jackpot
    }
    
    // 6. Generate permit hash (matches contract logic)
    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    
    // Ensure potId and castId are properly formatted as bytes32
    const potIdBytes32 = ethers.zeroPadValue(potId, 32)
    const castIdBytes32 = ethers.zeroPadValue(castId, 32)
    
    console.log('Permit generation:', {
      potId,
      potIdBytes32,
      castId,
      castIdBytes32,
      claimerAddress,
      deadline
    })
    
    // Prefer V2 (domain-separated) and fall back to V1 for older clients
    const typeHashV2 = ethers.keccak256(ethers.toUtf8Bytes('PotFiPermit(address,bytes32,uint256,bytes32,address,uint256)'))
    const v2 = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'bytes32', 'uint256', 'bytes32', 'address', 'uint256'],
        [typeHashV2, claimerAddress, potIdBytes32, deadline, castIdBytes32, jackpotAddress, BigInt(8453)] // Base mainnet chainId
      )
    )
    const typeHashV1 = ethers.keccak256(ethers.toUtf8Bytes('PotFiPermit(address,bytes32,uint256,bytes32)'))
    const v1 = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'bytes32', 'uint256', 'bytes32'],
        [typeHashV1, claimerAddress, potIdBytes32, deadline, castIdBytes32]
      )
    )
    
    // 4. Sign with gate signer private key (NEVER expose this to client!)
    const gateSignerPK = process.env.GATE_SIGNER_PK!
    const wallet = new ethers.Wallet(gateSignerPK)
    // Sign V2; contract will accept V1 as legacy fallback
    const signature = await wallet.signMessage(ethers.getBytes(v2))
    
    return NextResponse.json({
      deadline,
      castId,
      signature,
      user: {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name
      },
      // Jackpot information
      jackpot: {
        isJackpot,
        claimAmount,
        claimAmountUSDC: claimAmount,
        claimCount: potState.claimCount - 1, // Before increment
        totalClaims: potState.claimCount,
        remainingAmount: potState.totalAmount - ((potState.claimCount - 1) * potState.standardClaimAmount),
        potClosed: !potState.isActive
      },
      // provide hashes for debugging/clients if needed
      hashV2: v2,
      hashV1: v1
    })
    
  } catch (error) {
    console.error('Permit API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
