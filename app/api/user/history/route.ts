import { NextRequest, NextResponse } from 'next/server'
import { jackpotAddress } from '@/lib/contracts'

const alchemyApiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

/**
 * Get transaction history for a specific user
 * Shows all their deposits and claims
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userAddress = searchParams.get('address')

  if (!userAddress) {
    return NextResponse.json(
      { error: 'User address is required' },
      { status: 400 }
    )
  }

  if (!alchemyApiKey) {
    return NextResponse.json(
      { error: 'Alchemy API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Get all USDC sent BY user TO the contract (creating pots)
    const depositsResponse = await fetch(
      `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: userAddress,
            toAddress: jackpotAddress,
            contractAddresses: [USDC_ADDRESS],
            category: ['erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0x3e8'
          }]
        })
      }
    )

    // Get all USDC sent FROM contract TO user (claims)
    const claimsResponse = await fetch(
      `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: jackpotAddress,
            toAddress: userAddress,
            contractAddresses: [USDC_ADDRESS],
            category: ['erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0x3e8'
          }]
        })
      }
    )

    const depositsData = await depositsResponse.json()
    const claimsData = await claimsResponse.json()

    if (depositsData.error || claimsData.error) {
      throw new Error(depositsData.error?.message || claimsData.error?.message || 'Failed to fetch transfers')
    }

    // Transform deposits (pot creations)
    const deposits = (depositsData.result?.transfers || []).map((t: any) => ({
      type: 'pot_created',
      hash: t.hash,
      amount: parseFloat(t.value || '0'),
      blockNum: parseInt(t.blockNum, 16),
      timestamp: t.metadata?.blockTimestamp || null,
      explorerUrl: `https://basescan.org/tx/${t.hash}`
    }))

    // Transform claims (earnings)
    const claims = (claimsData.result?.transfers || []).map((t: any) => ({
      type: 'claim',
      hash: t.hash,
      amount: parseFloat(t.value || '0'),
      blockNum: parseInt(t.blockNum, 16),
      timestamp: t.metadata?.blockTimestamp || null,
      explorerUrl: `https://basescan.org/tx/${t.hash}`
    }))

    // Combine and sort
    const allTransactions = [...deposits, ...claims].sort((a, b) => b.blockNum - a.blockNum)

    // Calculate user stats
    const stats = {
      totalDeposited: deposits.reduce((sum, t) => sum + t.amount, 0),
      totalClaimed: claims.reduce((sum, t) => sum + t.amount, 0),
      potsCreated: deposits.length,
      claimsMade: claims.length,
      netProfit: claims.reduce((sum, t) => sum + t.amount, 0) - deposits.reduce((sum, t) => sum + t.amount, 0)
    }

    return NextResponse.json({
      success: true,
      userAddress,
      transactions: allTransactions,
      stats
    })

  } catch (error) {
    console.error('User history fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch user history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

