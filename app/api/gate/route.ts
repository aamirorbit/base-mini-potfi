import { NextRequest, NextResponse } from 'next/server'

// Pot state tracking (in production, use Redis or database)
interface PotState {
  totalAmount: number
  claimCount: number
  standardClaimAmount: number
  createdAt: number
  isActive: boolean
}

// Share the same pot states map with permit route
const potStates = new Map<string, PotState>()

export async function POST(request: NextRequest) {
  try {
    const { action, potId, totalAmount } = await request.json()
    
    if (action === 'initialize') {
      // Initialize a new pot state
      if (!potId || !totalAmount) {
        return NextResponse.json(
          { error: 'Missing potId or totalAmount' },
          { status: 400 }
        )
      }
      
      const state: PotState = {
        totalAmount,
        claimCount: 0,
        standardClaimAmount: 0.01, // 0.01 USDC per claim
        createdAt: Date.now(),
        isActive: true
      }
      
      potStates.set(potId, state)
      
      console.log('Initialized pot state:', { potId, state })
      
      return NextResponse.json({
        success: true,
        potId,
        state
      })
    }
    
    if (action === 'status') {
      // Get pot status
      if (!potId) {
        return NextResponse.json(
          { error: 'Missing potId' },
          { status: 400 }
        )
      }
      
      const state = potStates.get(potId)
      if (!state) {
        return NextResponse.json(
          { error: 'Pot not found' },
          { status: 404 }
        )
      }
      
      const claimedAmount = state.claimCount * state.standardClaimAmount
      const remainingAmount = Math.max(0, state.totalAmount - claimedAmount)
      
      return NextResponse.json({
        potId,
        state,
        claimedAmount,
        remainingAmount,
        maxPossibleClaims: Math.floor(state.totalAmount / state.standardClaimAmount)
      })
    }
    
    if (action === 'reclaim') {
      // Reclaim funds from expired pot
      const { creatorAddress } = await request.json()
      
      if (!potId || !creatorAddress) {
        return NextResponse.json(
          { error: 'Missing potId or creatorAddress' },
          { status: 400 }
        )
      }
      
      const state = potStates.get(potId)
      if (!state) {
        return NextResponse.json(
          { error: 'Pot not found' },
          { status: 404 }
        )
      }
      
      // Check if pot is expired and has remaining funds
      const now = Date.now()
      const expiryTime = state.createdAt + (43200 * 1000) // 12 hours
      const isExpired = now > expiryTime
      const remainingAmount = Math.max(0, state.totalAmount - (state.claimCount * state.standardClaimAmount))
      
      if (!isExpired) {
        return NextResponse.json(
          { error: 'Pot is not expired yet' },
          { status: 400 }
        )
      }
      
      if (remainingAmount <= 0) {
        return NextResponse.json(
          { error: 'No funds to reclaim' },
          { status: 400 }
        )
      }
      
      // In production, this would call the smart contract's sweep function
      // For now, we'll just mark the pot as reclaimed
      state.isActive = false
      state.totalAmount = state.claimCount * state.standardClaimAmount // Set to claimed amount
      
      console.log(`Reclaimed ${remainingAmount} USDC from pot ${potId} for creator ${creatorAddress}`)
      
      return NextResponse.json({
        success: true,
        potId,
        reclaimedAmount: remainingAmount,
        message: `Successfully reclaimed ${remainingAmount.toFixed(2)} USDC`
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use "initialize" or "status"' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Gate API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const creatorAddress = searchParams.get('creator')
  
  // Get all pot states
  const allStates = Array.from(potStates.entries()).map(([potId, state]) => ({
    potId,
    ...state,
    claimedAmount: state.claimCount * state.standardClaimAmount,
    remainingAmount: Math.max(0, state.totalAmount - (state.claimCount * state.standardClaimAmount)),
    // In production, you'd get creator address from contract or database
    creatorAddress: '0x1234567890123456789012345678901234567890' // Mock creator address
  }))
  
  // Filter by creator if specified
  const filteredStates = creatorAddress 
    ? allStates.filter(p => p.creatorAddress.toLowerCase() === creatorAddress.toLowerCase())
    : allStates
  
  return NextResponse.json({
    pots: filteredStates,
    totalPots: filteredStates.length,
    activePots: filteredStates.filter(p => p.isActive).length,
    completedPots: filteredStates.filter(p => !p.isActive && p.remainingAmount <= 0).length,
    expiredPots: filteredStates.filter(p => !p.isActive && p.remainingAmount > 0).length
  })
}